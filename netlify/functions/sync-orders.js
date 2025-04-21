const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// Supabase Client initialisieren
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Google Sheets API konfigurieren
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

exports.handler = async (event, context) => {
  try {
    // Request-Body parsen
    const { startDate, endDate } = JSON.parse(event.body);
    console.log(`Syncing orders from ${startDate} to ${endDate}`);

    // Aktive Benutzer mit Google Sheet IDs abrufen
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, google_sheet_id')
      .eq('is_active', true)
      .not('google_sheet_id', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`Found ${users.length} active users with Google Sheet IDs`);

    // Bestellungen verarbeiten
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    // Für jeden Benutzer die Bestellungen synchronisieren
    for (const user of users) {
      try {
        console.log(`Processing sheet for user ${user.id} (Sheet ID: ${user.google_sheet_id})`);

        // Google Sheet Daten abrufen
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: user.google_sheet_id,
          range: 'Orders!A2:Z', // Anpassen an Ihr Sheet-Format
        });

        const rows = response.data.values || [];
        console.log(`Found ${rows.length} rows in Google Sheet for user ${user.id}`);

        results.total += rows.length;

        for (const row of rows) {
          try {
            // Hier Ihre Logik zur Verarbeitung der Bestellungsdaten
            // Beispiel:
            const orderData = {
              user_id: user.id,
              sheet_order_id: row[0],
              customer_name: row[1],
              // ... weitere Felder
            };

            // In Supabase speichern
            const { error } = await supabase
              .from('orders')
              .upsert(orderData, {
                onConflict: 'sheet_order_id,user_id'
              });

            if (error) throw error;

            results.successful++;
            results.details.push({
              status: 'success',
              user_id: user.id,
              order_id: orderData.sheet_order_id
            });
          } catch (err) {
            results.failed++;
            results.details.push({
              status: 'error',
              user_id: user.id,
              error: err.message
            });
          }
        }
      } catch (err) {
        console.error(`Error processing sheet for user ${user.id}:`, err);
        results.details.push({
          status: 'error',
          user_id: user.id,
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