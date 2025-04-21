const { handler } = require('../netlify/functions/sync-orders.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Funktion zum Laden der Umgebungsvariablen
function loadEnvVariables() {
  console.log('Loading environment variables...');
  
  // Versuche .env Datei zu laden
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

// Funktion zum Synchronisieren der Bestellungen
async function syncOrders() {
  console.log('Starting orders synchronization...');
  
  // Zeitbereich für die Synchronisation (letzte 24 Stunden)
  const endDate = new Date();
  const startDate = new Date(endDate - 24 * 60 * 60 * 1000);
  
  console.log(`Synchronizing orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  const event = {
    body: JSON.stringify({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
  };

  const context = {};
  
  return handler(event, context);
}

// Hauptfunktion
async function main() {
  try {
    console.log('Starting process...');
    const result = await syncOrders();
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      console.log('Order details:', data.details || []);
      
      if (data.total === 0) {
        console.log('No orders found in the specified time range.');
      } else {
        console.log(`Processed ${data.total} orders (${data.successful} successful, ${data.failed} failed)`);
      }
      
      console.log('Orders synchronization completed successfully');
    } else {
      console.error('Sync failed with status code:', result.statusCode);
      console.error('Error details:', result.body);
      process.exit(1);
    }
  } catch (error) {
    console.error('Process failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Script ausführen
main(); 