#!/bin/bash
# Apply huntmode.ca Caddy blocks (run on the server as a user with sudo).
# Usage: bash scripts/apply-huntmode-caddy.sh
set -euo pipefail

SRC="${1:-/tmp/Caddyfile.huntmode.work}"
if [[ ! -f "$SRC" ]]; then
  echo "Missing prepared Caddyfile at $SRC"
  echo "Regenerate by appending huntmode blocks to a copy of /etc/caddy/Caddyfile first."
  exit 1
fi

BAK="/etc/caddy/Caddyfile.bak-huntmode-$(date +%Y%m%d%H%M)"
sudo cp /etc/caddy/Caddyfile "$BAK"
echo "Backed up to $BAK"
sudo cp "$SRC" /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
echo "Caddy reloaded. Smoke test:"
echo "  curl -sI https://huntmode.ca | head -5"
echo "  curl -sI https://www.huntmode.ca | head -5"
