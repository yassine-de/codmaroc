const https = require('https');

// Netlify Umgebungsvariablen
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

// Funktion zum Aufrufen der Netlify Function
async function syncOrders() {
  const functionUrl = `https://codservice-dev.netlify.app/.netlify/functions/sync-integrations`;
  
  // Zeitraum für die Synchronisation (letzte 7 Tage)
  const now = new Date();
  const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  const payload = {
    startDate: lastWeek.toISOString(),
    endDate: now.toISOString()
  };

  console.log('Synchronizing orders from', payload.startDate, 'to', payload.endDate);
  
  return new Promise((resolve, reject) => {
    const req = https.request(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
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
            if (response.details && response.details.length > 0) {
              console.log('Order details:', response.details);
            }
            resolve(response);
          } catch (error) {
            console.log('Raw response:', data);
            resolve(data);
          }
        } else {
          console.error(`Error syncing orders: ${res.statusCode} ${data}`);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    // Sende den Payload
    console.log('Sending payload:', payload);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Hauptfunktion
async function main() {
  try {
    console.log('Starting orders synchronization...');
    const result = await syncOrders();
    if (result.total === 0) {
      console.log('No orders found in the specified time range.');
    } else {
      console.log(`Synchronized ${result.successful} orders successfully.`);
      if (result.failed > 0) {
        console.log(`Failed to synchronize ${result.failed} orders.`);
      }
    }
    console.log('Orders synchronization completed successfully');
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

// Script ausführen
main(); 