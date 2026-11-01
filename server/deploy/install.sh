#!/usr/bin/env bash
# Sets up Linkhaven on a Linux server (Debian/Ubuntu), or updates the setup:
#
#   curl -fsSL https://raw.githubusercontent.com/SchulzOli/Linkhaven/main/server/deploy/install.sh \
#     | sudo bash -s -- linkhaven.example.com
#
# - installs Docker when it is missing
# - puts the compose file, Caddyfile and scripts into /opt/linkhaven
# - writes /opt/linkhaven/.env on the first run (kept afterwards)
# - starts Linkhaven; Caddy gets the HTTPS certificate, unless ports 80/443
#   already belong to another web server (then: your reverse proxy, see the
#   message at the end)
# - schedules a daily backup and a daily update (/etc/cron.d/linkhaven)
set -euo pipefail

DOMAIN="${1:-}"
DIR="${LINKHAVEN_DIR:-/opt/linkhaven}"
RAW="https://raw.githubusercontent.com/SchulzOli/Linkhaven/main/server"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run as root (sudo)."

if [ -z "$DOMAIN" ] && [ -f "$DIR/.env" ]; then
  DOMAIN="$(sed -n 's/^LINKHAVEN_DOMAIN=//p' "$DIR/.env")"
fi
[ -n "$DOMAIN" ] || fail "Usage: install.sh <domain>, e.g. install.sh linkhaven.example.com"

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || fail "Docker Compose is missing (docker-compose-plugin)."

say "Files in $DIR"
mkdir -p "$DIR/backups"
cd "$DIR"
for file in docker-compose.yml Caddyfile deploy/update.sh deploy/backup.sh deploy/restore.sh; do
  curl -fsSL "$RAW/$file" -o "$(basename "$file")"
done
chmod +x update.sh backup.sh restore.sh

# Ports 80/443 taken by something other than our own Caddy?
own_caddy="$(docker compose ps -q caddy 2>/dev/null || true)"
profile="caddy"
if [ -z "$own_caddy" ] && ss -Hltn '( sport = :80 or sport = :443 )' | grep -q .; then
  profile=""
fi

if [ ! -f .env ]; then
  cat > .env <<ENV
# Linkhaven settings; see https://github.com/SchulzOli/Linkhaven/blob/main/doc/SERVER.md
LINKHAVEN_DOMAIN=$DOMAIN
# Web app, news feed proxy and chart feed besides sync.
SELF_HOSTED=on
# "caddy": Caddy serves HTTPS. Empty: your own reverse proxy forwards to 127.0.0.1:8790.
COMPOSE_PROFILES=$profile
ENV
  chmod 600 .env
fi

port="$(sed -n 's/^LINKHAVEN_PORT=//p' .env)"
port="${port:-8790}"

say "Starting Linkhaven…"
docker compose pull
docker compose up -d --remove-orphans

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS "http://127.0.0.1:$port/health" >/dev/null || fail "Linkhaven doesn't answer; see: docker compose -f $DIR/docker-compose.yml logs linkhaven"

cat > /etc/cron.d/linkhaven <<CRON
# Linkhaven: backup at 03:47, update at 04:17 (server time)
47 3 * * * root $DIR/backup.sh >> /var/log/linkhaven-backup.log 2>&1
17 4 * * * root $DIR/update.sh >> /var/log/linkhaven-update.log 2>&1
CRON

# Where the domain points, compared with this server's address.
server_ip="$(curl -fsS -4 https://api.ipify.org 2>/dev/null || true)"
domain_ip="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}')"

say "Linkhaven runs."
if [ "$(sed -n 's/^COMPOSE_PROFILES=//p' .env)" = "caddy" ]; then
  if [ -n "$server_ip" ] && [ "$domain_ip" != "$server_ip" ]; then
    echo "DNS: $DOMAIN points to '${domain_ip:-nothing}', this server is $server_ip."
    echo "     Add an A record: ${DOMAIN%%.*} → $server_ip, then: cd $DIR && docker compose restart caddy"
  fi
  echo "Open https://$DOMAIN (the certificate can take a minute after DNS is right)."
else
  echo "Ports 80/443 belong to another web server, so Caddy is not started."
  echo "Point your reverse proxy for $DOMAIN at http://127.0.0.1:$port"
  echo "(keep the Host header; allow WebSockets on /feed for live charts)."
fi
echo "Backups: $DIR/backups (daily, 14 days). Updates: daily, or $DIR/update.sh now."
