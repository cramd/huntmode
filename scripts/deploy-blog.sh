#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER="fileman@192.168.0.62"
REMOTE_DIR="/home/fileman/huntmode"

cd "$REPO_ROOT"

echo "🔨 Building blog..."
npm run blog:build

echo "📦 Syncing blog output to server..."
rsync -avz --progress \
  "$REPO_ROOT/public/blog/" \
  "$SERVER:$REMOTE_DIR/public/blog/"

echo "📦 Syncing blog source content..."
rsync -avz --progress \
  "$REPO_ROOT/blog/src/content/blog/" \
  "$SERVER:$REMOTE_DIR/blog/src/content/blog/"

echo "📦 Syncing blog images..."
rsync -avz --progress \
  "$REPO_ROOT/blog/public/images/" \
  "$SERVER:$REMOTE_DIR/blog/public/images/"

echo "🚀 Restarting PM2 (huntmode)..."
ssh "$SERVER" "cd $REMOTE_DIR && pm2 restart huntmode --update-env 2>/dev/null || pm2 start npm --name huntmode -- start && pm2 save"

echo "✅ Blog deployed! https://www.huntmode.ca/blog/"
