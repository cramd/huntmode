#!/usr/bin/env bash
# Usage: ./setup-posthog.sh <POSTHOG_PROJECT_TOKEN>
# Writes PostHog client config to local and production .env.local, then restarts PM2.
set -e

TOKEN="$1"
HOST="${2:-https://us.i.posthog.com}"
SERVER="fileman@192.168.0.62"
REMOTE_ENV="/home/fileman/huntmode/.env.local"
LOCAL_ENV=".env.local"

if [[ -z "$TOKEN" ]]; then
  echo "Usage: $0 <POSTHOG_PROJECT_TOKEN> [host]"
  echo ""
  echo "Get your project token at https://us.posthog.com/project/settings"
  exit 1
fi

update_env_file() {
  local file="$1"
  touch "$file"
  sed -i.bak '/^NEXT_PUBLIC_POSTHOG_KEY=/d' "$file"
  sed -i.bak '/^NEXT_PUBLIC_POSTHOG_HOST=/d' "$file"
  rm -f "${file}.bak"
  echo "NEXT_PUBLIC_POSTHOG_KEY=$TOKEN" >> "$file"
  echo "NEXT_PUBLIC_POSTHOG_HOST=$HOST" >> "$file"
}

echo "Setting PostHog env locally..."
update_env_file "$LOCAL_ENV"

echo "Setting PostHog env on server..."
ssh "$SERVER" "
  touch $REMOTE_ENV
  sed -i '/^NEXT_PUBLIC_POSTHOG_KEY=/d' $REMOTE_ENV
  sed -i '/^NEXT_PUBLIC_POSTHOG_HOST=/d' $REMOTE_ENV
  echo \"NEXT_PUBLIC_POSTHOG_KEY=$TOKEN\" >> $REMOTE_ENV
  echo \"NEXT_PUBLIC_POSTHOG_HOST=$HOST\" >> $REMOTE_ENV
"

echo "Restarting PM2..."
ssh "$SERVER" "pm2 restart huntmode --update-env && pm2 save"

echo ""
echo "Done. PostHog is configured for HuntMode."
