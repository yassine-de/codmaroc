import { Handler } from '@netlify/functions'
import { supabase } from '../utils/supabase'
import { SyncResult } from './types'

export const handler: Handler = async (event, context) => {
  // Nur POST Requests erlauben
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      details: [] as any[]
    }

    try {
      console.log('Starting direct sheet data sync')
      
      // Hole Sheet-Daten direkt ohne Integration
      const { data: sheetData, error: sheetError } = await supabase
        .from('sheet_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50) // Limitiere auf die neuesten 50 Einträge

      if (sheetError) throw sheetError
      
      if (!sheetData || sheetData.length === 0) {
        console.log('No sheet data found to sync')
        return {
          statusCode: 200,
          body: JSON.stringify({
            total: 0,
            successful: 0,
            failed: 0,
            details: [{
              status: 'info',
              message: 'No sheet data found to sync'
            }]
          })
        }
      }

      results.total = sheetData.length

      // Hole existierende Bestellungen für Duplikatprüfung
      const { data: existingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('phone, product_id, created_at, sheet_order_id')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      let syncResult: SyncResult = {
        new: 0,
        skipped: 0,
        skippedSkus: [],
        skippedExistingOrders: 0,
        invalidData: []
      }

      // Verarbeite jede Zeile aus dem Sheet
      for (const row of sheetData) {
        try {
          // Prüfe auf Duplikate
          const existingOrder = existingOrders?.find(
            order => order.sheet_order_id === row.order_id
          )

          if (existingOrder) {
            syncResult.skipped++
            syncResult.skippedExistingOrders++
            continue
          }

          // Erstelle neue Bestellung
          const { error: insertError } = await supabase
            .from('orders')
            .insert([
              {
                customer_name: row.customer_name,
                phone: row.phone,
                shipping_address: row.address,
                city: row.city,
                product_id: row.product_id,
                quantity: row.quantity,
                total_amount: row.total_amount,
                unit_price: row.price,
                sheet_order_id: row.order_id,
                status: 'new'
              }
            ])

          if (insertError) throw insertError

          syncResult.new++
          results.successful++
        } catch (err: any) {
          syncResult.skipped++
          syncResult.invalidData.push({
            row: row.id,
            reason: err.message || 'Unknown error',
            data: row
          })
          results.failed++
        }
      }

      results.details.push({
        status: 'success',
        ...syncResult
      })
      
    } catch (err: any) {
      console.error('Error syncing sheet data:', err)
      results.failed++
      results.details.push({
        status: 'error',
        error: err.message || 'Unknown error'
      })
    }

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    }
  } catch (error: any) {
    console.error('Sync error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Sync failed',
        details: error.message || 'Unknown error'
      })
    }
  }
} 