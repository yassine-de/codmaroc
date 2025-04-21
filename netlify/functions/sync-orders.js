const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// Supabase Umgebungsvariablen setzen
process.env.VITE_SUPABASE_URL = 'https://sricbznbrczupdvasemq.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaWNiem5icmN6dXBkdmFzZW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Nzc2NjQsImV4cCI6MjA2MDU1MzY2NH0.cu-p-mOcmWFXfencvNBwH88UeULnJGDODVWTNTFCr38';

// Supabase Client initialisieren
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Google Sheets API ohne Auth konfigurieren
const sheets = google.sheets({ version: 'v4' });

// Netlify Function Handler
module.exports.handler = async (event, context) => {
  try {
    // Request-Body parsen
    const { startDate, endDate } = JSON.parse(event.body);
    console.log(`Syncing orders from ${startDate} to ${endDate}`);

    // Aktive Integrationen abrufen
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('id, user_id, spreadsheet_id')
      .eq('is_active', true)
      .not('spreadsheet_id', 'is', null);

    if (integrationsError) {
      throw new Error(`Error fetching integrations: ${integrationsError.message}`);
    }

    console.log(`Found ${integrations.length} active integrations`);

    // Bestellungen verarbeiten
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    // Für jede Integration die Bestellungen synchronisieren
    for (const integration of integrations) {
      try {
        console.log(`Processing sheet for integration ${integration.id} (Sheet ID: ${integration.spreadsheet_id})`);

        // Google Sheet Daten abrufen
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: integration.spreadsheet_id,
          range: 'Orders!A2:Z', // Anpassen an Ihr Sheet-Format
        });

        const rows = response.data.values || [];
        console.log(`Found ${rows.length} rows in Google Sheet for integration ${integration.id}`);

        results.total += rows.length;

        for (const row of rows) {
          try {
            // Hier Ihre Logik zur Verarbeitung der Bestellungsdaten
            // Beispiel:
            const orderData = {
              user_id: integration.user_id,
              integration_id: integration.id,
              sheet_order_id: row[0],
              customer_name: row[1],
              // ... weitere Felder
            };

            // In Supabase speichern
            const { error } = await supabase
              .from('orders')
              .upsert(orderData, {
                onConflict: 'sheet_order_id,integration_id'
              });

            if (error) throw error;

            results.successful++;
            results.details.push({
              status: 'success',
              integration_id: integration.id,
              order_id: orderData.sheet_order_id
            });
          } catch (err) {
            results.failed++;
            results.details.push({
              status: 'error',
              integration_id: integration.id,
              error: err.message
            });
          }
        }
      } catch (err) {
        console.error(`Error processing sheet for integration ${integration.id}:`, err);
        results.details.push({
          status: 'error',
          integration_id: integration.id,
          error: `Sheet processing error: ${err.message}`
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      })
    };
  }
}; 