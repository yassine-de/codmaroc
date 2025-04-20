# Projekt Informationen

## Wichtige Regeln
- Niemals einen Build oder Deploy ohne ausdrückliche Genehmigung starten
- Vor kritischen Operationen immer Bestätigung einholen

## Umgebungen

### PRODUKTION
```
VITE_SUPABASE_URL=https://gyrpgzizmprywzfpcwzr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBneml6bXByeXd6ZnBjd3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NzYyMjMsImV4cCI6MjA2MDQ1MjIyM30.yqvS4z0ANTIPRYQEjKId64kQlijYknU3WdErSEsRfIU
```

### ENTWICKLUNG
```
VITE_SUPABASE_URL=https://sricbznbrczupdvasemq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaWNiem5icmN6dXBkdmFzZW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Nzc2NjQsImV4cCI6MjA2MDU1MzY2NH0.cu-p-mOcmWFXfencvNBwH88UeULnJGDODVWTNTFCr38
```

## Deployment URLs
- Hauptwebsite: https://codservice.org
- Netlify Dashboard: https://app.netlify.com/sites/charming-babka-d2191f/
- Netlify Site ID: e0811461-e020-4135-bffa-94cd5e5578d5

## Build & Deploy Prozess
1. Umgebung in `.env` prüfen/anpassen
   - Produktions-Umgebungsvariablen aktivieren
   - Entwicklungs-Umgebungsvariablen auskommentieren

2. Build durchführen
   ```bash
   npm run build
   ```

3. Netlify CLI installieren (falls noch nicht geschehen)
   ```bash
   npm install -g netlify-cli
   ```

4. Deploy durchführen
   ```bash
   netlify deploy --prod --site=e0811461-e020-4135-bffa-94cd5e5578d5
   ```

5. Nach dem Deploy überprüfen:
   - Build-Logs: https://app.netlify.com/sites/charming-babka-d2191f/deploys
   - Funktion-Logs: https://app.netlify.com/sites/charming-babka-d2191f/logs/functions
   - Edge-Funktion-Logs: https://app.netlify.com/sites/charming-babka-d2191f/logs/edge-functions

6. Git Version pushen
   ```bash
   # Änderungen stagen
   git add .

   # Commit mit Version erstellen
   git commit -m "v1.x.x - Deployment [DATUM]"

   # Auf main branch pushen
   git push origin main
   ```

## Datenbank-Schema
[Hier können wir wichtige Informationen über das Datenbankschema hinzufügen]

## Bekannte Probleme & Lösungen
[Hier können wir bekannte Probleme und deren Lösungen dokumentieren] 