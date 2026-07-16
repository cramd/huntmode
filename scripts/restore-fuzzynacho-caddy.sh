#!/bin/bash
# Restore www.fuzzynacho.org Caddy block so /blog* serves the old FuzzyNacho static blog.
set -euo pipefail

CADDYFILE="/etc/caddy/Caddyfile"
BAK="/etc/caddy/Caddyfile.bak-fuzzynacho-restore-$(date +%Y%m%d%H%M)"

sudo cp "$CADDYFILE" "$BAK"
echo "Backed up current config to $BAK"

sudo python3 - <<'PY'
from pathlib import Path

path = Path("/etc/caddy/Caddyfile")
text = path.read_text()

old = """www.fuzzynacho.org {
    handle /dementia.html {
        root * /var/www/fuzzynacho.org
        file_server
    }
    reverse_proxy localhost:3000
}"""

new = """www.fuzzynacho.org {
    handle /blog* {
        root * /var/www
        file_server
    }
    handle /dementia.html {
        root * /var/www/fuzzynacho.org
        file_server
    }
    reverse_proxy localhost:3000
}"""

if old not in text:
    raise SystemExit("Current www.fuzzynacho.org block not found (already restored?)")

path.write_text(text.replace(old, new, 1))
print("Restored /blog* → /var/www (old FuzzyNacho blog)")
PY

sudo caddy validate --config "$CADDYFILE"
sudo systemctl reload caddy
echo "Done. Smoke tests:"
curl -sI https://www.fuzzynacho.org/blog/ | head -4
curl -s https://www.fuzzynacho.org/blog/ | grep -o '<title>[^<]*</title>' | head -1
