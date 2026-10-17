#!/usr/bin/env bash
# Studesk nightly backup — dumps the data and copies it to Google Drive (or a local folder).
#
#   SUPABASE_DB_URL=…  BACKUP_DEST=gdrive:Studesk/backups  ./scripts/backup.sh
#
# SUPABASE_DB_URL  the Session pooler connection string (Supabase → Connect → Session pooler)
# BACKUP_DEST      an rclone remote path (contains ':'), or a local directory. Default gdrive:Studesk/backups
#
# Keeps 30 days of dailies, and the backup taken on the 1st of each month forever.
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the Session pooler connection string}"
DEST="${BACKUP_DEST:-gdrive:Studesk/backups}"
STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

echo "· dumping studio data"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges \
  --schema=public --schema=app --file="$WORK/studesk-$STAMP.dump"
echo "· dumping sign-in accounts (auth.users)"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --data-only \
  --table=auth.users --file="$WORK/studesk-$STAMP.auth-users.dump"

# A dump that cannot be listed is not a backup
pg_restore --list "$WORK/studesk-$STAMP.dump" >/dev/null
pg_restore --list "$WORK/studesk-$STAMP.auth-users.dump" >/dev/null

monthly=false; [ "$(date -u +%d)" = "01" ] && monthly=true

if [[ "$DEST" == *:* ]]; then
  rclone copy "$WORK" "$DEST/daily"
  $monthly && rclone copy "$WORK" "$DEST/monthly"
  rclone delete "$DEST/daily" --min-age 30d
else
  mkdir -p "$DEST/daily"; cp "$WORK"/* "$DEST/daily/"
  $monthly && { mkdir -p "$DEST/monthly"; cp "$WORK"/* "$DEST/monthly/"; }
  find "$DEST/daily" -type f -mtime +30 -delete
fi
echo "✓ backup $STAMP → $DEST ($(du -ch "$WORK"/*.dump | tail -1 | cut -f1))"
