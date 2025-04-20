import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Konfiguration
const config = {
  prod: {
    siteId: 'charming-babka-d2191f', // PROD Site ID (codservice.org)
    env: {
      VITE_SUPABASE_URL: 'https://gyrpgzizmprywzfpcwzr.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBneml6bXByeXd6ZnBjd3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NzYyMjMsImV4cCI6MjA2MDQ1MjIyM30.yqvS4z0ANTIPRYQEjKId64kQlijYknU3WdErSEsRfIU'
    }
  },
  dev: {
    siteId: '263e9260-c847-4ed0-878f-67166abe6bec', // ENTW Site ID (codservice-dev.netlify.app)
    env: {
      VITE_SUPABASE_URL: 'https://sricbznbrczupdvasemq.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaWNiem5icmN6dXBkdmFzZW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Nzc2NjQsImV4cCI6MjA2MDU1MzY2NH0.cu-p-mOcmWFXfencvNBwH88UeULnJGDODVWTNTFCr38'
    }
  }
};

// .env Datei aktualisieren
function updateEnvFile(env) {
  const envContent = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  writeFileSync('.env', envContent);
  console.log('✅ .env Datei aktualisiert');
}

// Deployment durchführen
function deploy(siteId) {
  try {
    console.log(`🚀 Starte Deployment für Site ${siteId}...`);
    
    // Build ausführen
    console.log('📦 Führe Build aus...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Deploy mit Netlify
    console.log('🌐 Deploye zu Netlify...');
    execSync(`netlify deploy --prod --site=${siteId}`, { stdio: 'inherit' });
    
    console.log('✅ Deployment erfolgreich!');
  } catch (error) {
    console.error('❌ Deployment fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Hauptfunktion
function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase();

  if (!target || !['prod', 'dev'].includes(target)) {
    console.log('❌ Bitte geben Sie die Zielumgebung an: prod oder dev');
    console.log('Beispiel: node deploy.js prod');
    process.exit(1);
  }

  const siteConfig = config[target];
  
  console.log(`🎯 Ziel: ${target.toUpperCase()}`);
  updateEnvFile(siteConfig.env);
  deploy(siteConfig.siteId);
}

main(); 