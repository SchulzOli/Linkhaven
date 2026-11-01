#!/usr/bin/env bash
# Pulls the newest Linkhaven image and restarts it when it changed.
# Pin a version with LINKHAVEN_VERSION=sha-<commit> in .env; roll back the
# same way.
set -euo pipefail
cd "$(dirname "$0")"

docker compose pull --quiet
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
echo "$(date -Is) $(docker compose images --format '{{.Repository}}:{{.Tag}} {{.ID}}' linkhaven 2>/dev/null || true)"
