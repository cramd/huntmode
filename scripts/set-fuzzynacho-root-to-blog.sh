#!/bin/bash
# Serve FuzzyNacho blog at www.fuzzynacho.org/ (URL stays at root).
# Uses internal rewrite to /blog/index.html; /blog/* still serves assets and posts.
set -euo pipefail

CADDYFILE="/etc/caddy/Caddyfile"
BAK="/etc/caddy/Caddyfile.bak-fuzzy-root-rewrite-$(date +%Y%m%d%H%M)"

sudo cp "$CADDYFILE" "$BAK"
echo "Backed up to $BAK"

sudo python3 - <<'PY'
from pathlib import Path

path = Path("/etc/caddy/Caddyfile")
text = path.read_text()

# Remove old redirect if present
text = text.replace("    redir / /blog/ 308\n", "")

rewrite_block = """    @root path /
    rewrite @root /blog/index.html
"""

if "@root path /" in text and "rewrite @root /blog/index.html" in text:
    print("Root rewrite already present — no change needed")
else:
    marker = "www.fuzzynacho.org {"
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit("www.fuzzynacho.org block not found in Caddyfile")

    insert_at = idx + len(marker)
    text = text[:insert_at] + "\n" + rewrite_block + text[insert_at:]
    path.write_text(text)
    print("Added rewrite / → /blog/index.html (URL stays at root)")

PY

sudo caddy validate --config "$CADDYFILE"
sudo systemctl reload caddy
echo "Caddy reloaded."

echo ""
echo "Smoke tests:"
echo "  fuzzynacho root (should be 200, not 308):"
curl -sI https://www.fuzzynacho.org/ | head -5
echo ""
echo "  fuzzynacho root title:"
curl -s https://www.fuzzynacho.org/ | grep -o '<title>[^<]*</title>' | head -1
echo ""
echo "  fuzzynacho /blog/ still works:"
curl -s https://www.fuzzynacho.org/blog/ | grep -o '<title>[^<]*</title>' | head -1
echo ""
echo "  huntmode root:"
curl -s https://www.huntmode.ca/ | grep -o '<title>[^<]*</title>' | head -1
