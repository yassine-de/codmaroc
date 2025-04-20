# Datenbank-Änderungen

Diese Datei dokumentiert alle Änderungen, die in der Entwicklungsumgebung an der Datenbank vorgenommen werden. Diese Änderungen müssen später auf die Produktionsdatenbank übertragen werden.

## Format
Jeder Eintrag sollte folgende Informationen enthalten:
- Datum und Uhrzeit der Änderung
- Beschreibung der Änderung
- SQL-Befehle oder Migrationsschritte
- Betroffene Tabellen
- Detaillierter Kommentar zur Änderung
- Grund für die Änderung
- Wer die Änderung durchgeführt hat

## Änderungen

### [Datum: 2024-04-10 17:45:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Anpassung der vite.config.ts
- **Betroffene Dateien:** `vite.config.ts`
- **Änderungen:**
  - Import von loadEnv aus Vite
  - Anpassung der defineConfig-Funktion, um Umgebungsvariablen zu laden
  - Hinzufügen der define-Option für process.env
- **Kommentar:** 
  - Was wurde geändert? Die vite.config.ts wurde angepasst, um Umgebungsvariablen korrekt zu laden
  - Warum wurde es geändert? Um sicherzustellen, dass die Umgebungsvariablen in der Anwendung verfügbar sind
  - Welche Auswirkungen hat die Änderung? Die Anwendung kann nun auf die Umgebungsvariablen zugreifen
- **Grund:** Korrekte Konfiguration der Umgebungsvariablen

### [Datum: 2024-04-10 17:30:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Bereinigung der Umgebungsdateien
- **Betroffene Dateien:** `.env`, `.env.production`, `.env.development`
- **Änderungen:**
  - Entfernung der separaten Umgebungsdateien
  - Bereinigung der `.env` Datei
- **Kommentar:** 
  - Was wurde geändert? Die separaten Umgebungsdateien wurden entfernt und die `.env` Datei wurde bereinigt
  - Warum wurde es geändert? Um Verwirrung zu vermeiden und die Konfiguration zu vereinfachen
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun ausschließlich die Produktionsdatenbank
- **Grund:** Vereinfachung der Konfiguration und Vermeidung von Verwirrung

### [Datum: 2024-04-10 17:15:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Aktualisierung des Supabase Anon Keys
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Aktualisierung des VITE_SUPABASE_ANON_KEY mit dem Wert aus Netlify
- **Kommentar:** 
  - Was wurde geändert? Der Supabase Anon Key wurde mit dem korrekten Wert aus Netlify aktualisiert
  - Warum wurde es geändert? Um die korrekte Authentifizierung mit der Produktionsdatenbank sicherzustellen
  - Welche Auswirkungen hat die Änderung? Die Anwendung kann nun korrekt mit der Produktionsdatenbank kommunizieren
- **Grund:** Synchronisation der Konfiguration mit Netlify

### [Datum: 2024-04-10 17:00:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Korrektur der Datenbankverbindung
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Kommentierung der Entwicklungsdatenbank-URL
  - Kommentierung der Prisma-Datenbank-URL
- **Kommentar:** 
  - Was wurde geändert? Die Entwicklungsdatenbank-URL und die Prisma-Datenbank-URL wurden kommentiert
  - Warum wurde es geändert? Um sicherzustellen, dass nur die Produktionsdatenbank verwendet wird
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun ausschließlich die Produktionsdatenbank
- **Grund:** Sicherstellung der korrekten Datenbankverbindung

### [Datum: 2024-04-10 16:45:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Aktualisierung der Produktionsdatenbank-URL
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Aktualisierung der DATABASE_URL mit der korrekten Produktionsdatenbank-URL
- **Kommentar:** 
  - Was wurde geändert? Die Produktionsdatenbank-URL wurde aktualisiert
  - Warum wurde es geändert? Um die korrekte Verbindung zur Produktionsdatenbank herzustellen
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun die richtige Produktionsdatenbank
- **Grund:** Sicherstellung der korrekten Datenbankverbindung

### [Datum: 2024-04-10 16:30:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Deaktivierung von Prisma
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Kommentierung der DATABASE_URL
  - Entfernung der Prisma-Verbindung
