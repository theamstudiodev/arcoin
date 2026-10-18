#!/usr/bin/env bash
# Proves the database scripts refuse to touch anything but a local, empty database.
#
#   ./scripts/test-guards.sh
#
# Needs no database and writes nothing. Every case below asserts a refusal, because a refusal that
# quietly stopped working is how a test suite ends up dropping a database somebody was using.
set -uo pipefail
cd "$(dirname "$0")/.."

pass=0
fail=0

# refuses <description> <expected text> -- <command...>
refuses() {
  local what="$1" want="$2"
  shift 3 # description, expected, --
  local out code
  out="$("$@" 2>&1)"
  code=$?
  if [ "$code" -eq 0 ]; then
    printf '✗ %s\n    exited 0 — it should have refused\n' "$what"
    fail=$((fail + 1))
    return
  fi
  case "$out" in
    *"$want"*)
      printf '✓ %s\n' "$what"
      pass=$((pass + 1))
      ;;
    *)
      printf '✗ %s\n    refused, but never said %s. It said:\n%s\n' "$what" "\"$want\"" "$out"
      fail=$((fail + 1))
      ;;
  esac
}

LOCAL_ONLY='runs only against a local'

refuses "test-db.sh refuses a hosted Supabase database" "$LOCAL_ONLY" -- \
  env ADMIN_URL='postgresql://postgres:pw@db.notarealprojectref.supabase.co:5432/postgres' ./scripts/test-db.sh

refuses "test-db.sh refuses a connection pooler" "$LOCAL_ONLY" -- \
  env ADMIN_URL='postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' ./scripts/test-db.sh

# A password containing @ must not make the host look local.
refuses "test-db.sh reads the host past an @ in the password" "$LOCAL_ONLY" -- \
  env ADMIN_URL='postgresql://user:p@ssword@db.example.com:5432/postgres' ./scripts/test-db.sh

refuses "test-db.sh refuses a host it cannot read" "$LOCAL_ONLY" -- \
  env ADMIN_URL='not-a-url' ./scripts/test-db.sh

refuses "restore.sh refuses without --confirm" 'Refusing to run without --confirm' -- \
  ./scripts/restore.sh /nonexistent/studesk.dump

refuses "restore.sh refuses without a target database" 'Set TARGET_DB_URL' -- \
  env -u TARGET_DB_URL ./scripts/restore.sh /nonexistent/studesk.dump --confirm

refuses "backup.sh refuses without a source database" 'Set SUPABASE_DB_URL' -- \
  env -u SUPABASE_DB_URL ./scripts/backup.sh

# The guard must let a local address through. Port 1 has nothing listening, so this gets past the guard and
# fails on the connection instead — which is the proof. The real local run is ./scripts/test-db.sh itself.
out="$(env ADMIN_URL='postgresql://postgres:postgres@127.0.0.1:1/postgres' ./scripts/test-db.sh 2>&1)"
case "$out" in
  *"$LOCAL_ONLY"*)
    printf '✗ test-db.sh lets a local address through\n    it refused 127.0.0.1, which would break CI\n'
    fail=$((fail + 1))
    ;;
  *)
    printf '✓ test-db.sh lets a local address through\n'
    pass=$((pass + 1))
    ;;
esac

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
echo "— all guards hold"
