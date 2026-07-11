#!/usr/bin/env bash
# Usage: ./setup-admin-creds.sh /path/to/serviceAccountKey.json
# Reads your Firebase service account JSON and writes the two required
# env vars to the production server's .env.local, then restarts PM2.
set -e

KEY_FILE="$1"
SERVER="fileman@192.168.0.62"
REMOTE_ENV="/home/fileman/huntmode/.env.local"

if [[ -z "$KEY_FILE" || ! -f "$KEY_FILE" ]]; then
  echo "Usage: $0 /path/to/serviceAccountKey.json"
  exit 1
fi

CLIENT_EMAIL=$(python3 -c "import json,sys; d=json.load(open('$KEY_FILE')); print(d['client_email'])")
PRIVATE_KEY=$(python3 -c "import json,sys; d=json.load(open('$KEY_FILE')); print(d['private_key'].replace('\n','\\\\n'))")

echo "Service account: $CLIENT_EMAIL"
echo "Private key length: ${#PRIVATE_KEY} chars"
echo ""

TMP_ENV=$(mktemp)
trap 'rm -f "$TMP_ENV"' EXIT

{
  echo "FIREBASE_ADMIN_CLIENT_EMAIL=$CLIENT_EMAIL"
  printf 'FIREBASE_ADMIN_PRIVATE_KEY="%s"\n' "$PRIVATE_KEY"
} > "$TMP_ENV"

ssh "$SERVER" "
  sed -i '/^FIREBASE_ADMIN_CLIENT_EMAIL=/d' $REMOTE_ENV
  sed -i '/^FIREBASE_ADMIN_PRIVATE_KEY=/d' $REMOTE_ENV
"
scp "$TMP_ENV" "$SERVER:/tmp/huntmode-admin-creds.env"
ssh "$SERVER" "cat /tmp/huntmode-admin-creds.env >> $REMOTE_ENV && rm /tmp/huntmode-admin-creds.env && echo 'Env vars written.'"

echo "Restarting PM2..."
ssh "$SERVER" "pm2 restart huntmode --update-env && pm2 save"

echo ""
echo "Done. Firebase Admin credentials are live on the server."
echo "Try Analyze Fit on any application at https://www.fuzzynacho.org"
