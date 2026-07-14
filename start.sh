#!/bin/bash

ENV_FILE=".env"
TXT_FILE="start.txt"

if [ ! -f "$TXT_FILE" ]; then
    echo "Errore: $TXT_FILE non trovato"
    exit 1
fi


echo "Leggo dati Garmin..."


# URL Garmin
URL=$(grep '^https://livetrack.garmin.com/api/sessions/' "$TXT_FILE" | head -1)

SESSION_ID=$(echo "$URL" | grep -oP 'sessions/\K[^/]+')

TOKEN=$(echo "$URL" | grep -oP 'token=\K[^&]+')


# Referer
REFERER=$(awk '/^referer\r?$/ {
    getline
    sub(/\r$/, "")
    print
    exit
}' "$TXT_FILE")


# Cookie completo
COOKIE=$(awk '/^cookie\r?$/ {
    getline
    sub(/\r$/, "")
    printf "%s", $0
    exit
}' "$TXT_FILE")


# Header CSRF
CSRF_TOKEN=$(awk '/^livetrack-csrf-token\r?$/ {
    getline
    sub(/\r$/, "")
    print
    exit
}' "$TXT_FILE")


echo ""
echo "Session ID: $SESSION_ID"
echo "Token: $TOKEN"
echo "CSRF: $CSRF_TOKEN"
echo "Cookie lunghezza: ${#COOKIE}"


echo ""
echo "Aggiorno .env..."


# Aggiorna dati Garmin

sed -i "s|^GARMIN_SESSION_ID=.*|GARMIN_SESSION_ID=$SESSION_ID|" "$ENV_FILE"

sed -i "s|^GARMIN_TOKEN=.*|GARMIN_TOKEN=$TOKEN|" "$ENV_FILE"

sed -i "s|^GARMIN_CSRF_TOKEN=.*|GARMIN_CSRF_TOKEN=$CSRF_TOKEN|" "$ENV_FILE"

sed -i "s|^GARMIN_REFERER=.*|GARMIN_REFERER=$REFERER|" "$ENV_FILE"


# Rimuove vecchio cookie
sed -i '/^LIVETRACK_SESSION=/d' "$ENV_FILE"


# Inserisce cookie completo
echo "LIVETRACK_SESSION=$COOKIE" >> "$ENV_FILE"


# Aggiorna URL Garmin
NEW_URL="https://livetrack.garmin.com/api/sessions/$SESSION_ID/track-points/common?token=$TOKEN"

sed -i "s|^GARMIN_LIVETRACK_URL=.*|GARMIN_LIVETRACK_URL=$NEW_URL|" "$ENV_FILE"


echo ""
echo "✅ .env aggiornato!"

echo ""
echo "Avvio server..."


exec node server.js