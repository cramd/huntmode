#!/usr/bin/env bash
# Usage: ./setup-resend.sh <RESEND_API_KEY> [admin_email]
# Writes Resend config to the production server's .env.local and restarts PM2.
set -e

API_KEY="$1"
ADMIN_EMAIL="${2:-marcsherwood@gmail.com}"
SERVER="fileman@192.168.0.62"
REMOTE_ENV="/home/fileman/huntmode/.env.local"

if [[ -z "$API_KEY" ]]; then
  echo "Usage: $0 <RESEND_API_KEY> [admin_email]"
  echo ""
  echo "Get your API key at https://resend.com/api-keys"
  echo "Uses verified domain: noreply@signup.fuzzynacho.org"
  exit 1
fi

echo "Admin alert email: $ADMIN_EMAIL"
echo ""

ssh "$SERVER" "
  sed -i '/^RESEND_API_KEY=/d' $REMOTE_ENV
  sed -i '/^ADMIN_EMAIL=/d' $REMOTE_ENV
  sed -i '/^RESEND_FROM=/d' $REMOTE_ENV
  echo \"RESEND_API_KEY=$API_KEY\" >> $REMOTE_ENV
  echo \"ADMIN_EMAIL=$ADMIN_EMAIL\" >> $REMOTE_ENV
  echo \"RESEND_FROM=HuntMode <noreply@signup.fuzzynacho.org>\" >> $REMOTE_ENV
  echo 'Resend env vars written.'
"

echo "Restarting PM2..."
ssh "$SERVER" "pm2 restart huntmode --update-env && pm2 save"

echo ""
echo "Done. New access requests will email $ADMIN_EMAIL."
echo "Test: have someone request access at https://www.fuzzynacho.org"
