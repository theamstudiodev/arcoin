#!/usr/bin/env bash
# Restore a Studesk backup into a database that already has the schema.
#
#   TARGET_DB_URL=…  ./scripts/restore.sh  path/to/studesk-<stamp>.dump  --confirm
#
# The target must be prepared first, so the schema, triggers and policies come from the
# migrations (the single source of truth), and only DATA comes from the backup:
#   1. a fresh Supabase project (or `supabase db reset` locally, without seed)
#   2. `supabase db push` to apply the migrations
#   3. this script
#
# It loads sign-in accounts first, then studio data, with triggers and foreign-key checks
# paused for the load (session_replication_role = replica), so nothing is re-audited or re-linked.
set -euo pipefail
DUMP="${1:?Usage: restore.sh <studesk-…dump> --confirm}"
[ "${2:-}" = "--confirm" ] || { echo "Refusing to run without --confirm. This writes into ${TARGET_DB_URL:-the target}."; exit 1; }
: "${TARGET_DB_URL:?Set TARGET_DB_URL to the database you are restoring INTO}"
AUTH_DUMP="${DUMP%.dump}.auth-users.dump"
[ -f "$AUTH_DUMP" ] || { echo "Missing $AUTH_DUMP (sign-in accounts) next to the data dump"; exit 1; }

existing="$(psql "$TARGET_DB_URL" -AtX -c "select count(*) from public.projects")"
[ "$existing" = "0" ] || { echo "Target already has $existing projects. Restore only into an empty, migrated database."; exit 1; }

load() {
  { echo "set session_replication_role = replica;"; pg_restore --data-only --no-owner --no-privileges -f - "$@"; } \
    | psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -q -X -o /dev/null
}
echo "· restoring sign-in accounts"; load "$AUTH_DUMP"
echo "· restoring studio data";      load "$DUMP"
psql "$TARGET_DB_URL" -AtX -c "select '✓ restored: ' || (select count(*) from public.projects) || ' projects, ' || (select count(*) from public.tasks) || ' tasks, ' || (select count(*) from public.people) || ' people'"
