import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface Product {
  id: string
  user_id: number
  name: string
  description: string | null
  price: number
  sku: string | null
  stock: number
  product_link: string | null
  video_link: string | null
  created_at: string
  updated_at: string
}

export const useProductStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProducts = async () => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err

      products.value = data
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching products:', err)
    } finally {
      loading.value = false
    }
  }

  const addProduct = async (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      loading.value = true
      error.value = null

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .single()

      if (!userData) throw new Error('User not found')

      const { data, error: err } = await supabase
        .from('products')
        .insert([
          {
            ...product,
            user_id: userData.id
          }
        ])
        .select()
        .single()

      if (err) throw err

      products.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error adding product:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      const index = products.value.findIndex(p => p.id === id)
      if (index !== -1) {
        products.value[index] = data
      }

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating product:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const { error: err } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (err) throw err

      products.value = products.value.filter(p => p.id !== id)
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting product:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  }
})