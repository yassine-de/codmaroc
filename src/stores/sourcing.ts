import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface SourcingRequest {
  id: string
  user_id: number
  sourcing_id: number
  product_name: string
  product_code: string
  product_link: string
  video_link: string
  quantity: number
  status: 'Pending' | 'Approved' | 'Processing' | 'Completed' | 'Canceled'
  note: string
  created_at: string
}

export const useSourcingStore = defineStore('sourcing', () => {
  const requests = ref<SourcingRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchRequests = async () => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('sourcing_requests')
        .select('*')
        .order('sourcing_id', { ascending: false })

      if (err) throw err
      requests.value = data
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching sourcing requests:', err)
    } finally {
      loading.value = false
    }
  }

  const addRequest = async (request: Omit<SourcingRequest, 'id' | 'user_id' | 'sourcing_id' | 'created_at'>) => {
    try {
      loading.value = true
      error.value = null

      // Get current user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .single()

      if (!userData) throw new Error('User not found')

      const { data, error: err } = await supabase
        .from('sourcing_requests')
        .insert([
          {
            user_id: userData.id,
            product_name: request.product_name,
            product_code: request.product_code,
            product_link: request.product_link,
            video_link: request.video_link,
            quantity: request.quantity,
            status: request.status,
            note: request.note
          }
        ])
        .select()
        .single()

      if (err) throw err

      requests.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error adding sourcing request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRequest = async (id: string, updates: Partial<SourcingRequest>) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('sourcing_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = data
      }

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating sourcing request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRequest = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const { error: err } = await supabase
        .from('sourcing_requests')
        .delete()
        .eq('id', id)

      if (err) throw err

      requests.value = requests.value.filter(r => r.id !== id)
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting sourcing request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    requests,
    loading,
    error,
    fetchRequests,
    addRequest,
    updateRequest,
    deleteRequest
  }
})