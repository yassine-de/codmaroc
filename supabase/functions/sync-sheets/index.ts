// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SheetData {
  orderId: string
  customerName: string
  phone: string
  address: string
  city: string
  productName: string
  sku: string
  quantity: number
  price: number
  totalAmount: number
}

interface SyncStats {
  total: number
  new: number
  skipped: number
  skippedSkus: string[]
  skippedExistingOrders: number
  invalidData: Array<{
    row: number
    data: any
    reason: string
  }>
}

// Hilfsfunktionen für die Datenverarbeitung
const convertArabicToLatinNumbers = (str: string): string =>
  str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())

const formatPhoneForWhatsApp = (phone: string): string => {
  let clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('00961')) return '+' + clean.substring(2)
  if (clean.startsWith('0')) clean = clean.substring(1)
  if (!clean.startsWith('961')) clean = '961' + clean
  return '+' + clean
}

async function readSpreadsheet(spreadsheetId: string, sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  const response = await fetch(url)
  const text = await response.text()
  const json = JSON.parse(text.substring(47).slice(0, -2))
  
  if (!json.table || !json.table.cols || !json.table.rows) {
    throw new Error('Invalid sheet format or empty sheet')
  }

  // Finde die erste nicht-leere Zeile für Spaltenüberschriften
  const headerRow = json.table.rows[0]
  if (!headerRow || !headerRow.c) {
    throw new Error('Keine Spaltenüberschriften gefunden')
  }

  // Extrahiere die Spaltenüberschriften aus der ersten Zeile
  const columnHeaders = headerRow.c.map((cell: any, index: number) => {
    const value = cell?.v || ''
    // Definiere erwartete Spaltenüberschriften und ihre Varianten
    const headerMappings: { [key: string]: string } = {
      'Order ID': ['Order ID', 'OrderID', 'Order Number', 'OrderNumber'].find(h => value.includes(h)) || '',
      'Customer Name': ['Customer Name', 'Full name', 'FullName', 'Name'].find(h => value.includes(h)) || '',
      'Phone': ['Phone', 'Phone Number', 'Contact'].find(h => value.includes(h)) || '',
      'Address': ['Address', 'Shipping Address'].find(h => value.includes(h)) || '',
      'City': ['City', 'Town', 'Location'].find(h => value.includes(h)) || '',
      'Product Name': ['Product Name', 'Item', 'Product'].find(h => value.includes(h)) || '',
      'SKU': ['SKU', 'Product Code', 'Item Code'].find(h => value.includes(h)) || '',
      'Quantity': ['Quantity', 'Total quantity', 'Qty'].find(h => value.includes(h)) || '',
      'Price': ['Price', 'Total charge', 'Amount'].find(h => value.includes(h)) || ''
    }

    // Finde die passende Standardüberschrift
    for (const [standard, variants] of Object.entries(headerMappings)) {
      if (variants) {
        return standard
      }
    }
    return ''
  })

  console.log('Erkannte Spaltenüberschriften:', columnHeaders)

  // Verarbeite die Datenzeilen (überspringe die Headerzeile)
  const rows = json.table.rows
    .slice(1) // Überspringe die Headerzeile
    .map((row: any) => {
      if (!row.c) return null
      
      const rowData: any = {}
      row.c.forEach((cell: any, index: number) => {
        const header = columnHeaders[index]
        if (header) {
          const value = cell?.v
          // Konvertiere und validiere Werte basierend auf dem Spaltentyp
          switch (header) {
            case 'Order ID':
              rowData.orderId = value?.toString() || ''
              break
            case 'Customer Name':
              rowData.customerName = value?.toString() || ''
              break
            case 'Phone':
              rowData.phone = value?.toString() || ''
              break
            case 'Address':
              rowData.address = value?.toString() || ''
              break
            case 'City':
              rowData.city = value?.toString() || ''
              break
            case 'Product Name':
              rowData.productName = value?.toString() || ''
              break
            case 'SKU':
              rowData.sku = value?.toString() || ''
              break
            case 'Quantity':
              rowData.quantity = parseInt(value) || 1
              break
            case 'Price':
              rowData.price = parseFloat(value) || 0
              break
          }
        }
      })

      // Validiere erforderliche Felder
      const hasRequiredFields = rowData.orderId && 
                              rowData.customerName && 
                              rowData.phone && 
                              rowData.sku

      return hasRequiredFields ? rowData : null
    })
    .filter(Boolean) // Entferne null-Einträge

  console.log('Erste verarbeitete Zeile:', rows[0])
  return rows
}

