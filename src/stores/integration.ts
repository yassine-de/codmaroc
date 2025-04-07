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
  const integrations = ref<Integration[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
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

  const fetchSheetData = async (integration: Integration): Promise<SheetData[]> => {
    try {
      const rows = await readSpreadsheet(integration.spreadsheet_id, integration.sheet_name)
      return rows.map(row => {
        // Konvertiere die Telefonnummer zuerst
        const rawPhone = row['Phone Number (C)']?.toString() || ''
        // Entferne zuerst alle Leerzeichen, dann konvertiere arabische Zahlen
        const phoneWithoutSpaces = rawPhone.replace(/\s+/g, '')
        const convertedPhone = convertArabicToLatinNumbers(phoneWithoutSpaces)

        // Konvertiere Preise
        const rawPrice = row['Price (I)']?.toString() || '0'
        console.log('Raw price:', rawPrice)
        const convertedPrice = Number(convertArabicToLatinNumbers(rawPrice).replace(',', '.'))
        console.log('Converted price:', convertedPrice)

        const quantity = parseInt(convertArabicToLatinNumbers(row['Quantity (H)']?.toString() || '1'))
        const total = convertedPrice * quantity

        return {
          orderId: convertArabicToLatinNumbers(row['Order ID (A)']?.toString() || ''),
          customerName: row['Customer Name (B)']?.toString() || '',
          phone: convertedPhone,
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

  const handleSync = async (integration: Integration) => {
    try {
      loading.value = true
      error.value = null

      // Reset sync stats
      syncStats.value = {
        total: 0,
        new: 0,
        skipped: 0,
        skippedSkus: [],
        skippedExistingOrders: 0,
        invalidData: []
      }

      // Read data from sheet
      const sheetData = await fetchSheetData(integration)
      syncStats.value.total = sheetData.length

      // Debug log: Show all data for analysis
      console.log('Sheet data total rows:', sheetData.length)
      
      // Get products from store
      const productStore = useProductStore()
      await productStore.fetchProducts()

      // Get existing orders for duplicate check
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('phone')
      
      const existingPhones = existingOrders?.map(order => order.phone.replace(/[^0-9+]/g, '')) || []
      console.log('Existing phone numbers in DB:', existingPhones.length)
      
      // Process each row
      const orderPromises = sheetData.map(async (row, index) => {
        try {
          // Clean phone number and handle different formats
          let cleanPhone = row.phone.trim()
          
          // If number starts with 961 but no +, add the +
          if (cleanPhone.startsWith('961') && !cleanPhone.startsWith('+')) {
            cleanPhone = '+' + cleanPhone
          }
          
          // Remove any remaining spaces or special characters except + and numbers
          cleanPhone = cleanPhone.replace(/[^0-9+]/g, '')

          if (!cleanPhone || !row.customerName) {
            const reason = !cleanPhone ? 'Fehlende Telefonnummer' : 'Fehlender Kundenname'
            syncStats.value.skipped++
            syncStats.value.invalidData.push({
              row: index + 1,
              reason,
              data: {
                name: row.customerName || '-',
                phone: row.phone || '-',
                sku: row.sku || '-'
              }
            })
            return
          }

          // Skip if duplicate (phone already exists)
          if (existingPhones.includes(cleanPhone)) {
            console.log(`Row ${index + 1} skipped: Phone already exists`, { phone: cleanPhone });
            syncStats.value.skipped++
            syncStats.value.skippedExistingOrders++
            return
          }
          
          // Skip if missing SKU
          if (!row.sku) {
            console.log(`Row ${index + 1} skipped: Missing SKU`);
            syncStats.value.skipped++;
            syncStats.value.invalidData.push({
              row: index + 1,
              reason: 'Fehlende SKU',
              data: {
                name: row.customerName || '-',
                phone: row.phone || '-',
                sku: '-'
              }
            });
            syncStats.value.skippedSkus.push('empty')
            return
          }
          
          // Find product by SKU
          const product = productStore.products.find(
            p => p.sku?.toLowerCase().trim() === row.sku?.toLowerCase().trim()
          )
        
        if (!product) {
            console.log(`Row ${index + 1} skipped: Product not found for SKU`, { sku: row.sku });
          syncStats.value.skipped++
            syncStats.value.skippedSkus.push(row.sku || 'unknown')
            return
          }
          
          // Insert new order
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', useAuthStore().user?.id)
            .single()

          if (!userData) {
            console.error(`Row ${index + 1} error: User not found`);
            syncStats.value.skipped++;
            syncStats.value.invalidData.push({
              row: index + 1,
              reason: 'Benutzer nicht gefunden',
              data: {
                name: row.customerName || '-',
                phone: row.phone || '-',
                sku: row.sku || '-'
              }
            });
            return;
          }

          const { data, error: insertError } = await supabase
            .from('orders')
            .insert([
              {
                user_id: userData.id,
                customer_name: row.customerName.trim(),
                phone: cleanPhone,
                shipping_address: row.address,
                city: row.city,
                status: 1,
                product_id: product.id,
                quantity: row.quantity || 1,
                total_amount: row.price * (row.quantity || 1),
                unit_price: row.price
              }
            ])
            .select()
            .single()
          
          if (insertError) {
            console.error(`Row ${index + 1} error inserting order:`, insertError);
            syncStats.value.skipped++;
            syncStats.value.invalidData.push({
              row: index + 1,
              reason: 'Datenbankfehler: ' + insertError.message,
              data: {
                name: row.customerName || '-',
                phone: row.phone || '-',
                sku: row.sku || '-'
              }
            });
            return
          }
          
          console.log(`Row ${index + 1} successfully inserted for customer:`, row.customerName);
          syncStats.value.new++
        } catch (error) {
          console.error(`Row ${index + 1} processing error:`, error);
          syncStats.value.skipped++;
          syncStats.value.invalidData.push({
            row: index + 1,
            reason: 'Fehler bei der Verarbeitung',
            data: {
              name: row.customerName || '-',
              phone: row.phone || '-',
              sku: row.sku || '-'
            }
          });
        }
      })
      
      // Wait for all promises to resolve
      await Promise.all(orderPromises)
      
      // Update the last sync timestamp
      await updateLastSync(integration.id)

      // Log final stats for debugging
      console.log('Sync stats:', {
        total: syncStats.value.total,
        new: syncStats.value.new,
        skipped: syncStats.value.skipped,
        skippedExisting: syncStats.value.skippedExistingOrders,
        skippedProducts: syncStats.value.skippedSkus.length,
        invalidData: syncStats.value.invalidData.length,
        unexplainedSkips: syncStats.value.skipped - syncStats.value.skippedExistingOrders - syncStats.value.skippedSkus.length
      });
      
      // Return stats
      return syncStats.value
      
    } catch (err: any) {
      error.value = err.message
      console.error('Error syncing with Google Sheets:', err)
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