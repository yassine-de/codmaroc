const https = require('https');

// Netlify Umgebungsvariablen
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

// Funktion zum Aufrufen der Netlify Function
async function syncOrders() {
  const functionUrl = `https://codservice-dev.netlify.app/.netlify/functions/sync-integrations`;
  
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

    req.end();
  });
}

// Hauptfunktion
async function main() {
  try {
    console.log('Starting orders synchronization...');
    await syncOrders();
    console.log('Orders synchronization completed successfully');
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

// Script ausführen
main(); 