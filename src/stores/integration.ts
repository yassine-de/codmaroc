import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { readSpreadsheet } from '../lib/sheets'
import { useProductStore } from './products'
import { useOrderStore } from './orders'
import { useAuthStore } from './auth'

// Hilfsfunktion zum Konvertieren arabischer Zahlen
const convertArabicToLatinNumbers = (str: string): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return str.replace(/[٠-٩]/g, match => arabicNumbers.indexOf(match).toString())
}

// Hilfsfunktion zum Formatieren der Telefonnummer
const formatPhoneForWhatsApp = (phone: string): string => {
  // Entferne alle nicht-numerischen Zeichen
  let cleanPhone = phone.replace(/[^0-9]/g, '')
  
  // Wenn die Nummer mit 00961 beginnt, ersetze es mit +961
  if (cleanPhone.startsWith('00961')) {
    return '+' + cleanPhone.substring(2) // Entferne die führenden '00'
  }
  
  // Wenn die Nummer mit 0 beginnt, entferne sie
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1)
  }
  
  // Wenn die Nummer noch keine Vorwahl hat (kürzer als 10 Ziffern), füge 961 hinzu
  if (cleanPhone.length < 10 && !cleanPhone.startsWith('961')) {
    cleanPhone = '961' + cleanPhone
  }
  
  // Wenn die Nummer mit 961 beginnt aber kein + hat, füge + hinzu
  if (cleanPhone.startsWith('961')) {
    cleanPhone = '+' + cleanPhone
  }
  
  return cleanPhone
}

export interface Integration {
  id: number
  user_id: number
  spreadsheet_id: string
  spreadsheet_name: string
  sheet_name: string
  last_sync_at: string | null
  created_at: string
  updated_at: string
  auto_sync: boolean
  user?: {
    name: string
    email: string
  }
}

export interface SheetData {
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
  invalidData: Array<{ row: number, reason: string, data: any }>
}

interface ConnectOptions {
  spreadsheetId: string
  sheetName: string
  userId?: number
}

