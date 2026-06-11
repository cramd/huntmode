#!/bin/bash
set -e

SERVER="fileman@192.168.0.62"
REMOTE_DIR="/home/fileman/huntmode"

echo "🔨 Building HuntMode..."
npm run build

echo "📦 Syncing to server..."
rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  "/Users/marc/Resume Tracker/" \
  "$SERVER:$REMOTE_DIR/"

echo "🚀 Installing & restarting on server..."
ssh "$SERVER" "cd $REMOTE_DIR && npm install --omit=dev && npm run build && pm2 restart huntmode 2>/dev/null || pm2 start npm --name huntmode -- start && pm2 save"

echo "✅ Done! https://fuzzynacho.org"
