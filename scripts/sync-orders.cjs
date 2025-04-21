const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Funktion zum Laden der Umgebungsvariablen
function loadEnvVariables() {
  console.log('Loading environment variables...');
  
  // Prüfe ob wir in GitHub Actions sind
  if (process.env.GITHUB_ACTIONS) {
    console.log('Running in GitHub Actions environment');
    // In GitHub Actions werden die Variablen direkt aus den Secrets geladen
    return;
  }
  
  // Lokale Entwicklung: Versuche .env Datei zu laden
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Found .env file, loading variables...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
    console.log('Environment variables loaded from .env file');
  } else {
    console.log('No .env file found, using process environment variables');
  }
}

// Umgebungsvariablen laden
loadEnvVariables();

// Prüfe ob die erforderlichen Umgebungsvariablen vorhanden sind
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Required environment variables are missing:');
  if (!process.env.VITE_SUPABASE_URL) console.error('- VITE_SUPABASE_URL');
  if (!process.env.VITE_SUPABASE_ANON_KEY) console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Supabase Client initialisieren
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Funktion zum Synchronisieren der Bestellungen
async function syncOrders() {
  console.log('Starting orders synchronization...');
  
  try {
    // Aktive Integrationen abrufen
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('*')
      .eq('is_active', true)
      .not('spreadsheet_id', 'is', null);

    if (integrationsError) {
      throw new Error(`Error fetching integrations: ${integrationsError.message}`);
    }

    console.log(`Found ${integrations.length} active integrations`);

    let totalNew = 0;
    let totalSkipped = 0;
    let totalSkippedExisting = 0;
    let allSkippedSkus = [];

    // Für jede Integration die Bestellungen synchronisieren
    for (const integration of integrations) {
      try {
        console.log(`Processing integration ${integration.id}...`);
        
        // Google Sheet Daten abrufen
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheet_id}/values/Orders!A2:Z`);
        const data = await response.json();
        const rows = data.values || [];

        console.log(`Found ${rows.length} rows in Google Sheet for integration ${integration.id}`);

        // Bestehende Bestellungen abrufen
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('phone, product_id, created_at, sheet_order_id')
          .order('created_at', { ascending: false });

        // Jede Zeile verarbeiten
        for (const row of rows) {
          try {
            // Produkt anhand der SKU finden
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('sku', row[5]) // SKU ist in Spalte F
              .single();

            if (!product) {
              console.log(`Skipped: Product not found for SKU ${row[5]}`);
              totalSkipped++;
              allSkippedSkus.push(row[5] || 'unknown');
              continue;
            }

            // Prüfen ob Bestellung bereits existiert
            const existingOrder = existingOrders?.find(order => order.sheet_order_id === row[0]);
            if (existingOrder) {
              console.log(`Skipped: Order already exists with sheet_order_id ${row[0]}`);
              totalSkipped++;
              totalSkippedExisting++;
              continue;
            }

            // Neue Bestellung einfügen
            const { error: insertError } = await supabase
              .from('orders')
              .insert([{
                user_id: integration.user_id,
                customer_name: row[1].trim(),
                phone: row[2],
                shipping_address: row[3],
                city: row[4],
                status: 1, // New
                product_id: product.id,
                quantity: row[6] || 1,
                total_amount: row[7] * (row[6] || 1),
                unit_price: row[7],
                sheet_order_id: row[0]
              }]);

            if (insertError) throw insertError;

            totalNew++;
          } catch (err) {
            console.error(`Error processing row:`, err);
            totalSkipped++;
          }
        }

        // Last sync time aktualisieren
        await supabase
          .from('integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);

      } catch (err) {
        console.error(`Error processing integration ${integration.id}:`, err);
      }
    }

    console.log('Sync completed!');
    console.log(`Total new orders: ${totalNew}`);
    console.log(`Total skipped orders: ${totalSkipped}`);
    if (totalSkippedExisting > 0) {
      console.log(`- ${totalSkippedExisting} orders already exist`);
    }
    if (allSkippedSkus.length > 0) {
      const uniqueSkus = [...new Set(allSkippedSkus)];
      const skippedDueToMissingProducts = totalSkipped - totalSkippedExisting;
      console.log(`- ${skippedDueToMissingProducts} orders skipped due to missing products: ${uniqueSkus.join(', ')}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Script ausführen
syncOrders(); 