const https = require('https');

// Netlify Umgebungsvariablen
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

// Überprüfe erforderliche Umgebungsvariablen
if (!NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN) {
  console.error('Required environment variables are missing:');
  console.error('NETLIFY_SITE_ID:', NETLIFY_SITE_ID ? 'Set' : 'Not set');
  console.error('NETLIFY_AUTH_TOKEN:', NETLIFY_AUTH_TOKEN ? 'Set' : 'Not set');
  process.exit(1);
}

// Funktion zum Synchronisieren der Bestellungen
async function syncOrders() {
  console.log('Starting orders synchronization...');
  
  // Zeitbereich für die Synchronisation (letzte 24 Stunden)
  const endDate = new Date();
  const startDate = new Date(endDate - 24 * 60 * 60 * 1000);
  
  console.log(`Synchronizing orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  const payload = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
  
  console.log('Sending payload:', payload);
  
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${NETLIFY_SITE_ID}/functions/sync-orders`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Orders sync triggered successfully');
          try {
            const response = JSON.parse(data);
            console.log('Sync response:', response);
            resolve(response);
          } catch (err) {
            console.error('Error parsing response:', err);
            reject(err);
          }
        } else {
          console.error(`Error triggering sync: ${res.statusCode}`);
          console.error('Response data:', data);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Network error during sync:', error);
      reject(error);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Hauptfunktion
async function main() {
  try {
    console.log('Starting process...');
    console.log('Environment check:');
    console.log('- NETLIFY_SITE_ID:', NETLIFY_SITE_ID ? 'Set' : 'Not set');
    console.log('- NETLIFY_AUTH_TOKEN:', NETLIFY_AUTH_TOKEN ? 'Set' : 'Not set');

    const result = await syncOrders();
    console.log('Order details:', result.details || []);
    
    if (result.total === 0) {
      console.log('No orders found in the specified time range.');
    } else {
      console.log(`Processed ${result.total} orders (${result.successful} successful, ${result.failed} failed)`);
    }
    
    console.log('Orders synchronization completed successfully');
  } catch (error) {
    console.error('Process failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Script ausführen
main(); 