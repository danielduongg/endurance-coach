#!/usr/bin/env bash
# Manage the Strava webhook subscription (one per API application).
# Usage:
#   export STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=... STRAVA_VERIFY_TOKEN=... SUPABASE_URL=https://<ref>.supabase.co
#   ./register-webhook.sh create | view | delete <subscription_id>
set -euo pipefail

API="https://www.strava.com/api/v3/push_subscriptions"
CALLBACK="${SUPABASE_URL}/functions/v1/strava-webhook"

case "${1:-}" in
  create)
    echo "Creating subscription → ${CALLBACK}"
    # Strava immediately GETs the callback with hub.challenge; the function must
    # already be deployed (with verify_jwt=false) for this to succeed.
    curl -sS -X POST "$API" \
      -F client_id="$STRAVA_CLIENT_ID" \
      -F client_secret="$STRAVA_CLIENT_SECRET" \
      -F callback_url="$CALLBACK" \
      -F verify_token="$STRAVA_VERIFY_TOKEN"
    echo
    ;;
  view)
    curl -sS "$API?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"
    echo
    ;;
  delete)
    [ -z "${2:-}" ] && { echo "usage: $0 delete <subscription_id>"; exit 1; }
    curl -sS -X DELETE "$API/$2?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"
    echo "deleted $2"
    ;;
  *)
    echo "usage: $0 create | view | delete <subscription_id>"
    exit 1
    ;;
esac
