import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface Order {
  id: number
  user_id: number
  seller_name: string
  total_amount: number
  unit_price: number
  status: number
  shipping_address: string
  phone: string
  notes: string | null
  info: string | null
  created_at: string
  updated_at: string
  product_name: string
  customer_name: string
  quantity: number
  product_id: string
}

export interface NewOrder {
  product_id: string
  customer_name: string
  phone: string
  shipping_address: string
  quantity: number
  notes?: string
  info?: string
  price?: number  // Optional price from Google Sheet
}

export const ORDER_STATUS = {
  NEW: 1,
  NO_REPLY1: 2,
  NO_REPLY2: 3,
  NO_REPLY3: 4,
  NO_REPLY4: 5,
  NO_REPLY5: 6,
  NO_REPLY6: 7,
  NO_REPLY7: 8,
  NO_REPLY8: 9,
  NO_REPLY9: 10,
  CONFIRMED: 11,
  CANCELED: 12,
  WRONG_NUMBER: 13,
  REPORTED: 14,
  DOUBLE: 15,
  SHIPPED: 16,
  DELIVERED: 17
}

export const ORDER_STATUS_LABELS: Record<number, string> = {
  [ORDER_STATUS.NEW]: 'New',
  [ORDER_STATUS.NO_REPLY1]: 'No Reply1',
  [ORDER_STATUS.NO_REPLY2]: 'No Reply2',
  [ORDER_STATUS.NO_REPLY3]: 'No Reply3',
  [ORDER_STATUS.NO_REPLY4]: 'No Reply4',
  [ORDER_STATUS.NO_REPLY5]: 'No Reply5',
  [ORDER_STATUS.NO_REPLY6]: 'No Reply6',
  [ORDER_STATUS.NO_REPLY7]: 'No Reply7',
  [ORDER_STATUS.NO_REPLY8]: 'No Reply8',
  [ORDER_STATUS.NO_REPLY9]: 'No Reply9',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.CANCELED]: 'Canceled',
  [ORDER_STATUS.WRONG_NUMBER]: 'Wrong number',
  [ORDER_STATUS.REPORTED]: 'Reported',
  [ORDER_STATUS.DOUBLE]: 'Double',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered'
}

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchOrders = async () => {
    try {
      loading.value = true
      error.value = null

      // Get current user's data
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      // Get user role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', authUser.id)
        .single()

      if (userError) throw userError

      // Build query based on user role
      let query = supabase
        .from('orders')
        .select(`
          *,
          products:product_id (name),
          users:user_id (name, email)
        `)

      // If user is not admin or staff, only fetch their own orders
      if (userData.role === 3) { // Seller role
        const { data: sellerData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .single()

        if (sellerData) {
          query = query.eq('user_id', sellerData.id)
        }
      }

      const { data, error: err } = await query.order('created_at', { ascending: false })

      if (err) throw err

      orders.value = data.map(order => ({
        ...order,
        product_name: order.products?.name || 'Unknown Product',
        seller_name: order.users?.name || order.users?.email || `Seller ${order.user_id}`
      }))
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching orders:', err)
    } finally {
      loading.value = false
    }
  }

  const addOrder = async (newOrder: NewOrder) => {
    try {
      loading.value = true
      error.value = null

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .single()

      if (!userData) throw new Error('User not found')

      let total_amount: number
      let unit_price: number

      // Ensure price is a number
      const sheetPrice = typeof newOrder.price === 'string' ? parseFloat(newOrder.price) : newOrder.price

      if (sheetPrice !== undefined && sheetPrice !== null && !isNaN(sheetPrice)) {
        // Use price from Google Sheet if provided and valid
        unit_price = sheetPrice
        total_amount = unit_price * newOrder.quantity
        console.log('Using sheet price:', { unit_price, total_amount })
      } else {
        // Fallback to product price from database
        const { data: productData } = await supabase
          .from('products')
          .select('price')
          .eq('id', newOrder.product_id)
          .single()

        if (!productData) throw new Error('Product not found')
        unit_price = productData.price
        total_amount = unit_price * newOrder.quantity
        console.log('Using database price:', { unit_price, total_amount })
      }

      const orderToInsert = {
        user_id: userData.id,
        product_id: newOrder.product_id,
        customer_name: newOrder.customer_name,
        phone: newOrder.phone,
        shipping_address: newOrder.shipping_address,
        quantity: newOrder.quantity,
        total_amount,
        unit_price,
        info: newOrder.info,
        status: ORDER_STATUS.NEW
      }

      const { data, error: err } = await supabase
        .from('orders')
        .insert([orderToInsert])
        .select(`
          *,
          products:product_id (name),
          users:user_id (name, email)
        `)
        .single()

      if (err) throw err

      orders.value.unshift({
        ...data,
        product_name: data.products?.name || 'Unknown Product',
        seller_name: data.users?.name || data.users?.email || `Seller ${data.user_id}`
      })

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error adding order:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateOrder = async (orderId: number, updates: Partial<Order>) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select(`
          *,
          products:product_id (name),
          users:user_id (name, email)
        `)
        .single()

      if (err) throw err

      const index = orders.value.findIndex(o => o.id === orderId)
      if (index !== -1) {
        orders.value[index] = {
          ...data,
          product_name: data.products?.name || 'Unknown Product',
          seller_name: data.users?.name || data.users?.email || `Seller ${data.user_id}`
        }
      }

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating order:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateOrderStatus = async (orderId: number, status: number) => {
    return updateOrder(orderId, { status })
  }

  const deleteOrder = async (orderId: number) => {
    try {
      loading.value = true
      error.value = null

      const { error: err } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (err) throw err

      orders.value = orders.value.filter(o => o.id !== orderId)
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting order:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    loading,
    error,
    fetchOrders,
    addOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder
  }
})