const { handler } = require('../netlify/functions/sync-orders.js');

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