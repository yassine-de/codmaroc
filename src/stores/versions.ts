import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useProductStore } from './products'
import { useOrderStore } from './orders'

export interface Version {
  id: string
  user_id: number
  name: string
  description: string | null
  created_at: string
  data: {
    products: any[]
    orders: any[]
  }
}

export const useVersionStore = defineStore('versions', () => {
  const versions = ref<Version[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchVersions = async () => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('versions')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      versions.value = data
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching versions:', err)
    } finally {
      loading.value = false
    }
  }

  const createVersion = async (name: string, description?: string) => {
    try {
      loading.value = true
      error.value = null

      const productStore = useProductStore()
      const orderStore = useOrderStore()

      // Get current user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .single()

      if (!userData) throw new Error('User not found')

      // Create snapshot of current data
      const snapshot = {
        products: productStore.products,
        orders: orderStore.orders
      }

      const { data, error: err } = await supabase
        .from('versions')
        .insert([
          {
            user_id: userData.id,
            name,
            description,
            data: snapshot
          }
        ])
        .select()
        .single()

      if (err) throw err

      versions.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating version:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const restoreVersion = async (versionId: string) => {
    try {
      loading.value = true
      error.value = null

      const { data: version, error: err } = await supabase
        .from('versions')
        .select('*')
        .eq('id', versionId)
        .single()

      if (err) throw err

      const productStore = useProductStore()
      const orderStore = useOrderStore()

      // Clear existing data
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('orders').delete().neq('id', 0)

      // Restore products
      for (const product of version.data.products) {
        await productStore.addProduct({
          name: product.name,
          description: product.description,
          price: product.price,
          sku: product.sku,
          stock: product.stock,
          product_link: product.product_link,
          video_link: product.video_link
        })
      }

      // Restore orders
      for (const order of version.data.orders) {
        await orderStore.addOrder({
          product_id: order.product_id,
          customer_name: order.customer_name,
          phone: order.phone,
          shipping_address: order.shipping_address,
          quantity: order.quantity,
          notes: order.notes
        })
      }

      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error restoring version:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteVersion = async (versionId: string) => {
    try {
      loading.value = true
      error.value = null

      const { error: err } = await supabase
        .from('versions')
        .delete()
        .eq('id', versionId)

      if (err) throw err

      versions.value = versions.value.filter(v => v.id !== versionId)
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting version:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    versions,
    loading,
    error,
    fetchVersions,
    createVersion,
    restoreVersion,
    deleteVersion
  }
})