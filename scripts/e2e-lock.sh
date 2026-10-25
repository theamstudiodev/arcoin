#!/usr/bin/env bash
# Runs a Playwright spec while holding a lock, so several agents can work at once.
#
# The browser suite shares one local database and one Mailpit inbox, runs with `workers: 1`, and its
# global setup deletes every `E2E %` row before it starts. Two runs at the same time therefore delete
# each other's rows mid-test and read each other's emails. This serialises the runs instead of
# serialising the people writing them.
#
# Usage: ./scripts/e2e-lock.sh <spec-name-or-pattern> [extra playwright args...]
set -euo pipefail

LOCK="${TMPDIR:-/tmp}/arcoin-e2e.lock"
WAITED=0
LIMIT=1800 # half an hour: long enough for a queue of agents, short enough to notice a stuck lock

while ! mkdir "$LOCK" 2>/dev/null; do
  if [ "$WAITED" -ge "$LIMIT" ]; then
    echo "e2e lock held for ${LIMIT}s by PID $(cat "$LOCK/pid" 2>/dev/null || echo unknown)." >&2
    echo "If nothing is running, remove it: rm -rf '$LOCK'" >&2
    exit 1
  fi
  [ "$WAITED" = 0 ] && echo "another suite is running; waiting for the lock…" >&2
  sleep 5
  WAITED=$((WAITED + 5))
done
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

cd "$(dirname "$0")/../apps/web"
exec npx playwright test "$@"
