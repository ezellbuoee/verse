#!/usr/bin/env bash
# Restores a dump made by backup.sh:  compose/restore.sh /var/backups/verse/verse_2026-11-12_0300.dump
set -euo pipefail
dump="$1"
DB="${VERSE_DB_NAME:-verse}"
USER_NAME="${VERSE_DB_USERNAME:-verse}"
cd "$(dirname "$0")"
compose=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod)
"${compose[@]}" stop server
"${compose[@]}" exec -T postgres pg_restore -U "$USER_NAME" --clean --if-exists -d "$DB" < "$dump"
"${compose[@]}" start server
echo "restored $DB from $dump"
