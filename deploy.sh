#!/bin/bash
set -e

SERVER="fileman@192.168.0.62"
REMOTE_DIR="/home/fileman/huntmode"

echo "🔨 Building HuntMode locally on Mac..."
npm run build

echo "📦 Syncing build and source files to server..."
rsync -avz --progress \
  --exclude node_modules \
  --exclude .git \
  --exclude .env.local \
  --exclude .next/cache \
  --exclude .next/dev \
  "/Users/marc/Resume Tracker/" \
  "$SERVER:$REMOTE_DIR/"

echo "🚀 Installing dependencies and restarting PM2 on server..."
ssh "$SERVER" "cd $REMOTE_DIR && npm install --omit=dev && pm2 restart huntmode --update-env 2>/dev/null || pm2 start npm --name huntmode -- start && pm2 save"

echo "✅ Done! https://fuzzynacho.org"
