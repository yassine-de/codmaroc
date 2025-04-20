const https = require('https');

// Netlify Umgebungsvariablen
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

// Funktion zum Auslösen des Netlify Builds
async function triggerNetlifyBuild() {
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${NETLIFY_SITE_ID}/builds`,
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
          console.log('Netlify build triggered successfully');
          resolve(data);
        } else {
          console.error(`Error triggering build: ${res.statusCode} ${data}`);
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
    console.log('Starting Netlify build trigger...');
    await triggerNetlifyBuild();
    console.log('Process completed successfully');
  } catch (error) {
    console.error('Process failed:', error);
    process.exit(1);
  }
}

// Script ausführen
main(); 