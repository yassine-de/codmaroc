#!/bin/bash

# Verzeichnis wechseln
cd "$(dirname "$0")/.."

# Umgebungsvariablen setzen
export VITE_SUPABASE_URL="https://sricbznbrczupdvasemq.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaWNiem5icmN6dXBkdmFzZW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Nzc2NjQsImV4cCI6MjA2MDU1MzY2NH0.cu-p-mOcmWFXfencvNBwH88UeULnJGDODVWTNTFCr38"

# Log-Datei
LOG_FILE="sync-orders.log"

# Zeitstempel
echo "$(date): Starting sync..." >> "$LOG_FILE"

# Node.js Script ausführen
node scripts/sync-orders.cjs >> "$LOG_FILE" 2>&1

# Prüfen ob der Befehl erfolgreich war
if [ $? -eq 0 ]; then
    echo "$(date): Sync completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Sync failed" >> "$LOG_FILE"
fi

# Alte Log-Einträge löschen (älter als 7 Tage)
find "$LOG_FILE" -type f -mtime +7 -delete 