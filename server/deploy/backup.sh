#!/usr/bin/env bash
# Saves the synced vaults (all end-to-end encrypted) into ./backups and
# keeps the last 14 days.
#
# Restore with ./restore.sh <file>.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups

file="linkhaven-$(date +%Y-%m-%d-%H%M).tar.gz"
docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup" \
  --entrypoint tar linkhaven czf "/backup/$file" -C /data .
find backups -name 'linkhaven-*.tar.gz' -mtime +14 -delete
echo "$(date -Is) backups/$file $(du -h "backups/$file" | cut -f1)"
