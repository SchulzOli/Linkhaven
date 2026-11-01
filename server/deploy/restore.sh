#!/usr/bin/env bash
# Puts a backup from ./backups back:  ./restore.sh linkhaven-2026-11-01-0347.tar.gz
# The current data is replaced (take a backup first if you want to keep it).
set -euo pipefail
cd "$(dirname "$0")"

file="${1:-}"
if [ -z "$file" ] || [ ! -f "backups/$file" ]; then
  echo "Usage: restore.sh <file in ./backups>" >&2
  ls backups >&2 || true
  exit 1
fi

container="$(docker compose ps -a -q linkhaven)"
volume=""
if [ -n "$container" ]; then
  volume="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$container")"
fi

docker compose rm --stop --force linkhaven
if [ -n "$volume" ]; then
  docker volume rm "$volume" >/dev/null
fi

# A fresh volume, filled from the backup.
docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup:ro" \
  --entrypoint tar linkhaven xzf "/backup/$file" -C /data
docker compose run --rm --no-deps --user root \
  --entrypoint chown linkhaven -R node:node /data
docker compose up -d
echo "Restored backups/$file"
