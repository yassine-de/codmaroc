const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// Umgebungsvariablen
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Überprüfe erforderliche Umgebungsvariablen
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Required environment variables are missing:');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  process.exit(1);
}

// Supabase Client initialisieren
console.log('Initializing Supabase client...');
console.log('Supabase URL:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funktion zum Überprüfen der Datenbankverbindung
async function checkDatabaseConnection() {
  console.log('Checking database connection...');
  try {
    const { data, error } = await supabase
      .from('sheet_data')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log('Database connection successful');
    return true;
  } catch (err) {
    console.error('Unexpected error during database check:', err);
    return false;
  }
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
    console.log('- SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
    console.log('- SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');

    // Datenbankverbindung überprüfen
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

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