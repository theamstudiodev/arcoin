#!/usr/bin/env bash
# Builds a throwaway database from the migrations + seed, runs the access test suite, drops it.
#
#   ./scripts/test-db.sh                                   # local Supabase (supabase start)
#   ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres ./scripts/test-db.sh   # any Postgres
#
# Against plain Postgres it first loads a small stand-in for Supabase's auth schema.
set -euo pipefail
cd "$(dirname "$0")/.."

ADMIN_URL="${ADMIN_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

# This script creates a database and drops it again, so it must never be pointed at a shared one. Take the
# host out of the URL: drop the scheme, then everything up to the last @ (a password may contain one), then
# stop at the port, path or query.
host="${ADMIN_URL#*://}"
host="${host##*@}"
host="${host%%[:/?]*}"
case "$host" in
  127.0.0.1 | localhost | ::1 | '[::1]') ;;
  *)
    echo "Refusing to run: test-db.sh creates and drops a database, so it runs only against a local" >&2
    echo "Postgres. ADMIN_URL points at '${host:-an address it could not read}'." >&2
    exit 1
    ;;
esac

DB="studesk_test_$$"
# swap the database name in the URL, keeping any ?query parameters
base="${ADMIN_URL%%\?*}"; query="${ADMIN_URL#"$base"}"
TEST_URL="${base%/*}/$DB$query"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

cleanup() { "${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

"${PSQL[@]}" "$ADMIN_URL" -c "create database $DB" >/dev/null

if [ "$("${PSQL[@]}" -At "$TEST_URL" -c "select count(*) from information_schema.tables where table_schema='auth' and table_name='users'")" = "0" ]; then
  echo "· plain Postgres detected — loading the Supabase auth stand-in"
  "${PSQL[@]}" "$TEST_URL" -f supabase/tests/stub/supabase_stub.sql >/dev/null
fi

for f in supabase/migrations/*.sql; do
  echo "· migrate  $(basename "$f")"
  "${PSQL[@]}" "$TEST_URL" -f "$f" >/dev/null
done
echo "· seed"
"${PSQL[@]}" "$TEST_URL" -f supabase/seed.sql >/dev/null

echo "· access tests"
"${PSQL[@]}" "$TEST_URL" -f supabase/tests/access_test.sql 2>&1 | sed -E 's/^psql:[^:]*:[0-9]+: //; s/^NOTICE:  //'
