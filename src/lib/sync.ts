import { createClient } from '@supabase/supabase-js'
import { fetchSheetData } from './fetchSheetData'

export interface SheetRow {
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

export interface SyncStats {
  total: number
  new: number
  skipped: number
  skippedSkus: string[]
  skippedExistingOrders: number
  invalidData: Array<{ row: number; reason: string; data: any }>
}

export async function handleSync(supabase: any, integration: any): Promise<SyncStats> {
  const stats: SyncStats = {
    total: 0,
    new: 0,
    skipped: 0,
    skippedSkus: [],
    skippedExistingOrders: 0,
    invalidData: []
  }

  const rows = await fetchSheetData(integration)
  stats.total = rows.length

  const { data: existingOrders } = await supabase
    .from('orders')
    .select('phone, product_id, created_at, sheet_order_id')
    .order('created_at', { ascending: false })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('sku', row.sku)
        .single()

      if (!product) {
        stats.skipped++
        stats.skippedSkus.push(row.sku || 'unknown')
        continue
      }

      const existsById = existingOrders?.find(o => o.sheet_order_id === row.orderId)
      if (existsById) {
        stats.skipped++
        stats.skippedExistingOrders++
        continue
      }

      const isDuplicate = existingOrders?.some(o => {
        if (o.phone === row.phone && o.product_id === product.id) {
          const orderDate = new Date(o.created_at)
          const now = new Date()
          const diff = Math.abs(now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
          return diff <= 7
        }
        return false
      }) ?? false  // falls existingOrders leer ist

      const insert = await supabase.from('orders').insert([
        {
          user_id: integration.user_id,
          customer_name: row.customerName,
          phone: row.phone,
          shipping_address: row.address,
          city: row.city,
          status: isDuplicate ? 15 : 1, // ✅ 15 = DOUBLE, 1 = NEW
          product_id: product.id,
          quantity: row.quantity,
          unit_price: row.price,
          total_amount: row.totalAmount,
          sheet_order_id: row.orderId
        }
      ])

      if (insert.error) {
        stats.skipped++
        stats.invalidData.push({
          row: i + 1,
          reason: insert.error.message,
          data: { name: row.customerName, phone: row.phone, sku: row.sku }
        })
        continue
      }

      stats.new++
    } catch (e: any) {
      stats.skipped++
      stats.invalidData.push({
        row: i + 1,
        reason: e.message || 'Unknown error',
        data: { name: row.customerName, phone: row.phone, sku: row.sku }
      })
    }
  }

  await supabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', integration.id)

  // 📦 Zusammenfassung in den Logs:
  console.log(
    `[handleSync] Integration ${integration.id} – Ergebnis:\n` +
    `• Gesamt: ${stats.total}\n` +
    `• Neu: ${stats.new}\n` +
    `• Übersprungen: ${stats.skipped}\n` +
    `  ↳ davon bereits vorhanden: ${stats.skippedExistingOrders}\n` +
    `  ↳ fehlende Produkte (SKUs): ${stats.skippedSkus.join(', ') || '-'}` +
    (stats.invalidData.length > 0
      ? `\n• Ungültige Daten (${stats.invalidData.length}):\n` + JSON.stringify(stats.invalidData, null, 2)
      : ''
    )
  )

  return stats
}
