import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { readSpreadsheet } from '../lib/sheets'
import { useProductStore } from './products'
import { useOrderStore } from './orders'
import { useAuthStore } from './auth'

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
}

interface ConnectOptions {
  spreadsheetId: string
  sheetName: string
  userId?: number
}

export const useIntegrationStore = defineStore('integration', () => {
  const integrations = ref<Integration[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const syncIntervals = ref<{ [key: number]: NodeJS.Timer }>({})
  const syncStats = ref<SyncStats>({
    total: 0,
    new: 0,
    skipped: 0,
    skippedSkus: [],
    skippedExistingOrders: 0
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

  const fetchSheetData = async (integration: Integration): Promise<SheetData[]> => {
    try {
      const rows = await readSpreadsheet(integration.spreadsheet_id, integration.sheet_name)
      return rows.map(row => ({
        orderId: row['Order ID (A)']?.toString() || '',
        customerName: row['Customer Name (B)']?.toString() || '',
        phone: row['Phone Number (C)']?.toString().replace(/[^0-9+]/g, '') || '',
        address: row['Address (D)']?.toString() || '',
        city: row['City (E)']?.toString() || '',
        productName: row['Product Name (F)']?.toString() || '',
        sku: row['SKU (G)']?.toString() || '',
        quantity: parseInt(row['Quantity (H)']?.toString() || '1'),
        price: parseFloat(row['Price (I)']?.toString() || '0'),
        totalAmount: parseFloat(row['Total Amount (J)']?.toString() || '0')
      }))
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

  const handleSync = async (integration: Integration) => {
    try {
      loading.value = true
      error.value = null
      syncStats.value = {
        total: 0,
        new: 0,
        skipped: 0,
        skippedSkus: [],
        skippedExistingOrders: 0
      }

      // Read spreadsheet data
      const sheetData = await fetchSheetData(integration)
      syncStats.value.total = sheetData.length
      console.log('Sheet data:', sheetData)

      // Get product store
      const productStore = useProductStore()
      await productStore.fetchProducts()

      // Get existing orders for duplicate check
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('phone')
        .eq('user_id', integration.user_id)

      // Process each row
      for (const row of sheetData) {
        try {
          // Skip empty rows
          if (!row.phone || !row.customerName || !row.sku) {
            console.log('Skipping empty row:', row)
            syncStats.value.skipped++
            continue
          }

          // Clean phone number
          const cleanPhone = row.phone.replace(/[^0-9+]/g, '')

          // Find matching product by SKU
          const product = productStore.products.find(p => 
            p.sku?.toLowerCase() === row.sku.toLowerCase()
          )

          if (!product) {
            console.log('Product not found for SKU:', row.sku)
            syncStats.value.skipped++
            if (!syncStats.value.skippedSkus.includes(row.sku)) {
              syncStats.value.skippedSkus.push(row.sku)
            }
            continue
          }

          // Check for duplicate based on phone number only
          const isDuplicate = existingOrders?.some(order => 
            order.phone === cleanPhone
          )

          if (isDuplicate) {
            console.log('Duplicate found for phone:', cleanPhone)
            syncStats.value.skippedExistingOrders++
            continue
          }

          // Insert new order
          const { error: insertError } = await supabase
            .from('orders')
            .insert([
              {
                user_id: integration.user_id,
                product_id: product.id,
                customer_name: row.customerName.trim(),
                phone: cleanPhone,
                shipping_address: row.city ? `${row.address.trim()}, ${row.city.trim()}` : row.address.trim(),
                quantity: row.quantity || 1,
                unit_price: product.price,
                total_amount: row.totalAmount || (product.price * (row.quantity || 1)),
                status: 1, // NEW status
                info: ''
              }
            ])

          if (insertError) {
            console.error('Insert error:', insertError)
            throw insertError
          }
          console.log('Successfully inserted order for:', row.customerName)
          syncStats.value.new++
        } catch (err) {
          console.error('Error processing row:', err)
          syncStats.value.skipped++
        }
      }

      // Update last sync timestamp
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id)

      if (updateError) throw updateError

      success.value = `Sync completed!\nNew Orders: ${syncStats.value.new}\nSkipped: ${syncStats.value.skipped}`
      return syncStats.value
    } catch (err: any) {
      error.value = err.message
      console.error('Error during sync:', err)
      throw err
    } finally {
      loading.value = false
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