- **Kommentar:** 
  - Was wurde geändert? Prisma wurde deaktiviert, um Konflikte mit der Supabase-Verbindung zu vermeiden
  - Warum wurde es geändert? Um sicherzustellen, dass nur Supabase für Datenbankoperationen verwendet wird
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun ausschließlich Supabase für Datenbankoperationen
- **Grund:** Vermeidung von Datenbankkonflikten und Vereinfachung der Datenbankverbindung

### [Datum: 2024-04-10 16:15:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Wechsel zur Entwicklungsumgebung
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Deaktivierung der Produktionsverbindung
  - Aktivierung der Entwicklungsverbindung
- **Kommentar:** 
  - Was wurde geändert? Die Datenbankverbindung wurde von Produktion auf Entwicklung umgestellt
  - Warum wurde es geändert? Um sicherzustellen, dass alle Entwicklungsarbeiten in einer separaten Umgebung stattfinden
  - Welche Auswirkungen hat die Änderung? Alle Datenbankoperationen werden nun in der Entwicklungsdatenbank ausgeführt
  - Gibt es besondere Hinweise zur Implementierung? Die Änderung muss später rückgängig gemacht werden, wenn wir zurück zur Produktionsdatenbank wechseln
- **Grund:** Trennung von Entwicklungs- und Produktionsumgebung für sicheres Testen und Entwickeln

### 2024-04-10 15:45:00
- **Beschreibung**: Wechsel von Entwicklungs- zur Produktionsdatenbank
- **Betroffene Dateien**: .env
- **Kommentar**: Die Anwendung wurde von der Entwicklungsdatenbank (vsbrxzvufkqozprupfow.supabase.co) auf die Produktionsdatenbank (oiofukxqadsgxrpvzezc.supabase.co) umgestellt. Alle Datenbankoperationen werden nun in der Produktionsumgebung ausgeführt.
- **Grund**: Bereitstellung der Anwendung für den Produktivbetrieb
- **Durchgeführt von**: Claude

### 2024-04-10 15:30:00
- **Beschreibung**: Hinzufügen des date_reference Feldes zur Orders Tabelle
- **SQL-Befehle**:
```sql
ALTER TABLE orders
ADD COLUMN date_reference TIMESTAMP WITH TIME ZONE;
```
- **Betroffene Tabellen**: orders
- **Kommentar**: Das neue Feld date_reference speichert das Datum, an dem der Order im Google Sheet erstellt wurde. Dieses Feld wird beim Import aus Google Sheets automatisch gefüllt.
- **Grund**: Verbesserung der Datenverfolgung und Synchronisation mit Google Sheets
- **Durchgeführt von**: Claude

### [Datum: 2025-04-18 14:30:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Wechsel von PROD zu ENTW Datenbank und Backup der PROD-Version
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Deaktivierung der PROD-Datenbank (gyrpgzizmprywzfpcwzr.supabase.co)
  - Aktivierung der ENTW-Datenbank (sricbznbrczupdvasemq.supabase.co)
  - Erstellung eines Git-Tags für die PROD-Version
- **Kommentar:** 
  - Was wurde geändert? Die Datenbankverbindung wurde von PROD auf ENTW umgestellt
  - Warum wurde es geändert? Um in der Entwicklungsumgebung zu arbeiten
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun die ENTW-Datenbank
  - Backup: Tag v1.0.0-prod-db-backup-2025-04-18 erstellt für spätere Wiederherstellung
- **Grund:** Entwicklung in sicherer Umgebung

### [Datum: 2025-04-20 09:00:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Deployment v1.0.0 mit wichtigen Funktionsupdates
- **Betroffene Dateien:** 
  - `src/views/Orders.vue`
  - `src/lib/supabase.ts`
  - `src/stores/orders.ts`
  - `ProjectInfo.md`
  - `CHANGELOG.md`
- **Änderungen:**
  - Neue Sortierlogik für Bestellungen:
    - Admin/Seller: Sortierung nach sheet_order_id (absteigend)
    - Staff: NEW-Status priorisiert, dann nach created_at
  - Status-Farben aktualisiert für bessere Sichtbarkeit
  - 24-Stunden-Authentifizierung implementiert
  - get_status_name Funktion korrigiert
  - Deployment-Prozess dokumentiert