async function fetchSheetData(integration: any): Promise<SheetData[]> {
  try {
    const rows = await readSpreadsheet(integration.spreadsheet_id, integration.sheet_name)
    return rows.map(row => {
      // Telefonnummer formatieren
      const rawPhone = row['Phone']?.toString() || ''
      const latinPhone = convertArabicToLatinNumbers(rawPhone)
      const cleanPhone = latinPhone.replace(/'/g, '')
      const formattedPhone = formatPhoneForWhatsApp(cleanPhone)

      // Konvertiere Preise
      const rawPrice = row['Price']?.toString() || '0'
      const convertedPrice = Number(convertArabicToLatinNumbers(rawPrice).replace(',', '.'))

      const rawQuantity = row['Quantity']?.toString() || '1'
      const quantity = parseInt(convertArabicToLatinNumbers(rawQuantity))

      return {
        orderId: convertArabicToLatinNumbers(row['Order ID']?.toString() || ''),
        customerName: row['Customer Name']?.toString() || '',
        phone: formattedPhone,
        address: row['Address']?.toString() || '',
        city: row['City']?.toString() || '',
        productName: row['Product Name']?.toString() || '',
        sku: row['SKU']?.toString() || '',
        quantity: quantity,
        price: convertedPrice,
        totalAmount: convertedPrice * quantity
      }
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Sheet-Daten:', error)
    throw error
  }
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('id, user_id, spreadsheet_id, sheet_name')
      .not('spreadsheet_id', 'is', null)

    if (integrationsError) {
      throw new Error(`Error fetching integrations: ${integrationsError.message}`)
    }

    console.log(`Found ${integrations?.length} integrations`)

    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    }

    // Process each integration
    for (const integration of integrations || []) {
      try {
        console.log(`Processing integration ${integration.id}`)
        
        // Reset sync stats for this integration
        const syncStats: SyncStats = {
          total: 0,
          new: 0,
          skipped: 0,
          skippedSkus: [],
          skippedExistingOrders: 0,
          invalidData: []
        }

        // Fetch sheet data
        const sheetData = await fetchSheetData(integration)
        syncStats.total = sheetData.length
        console.log(`Found ${sheetData.length} rows in sheet for integration ${integration.id}`)

        // Get existing orders for duplicate check
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('phone, product_id, created_at, sheet_order_id')
          .eq('user_id', integration.user_id)
          .eq('integration_id', integration.id)
          .order('created_at', { ascending: false })

        // Process each row
        for (const row of sheetData) {
          try {
            // Skip if order already exists by ID
            const existsById = existingOrders?.find(o => o.sheet_order_id === row.orderId)
            if (existsById) {
              syncStats.skipped++
              syncStats.skippedExistingOrders++
              continue
            }

            // Validate required fields
            if (!row.orderId || !row.customerName || !row.phone || !row.sku) {
              syncStats.skipped++
              syncStats.invalidData.push({
                row: syncStats.total,
                data: row,
                reason: 'Missing required fields'
              })
              continue
            }

            // Check if product exists
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('sku', row.sku)
              .single()

            if (!product) {
              syncStats.skipped++
              syncStats.skippedSkus.push(row.sku)
              continue
            }

            // Check for duplicate orders within 7 days
            const isDuplicate = existingOrders?.some(o => {
              if (o.phone === row.phone && o.product_id === product.id) {
                const orderDate = new Date(o.created_at)
                const now = new Date()
                const diff = Math.abs(now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
                return diff <= 7
              }
              return false
            }) ?? false

            // Insert into orders table
            const { error: insertError } = await supabase
              .from('orders')
              .insert({
                user_id: integration.user_id,
                customer_name: row.customerName.trim(),
                phone: row.phone,
                shipping_address: row.address,
                city: row.city,
                status: isDuplicate ? 15 : 1, // 15 für Double, 1 für New
                product_id: product.id,
                quantity: row.quantity || 1,
                total_amount: row.price * (row.quantity || 1),
                unit_price: row.price,
                sheet_order_id: row.orderId,
                created_at: new Date().toISOString()
              })

            if (insertError) {
              throw insertError
            }

            syncStats.new++
            results.successful++
            console.log(`Added new order ${row.orderId} for integration ${integration.id}`)
          } catch (err) {
            console.error(`Error processing row:`, err)
            syncStats.skipped++
            results.failed++
          }
        }

        // Update last sync timestamp
        const { error: updateError } = await supabase
          .from('integrations')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id)

        if (updateError) {
          console.error('Error updating last sync time:', updateError)
        } else {
          console.log(`Updated last_sync_at for integration ${integration.id}`)
        }

        // Log sync stats
        console.log(
          `[handleSync] Integration ${integration.id} – Ergebnis:\n` +
          `• Gesamt: ${syncStats.total}\n` +
          `• Neu: ${syncStats.new}\n` +
          `• Übersprungen: ${syncStats.skipped}\n` +
          `  ↳ davon bereits vorhanden: ${syncStats.skippedExistingOrders}\n` +
          `  ↳ fehlende Produkte (SKUs): ${syncStats.skippedSkus.join(', ') || '-'}` +
          (syncStats.invalidData.length > 0
            ? `\n• Ungültige Daten (${syncStats.invalidData.length}):\n` + JSON.stringify(syncStats.invalidData, null, 2)
            : ''
          )
        )

        results.details.push({
          integration_id: integration.id,
          stats: syncStats
        })

      } catch (err) {
        console.error(`Error processing integration ${integration.id}:`, err)
        results.failed++
        results.details.push({
          integration_id: integration.id,
          error: err.message
        })
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
