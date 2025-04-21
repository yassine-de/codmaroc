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

// Funktion zum Auslösen des Netlify Builds
async function triggerNetlifyBuild() {
  console.log('Preparing Netlify build trigger...');
  console.log('Using Site ID:', NETLIFY_SITE_ID);
  
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
          console.log('Response:', data);
          resolve(data);
        } else {
          console.error(`Error triggering build: ${res.statusCode}`);
          console.error('Response data:', data);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Network error during Netlify trigger:', error);
      reject(error);
    });

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

    console.log('Starting Netlify build trigger...');
    await triggerNetlifyBuild();
    console.log('Process completed successfully');
  } catch (error) {
    console.error('Process failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Script ausführen
main(); 