export const useIntegrationStore = defineStore('integration', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const integrations = ref<Integration[]>([])
  const syncIntervals = ref<{ [key: number]: NodeJS.Timer }>({})
  const syncStats = ref<SyncStats>({
    total: 0,
    new: 0,
    skipped: 0,
    skippedSkus: [],
    skippedExistingOrders: 0,
    invalidData: []
  })
  const success = ref<string | null>(null)

  const fetchIntegrations = async () => {
    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('integrations')
        .select(`
          *,
          user:user_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (err) throw err

      integrations.value = data || []

      // Set up auto-sync for enabled integrations
      data?.forEach(integration => {
        if (integration.auto_sync) {
          startAutoSync(integration)
        }
      })
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching integrations:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const startAutoSync = (integration: Integration) => {
    // Clear existing interval if any
    if (syncIntervals.value[integration.id]) {
      clearInterval(syncIntervals.value[integration.id])
    }

    // Set new interval (5 minutes)
    syncIntervals.value[integration.id] = setInterval(async () => {
      console.log(`Auto-syncing integration ${integration.id}`)
      await handleSync(integration)
    }, 5 * 60 * 1000) // 5 minutes
  }

  const stopAutoSync = (integrationId: number) => {
    if (syncIntervals.value[integrationId]) {
      clearInterval(syncIntervals.value[integrationId])
      delete syncIntervals.value[integrationId]
    }
  }

  const deleteIntegration = async (integrationId: number) => {
    try {
      loading.value = true
      error.value = null

      // Stop auto-sync first
      stopAutoSync(integrationId)

      // Delete the integration
      const { error: err } = await supabase
        .from('integrations')
        .delete()
        .match({ id: integrationId })

      if (err) throw err

      // Remove from local state
      integrations.value = integrations.value.filter(i => i.id !== integrationId)
      
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting integration:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const connectGoogleSheets = async ({ spreadsheetId, sheetName, userId }: ConnectOptions) => {
    try {
      loading.value = true
      error.value = null

      // Test the connection first
      await readSpreadsheet(spreadsheetId, sheetName)

      // Get user ID (either provided or current user)
      let finalUserId: number
      if (userId) {
        finalUserId = userId
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .single()

        if (!userData) throw new Error('User not found')
        finalUserId = userData.id
      }

      const { data, error: err } = await supabase
        .from('integrations')
        .insert([
          {
            user_id: finalUserId,
            spreadsheet_id: spreadsheetId,
            spreadsheet_name: spreadsheetId,
            sheet_name: sheetName,
            auto_sync: true
          }
        ])
        .select(`
          *,
          user:user_id (
            name,
            email
          )
        `)
        .single()

      if (err) throw err
      if (!data) throw new Error('Failed to create integration')

      integrations.value.unshift(data)

      // Start auto-sync for the new integration
      startAutoSync(data)

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error connecting to Google Sheets:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const handleSync = async (integration: Integration) => {
    try {
      loading.value = true
      error.value = null
      success.value = null

      // Reset sync stats
      syncStats.value = {
        total: 0,
        new: 0,
        skipped: 0,
        skippedSkus: [],
        skippedExistingOrders: 0,
        invalidData: []
      }

      // Fetch sheet data
      const sheetData = await fetchSheetData(integration)
      syncStats.value.total = sheetData.length

      // Get existing orders for duplicate check
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('phone, product_id, created_at, sheet_order_id')
        .order('created_at', { ascending: false })

      // Process each row
      const orderPromises = sheetData.map(async (row, index) => {
        try {
          // Find product by SKU
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('sku', row.sku)
            .single()

          if (!product) {
            console.log(`Row ${index + 1} skipped: Product not found for SKU`, { sku: row.sku });
            syncStats.value.skipped++
            syncStats.value.skippedSkus.push(row.sku || 'unknown')
            return
          }

          // Prüfe zuerst, ob die Bestellung bereits existiert (gleiche sheet_order_id)
          const existingOrder = existingOrders?.find(order => order.sheet_order_id === row.orderId)
          if (existingOrder) {
            console.log(`Row ${index + 1} skipped: Order already exists with sheet_order_id`, { sheet_order_id: row.orderId });
            syncStats.value.skipped++
            syncStats.value.skippedExistingOrders++
            return
          }

          // Prüfe auf Duplikate basierend auf Telefon und Produkt
          const formattedPhone = formatPhoneForWhatsApp(row.phone)
          const isDuplicate = existingOrders?.some(order => {
            if (order.phone === formattedPhone && order.product_id === product.id) {
              const orderDate = new Date(order.created_at)
              const currentDate = new Date()
              const daysDifference = Math.abs(currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
              return daysDifference <= 3
            }
            return false
          })

          // Insert new order using integration's user_id
          const { data, error: insertError } = await supabase
            .from('orders')
            .insert([
              {
                user_id: integration.user_id,
                customer_name: row.customerName.trim(),
                phone: row.phone,
                shipping_address: row.address,
                city: row.city,
                status: isDuplicate ? 15 : 1, // 15 for Double, 1 for New
                product_id: product.id,
                quantity: row.quantity || 1,
                total_amount: row.price * (row.quantity || 1),
                unit_price: row.price,
                sheet_order_id: row.orderId
              }
            ])
            .select()
            .single()

          if (insertError) {
            console.error(`Row ${index + 1} error:`, insertError);
            syncStats.value.skipped++
            syncStats.value.invalidData.push({
              row: index + 1,
              reason: insertError.message,
              data: {
                name: row.customerName || '-',
                phone: row.phone || '-',
                sku: row.sku || '-'
              }
            })
            return
          }

          syncStats.value.new++
        } catch (err) {
          console.error(`Error processing row ${index + 1}:`, err)
          syncStats.value.skipped++
          syncStats.value.invalidData.push({
            row: index + 1,
            reason: err instanceof Error ? err.message : 'Unknown error',
            data: {
              name: row.customerName || '-',
              phone: row.phone || '-',
              sku: row.sku || '-'
            }
          })
        }
      })

      // Wait for all orders to be processed
      await Promise.all(orderPromises)

      // Update last sync time
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Error updating last sync time:', updateError)
      }

      return syncStats.value
    } catch (err: any) {
      error.value = err.message
      console.error('Error during sync:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchSheetData = async (integration: Integration): Promise<SheetData[]> => {
    try {
      const rows = await readSpreadsheet(integration.spreadsheet_id, integration.sheet_name)
      return rows.map(row => {
        // Telefonnummer formatieren
        const rawPhone = row['Phone Number (C)']?.toString() || ''
        const latinPhone = convertArabicToLatinNumbers(rawPhone)
        const cleanPhone = latinPhone.replace(/'/g, '')
        const formattedPhone = formatPhoneForWhatsApp(cleanPhone)

        // Konvertiere Preise
        const rawPrice = row['Price (I)']?.toString() || '0'
        const convertedPrice = Number(convertArabicToLatinNumbers(rawPrice).replace(',', '.'))

        const quantity = parseInt(convertArabicToLatinNumbers(row['Quantity (H)']?.toString() || '1'))
        const total = convertedPrice * quantity

        return {
          orderId: convertArabicToLatinNumbers(row['Order ID (A)']?.toString() || ''),
          customerName: row['Customer Name (B)']?.toString() || '',
          phone: formattedPhone,
          address: row['Address (D)']?.toString() || '',
          city: row['City (E)']?.toString() || '',
          productName: row['Product Name (F)']?.toString() || '',
          sku: row['SKU (G)']?.toString() || '',
          quantity: quantity,
          price: convertedPrice,
          totalAmount: total
        }
      })
    } catch (error) {
      console.error('Error fetching sheet data:', error)
      throw error
    }
  }

  const updateLastSync = async (integrationId: number) => {
    try {
      const { data, error: err } = await supabase
        .from('integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .match({ id: integrationId })
        .select(`
          *,
          user:user_id (
            name,
            email
          )
        `)
        .single()

      if (err) throw err

      if (data) {
        // Update local state
        const index = integrations.value.findIndex(i => i.id === integrationId)
        if (index !== -1) {
          integrations.value[index] = data
        }
        return data
      }

      return null
    } catch (error) {
      console.error('Error updating last sync:', error)
      return null
    }
  }

  // Clean up function to clear all intervals
  const cleanup = () => {
    Object.values(syncIntervals.value).forEach(intervalId => {
      clearInterval(intervalId)
    })
    syncIntervals.value = {}
  }

  // Call cleanup when the store is destroyed
  onUnmounted(() => {
    cleanup()
  })

  return {
    integrations,
    loading,
    error,
    syncStats,
    success,
    fetchIntegrations,
    connectGoogleSheets,
    fetchSheetData,
    updateLastSync,
    handleSync,
    deleteIntegration,
    cleanup
  }
})