#!/usr/bin/env bash
# Nightly backup of the Verse database (cron: 0 3 * * * /path/to/verse/compose/backup.sh). Keeps 14 days.
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/verse}"
DB="${VERSE_DB_NAME:-verse}"
USER_NAME="${VERSE_DB_USERNAME:-verse}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$USER_NAME" -Fc "$DB" > "$BACKUP_DIR/${DB}_${STAMP}.dump"
find "$BACKUP_DIR" -name "*.dump" -mtime +14 -delete
echo "$(date +%Y-%m-%dT%H:%M:%S) backup ok: $BACKUP_DIR/${DB}_${STAMP}.dump"
