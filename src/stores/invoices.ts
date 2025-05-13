import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

export interface InvoiceFee {
  name: string
  amount: number
}

export interface Invoice {
  id: string
  user_id: number
  invoice_number: string
  status: 'Paid' | 'Unpaid'
  total_amount: number
  shipping_fees: number
  cod_fees: number
  net_payment: number
  factorisation_fees: InvoiceFee[]
  payment_proof?: string
  created_at: string
  paid_at?: string
  user?: {
    name: string
    email: string
  }
  orders?: Array<{
    id: number
    quantity: number
    crbt: number
    total_amount: number
    product: {
      name: string
    }
  }>
}

export interface InvoiceStats {
  total: {
    count: number
    amount: number
  }
  paid: {
    count: number
    amount: number
  }
  unpaid: {
    count: number
    amount: number
  }
  fees: {
    total: number
    cod: number
    shipping: number
    factorisation: number
  }
}

export const useInvoiceStore = defineStore('invoices', () => {
  const authStore = useAuthStore()
  const invoices = ref<Invoice[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)
  const stats = ref<InvoiceStats>({
    total: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
    fees: {
      total: 0,
      cod: 0,
      shipping: 0,
      factorisation: 0
    }
  })

  const isAdmin = computed(() => authStore.user?.role === 1)

  const fetchInvoices = async () => {
    try {
      loading.value = true
      error.value = null

      let query = supabase
        .from('invoices')
        .select(`
          *,
          user:user_id (
            name,
            email
          ),
          orders!orders_invoice_id_fkey (
            id,
            quantity,
            crbt,
            total_amount,
            product:product_id (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      // If not admin, only fetch own invoices
      if (!isAdmin.value) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authStore.user?.id)
          .single()

        if (userData) {
          query = query.eq('user_id', userData.id)
        }
      }

      const { data, error: err } = await query

      if (err) throw err

      invoices.value = data || []
      calculateStats()
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching invoices:', err)
    } finally {
      loading.value = false
    }
  }

  const calculateStats = () => {
    const newStats: InvoiceStats = {
      total: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      unpaid: { count: 0, amount: 0 },
      fees: {
        total: 0,
        cod: 0,
        shipping: 0,
        factorisation: 0
      }
    }

    invoices.value.forEach(invoice => {
      // Update total stats
      newStats.total.count++
      newStats.total.amount += invoice.total_amount

      // Update paid/unpaid stats
      if (invoice.status === 'Paid') {
        newStats.paid.count++
        newStats.paid.amount += invoice.total_amount
      } else {
        newStats.unpaid.count++
        newStats.unpaid.amount += invoice.total_amount
      }

      // Update fees
      newStats.fees.cod += invoice.cod_fees
      newStats.fees.shipping += invoice.shipping_fees
      newStats.fees.factorisation += invoice.factorisation_fees.reduce(
        (sum, fee) => sum + fee.amount,
        0
      )
    })

    // Calculate total fees
    newStats.fees.total = 
      newStats.fees.cod + 
      newStats.fees.shipping + 
      newStats.fees.factorisation

    stats.value = newStats
  }

  const createInvoice = async () => {
    try {
      loading.value = true
      error.value = ''
      success.value = ''

      // Get delivered orders for the current user, die älter als 10 Tage sind
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          user:users(*)
        `)
        .eq('status', 'Delivered')
        .eq('invoice_id', null)
        .eq('user_id', authStore.user?.id)
        .lt('created_at', tenDaysAgo.toISOString());

      if (ordersError) throw ordersError

      if (!orders || orders.length === 0) {
        success.value = 'No orders to invoice'
        return
      }

      // Calculate total revenue and fees
      const totalCRBT = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const shippingFees = orders.length * 9 // $9 per order
      const codFees = totalCRBT * 0.05 // 5% of total amount
      const netPayment = totalCRBT - shippingFees - codFees

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: authStore.user?.id,
          invoice_number: invoiceNumber,
          status: 'Unpaid',
          total_amount: totalCRBT,
          shipping_fees: shippingFees,
          cod_fees: codFees,
          net_payment: netPayment,
          factorisation_fees: []
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Update orders with invoice_id
      const { error: updateError } = await supabase
        .from('orders')
        .update({ invoice_id: invoice.id })
        .in('id', orders.map(o => o.id))

      if (updateError) throw updateError

      // Refresh invoices list
      await fetchInvoices()

      // Set detailed success message
      success.value = `Created invoice:\n` +
        `Orders: ${orders.length}\n` +
        `Order amounts: ${orders.map(o => o.total_amount).join(', ')}\n` +
        `Total amount: ${totalCRBT}$\n` +
        `Shipping fees: ${shippingFees}$\n` +
        `COD fees: ${codFees}$\n` +
        `Net payment: ${netPayment}$`

    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: 'Paid' | 'Unpaid') => {
    try {
      loading.value = true
      error.value = null

      const updates: any = {
        status,
        paid_at: status === 'Paid' ? new Date().toISOString() : null
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // If marked as paid, update related orders
      if (status === 'Paid') {
        const { error: ordersError } = await supabase
          .from('orders')
          .update({ paid: true })
          .eq('invoice_id', invoiceId)

        if (ordersError) throw ordersError
      }

      await fetchInvoices()
      return invoice
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating invoice status:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFactorisationFees = async (invoiceId: string, fees: InvoiceFee[]) => {
    try {
      loading.value = true
      error.value = null

      const { data: invoice, error: err } = await supabase
        .from('invoices')
        .update({
          factorisation_fees: fees
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (err) throw err

      await fetchInvoices()
      return invoice
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating factorisation fees:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const uploadPaymentProof = async (invoiceId: string, file: File) => {
    try {
      loading.value = true
      error.value = null

      // Upload file to Supabase Storage
      const fileName = `payment-proofs/${invoiceId}/${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)

      // Update invoice with payment proof URL
      const { data: invoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          payment_proof: publicUrl
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchInvoices()
      return invoice
    } catch (err: any) {
      error.value = err.message
      console.error('Error uploading payment proof:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteInvoice = async (invoiceId: string) => {
    try {
      loading.value = true
      error.value = null

      // First, update all orders to remove invoice_id
      const { error: updateError } = await supabase
        .from('orders')
        .update({ invoice_id: null })
        .eq('invoice_id', invoiceId)

      if (updateError) throw updateError

      // Then delete the invoice
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (deleteError) throw deleteError

      // Refresh the invoices list
      await fetchInvoices()
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting invoice:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    invoices,
    loading,
    error,
    success,
    stats,
    isAdmin,
    fetchInvoices,
    createInvoice,
    updateInvoiceStatus,
    updateFactorisationFees,
    uploadPaymentProof,
    deleteInvoice
  }
})