- **Kommentar:** 
  - Was wurde geändert? Umfangreiche Updates für bessere Benutzererfahrung und Wartbarkeit
  - Warum wurde es geändert? Verbesserung der Sortierlogik und visuellen Darstellung
  - Welche Auswirkungen hat die Änderung? Bessere Übersichtlichkeit und Benutzerfreundlichkeit
- **Grund:** Verbesserung der Anwendungsfunktionalität und Wartbarkeit

### [Datum: 2025-04-20 09:15:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Wechsel von PROD zu ENTW Datenbank nach Deployment
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Deaktivierung der PROD-Datenbank (gyrpgzizmprywzfpcwzr.supabase.co)
  - Aktivierung der ENTW-Datenbank (sricbznbrczupdvasemq.supabase.co)
- **Kommentar:** 
  - Was wurde geändert? Die Datenbankverbindung wurde von PROD auf ENTW umgestellt
  - Warum wurde es geändert? Um in der Entwicklungsumgebung zu arbeiten
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun die ENTW-Datenbank
- **Grund:** Entwicklung in sicherer Umgebung nach erfolgreichem Deployment

### [Datum: 2025-04-20 10:00:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Wechsel von ENTW zu PROD Datenbank und Deployment
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Deaktivierung der ENTW-Datenbank (sricbznbrczupdvasemq.supabase.co)
  - Aktivierung der PROD-Datenbank (gyrpgzizmprywzfpcwzr.supabase.co)
  - Build und Deployment durchgeführt
- **Kommentar:** 
  - Was wurde geändert? Die Datenbankverbindung wurde von ENTW auf PROD umgestellt
  - Warum wurde es geändert? Für das Produktions-Deployment
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun die PROD-Datenbank
- **Grund:** Produktions-Deployment nach erfolgreichem Test in der Entwicklungsumgebung

### [Datum: 2025-04-20 10:15:00]
- **Durchgeführt von:** Claude
- **Beschreibung:** Wechsel von PROD zu ENTW Datenbank nach Deployment
- **Betroffene Dateien:** `.env`
- **Änderungen:**
  - Deaktivierung der PROD-Datenbank (gyrpgzizmprywzfpcwzr.supabase.co)
  - Aktivierung der ENTW-Datenbank (sricbznbrczupdvasemq.supabase.co)
  - Build durchgeführt
- **Kommentar:** 
  - Was wurde geändert? Die Datenbankverbindung wurde von PROD auf ENTW umgestellt
  - Warum wurde es geändert? Um in der Entwicklungsumgebung zu arbeiten
  - Welche Auswirkungen hat die Änderung? Die Anwendung verwendet nun die ENTW-Datenbank
- **Grund:** Entwicklung in sicherer Umgebung nach erfolgreichem Deployment

---

*Hinweis: Diese Datei sollte bei jedem Commit aktualisiert werden, wenn Datenbankänderungen vorgenommen wurden.*

# Changelog

## [2024-03-19] Dashboard Updates

### Added
- Three new charts in the Dashboard showing order statistics for the last 7 days:
  - All Orders
  - Confirmed Orders
  - Delivered Orders
- Charts are implemented using Chart.js
- Each chart shows daily order counts with weekday labels

### Changed
- Removed "Live Sells" section from Dashboard
- Removed status filter dropdown from Dashboard
- Changed all chart labels and titles to English
- Changed date format to English (e.g., "Mon" instead of "Mo")

### Technical Details
- Charts are responsive and update automatically when order data changes
- Each chart shows data for the last 7 days
- Y-axis shows integer values for order counts
- X-axis shows weekdays in short format

### Known Issues
- Confirmed Orders chart only shows orders with current status "CONFIRMED"
- Orders that were confirmed on one day but delivered on another day are not tracked in the confirmation history
- This affects the accuracy of daily confirmation statistics

### Future Considerations
Discussed potential improvements for order status tracking:
1. Adding a `confirmed_at` field to the orders table
2. Creating an `order_history` table to track all status changes

### Dependencies Added
- chart.js for chart visualization 