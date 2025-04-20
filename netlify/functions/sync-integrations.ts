import { Handler } from '@netlify/functions'
import { supabase } from '../utils/supabase'
import { Integration, SyncResult } from './types'

export const handler: Handler = async (event, context) => {
  // Nur POST Requests erlauben
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Hole alle aktivierten Integrationen
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select(`
        *,
        user:user_id (
          name,
          email
        )
      `)
      .eq('auto_sync', true)

    if (fetchError) throw fetchError

    const results = {
      total: integrations.length,
      successful: 0,
      failed: 0,
      details: [] as any[]
    }

    // Verarbeite jede Integration
    for (const integration of integrations) {
      try {
        console.log(`Starting sync for integration ${integration.id}`)
        
        // Hole Sheet-Daten
        const { data: sheetData, error: sheetError } = await supabase
          .from('sheet_data')
          .select('*')
          .eq('integration_id', integration.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (sheetError) throw sheetError

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
                  user_id: integration.user_id,
                  customer_name: row.customer_name,
                  phone: row.phone,
                  shipping_address: row.address,
                  city: row.city,
                  product_id: row.product_id,
                  quantity: row.quantity,
                  total_amount: row.total_amount,
                  unit_price: row.price,
                  sheet_order_id: row.order_id
                }
              ])

            if (insertError) throw insertError

            syncResult.new++
          } catch (err) {
            syncResult.skipped++
            syncResult.invalidData.push({
              row: row.id,
              reason: err.message,
              data: row
            })
          }
        }

        // Update last_sync_at
        await supabase
          .from('integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id)

        results.successful++
        results.details.push({
          integrationId: integration.id,
          status: 'success',
          ...syncResult
        })
      } catch (err) {
        console.error(`Error syncing integration ${integration.id}:`, err)
        results.failed++
        results.details.push({
          integrationId: integration.id,
          status: 'error',
          error: err.message
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    }
  } catch (error) {
    console.error('Sync error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Sync failed',
        details: error.message 
      })
    }
  }
} 