import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useIntegrationStore } from './integration'

export interface Webhook {
  id: string
  integration_id: number
  secret_key: string
  enabled: boolean
  last_triggered_at: string | null
  created_at: string
}

export const useWebhookStore = defineStore('webhooks', () => {
  const webhooks = ref<Webhook[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchWebhooks = async () => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      webhooks.value = data
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching webhooks:', err)
    } finally {
      loading.value = false
    }
  }

  const createWebhook = async (integrationId: number) => {
    try {
      loading.value = true
      error.value = null

      // Generate a random secret key
      const secretKey = crypto.randomUUID()

      const { data, error: err } = await supabase
        .from('webhooks')
        .insert([
          {
            integration_id: integrationId,
            secret_key: secretKey,
            enabled: true
          }
        ])
        .select()
        .single()

      if (err) throw err

      webhooks.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating webhook:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleWebhook = async (webhookId: string, enabled: boolean) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('webhooks')
        .update({ enabled })
        .eq('id', webhookId)
        .select()
        .single()

      if (err) throw err

      const index = webhooks.value.findIndex(w => w.id === webhookId)
      if (index !== -1) {
        webhooks.value[index] = data
      }

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error toggling webhook:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    try {
      loading.value = true
      error.value = null

      const { error: err } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId)

      if (err) throw err

      webhooks.value = webhooks.value.filter(w => w.id !== webhookId)
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting webhook:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const handleWebhookTrigger = async (webhookId: string, secretKey: string) => {
    try {
      // Find the webhook
      const webhook = webhooks.value.find(w => w.id === webhookId)
      if (!webhook) throw new Error('Webhook not found')
      if (!webhook.enabled) throw new Error('Webhook is disabled')
      if (webhook.secret_key !== secretKey) throw new Error('Invalid secret key')

      // Update last triggered timestamp
      await supabase
        .from('webhooks')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', webhookId)

      // Trigger sync for the integration
      const integrationStore = useIntegrationStore()
      const integration = integrationStore.integrations.find(i => i.id === webhook.integration_id)
      if (!integration) throw new Error('Integration not found')

      await integrationStore.handleSync(integration)
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error handling webhook trigger:', err)
      throw err
    }
  }

  return {
    webhooks,
    loading,
    error,
    fetchWebhooks,
    createWebhook,
    toggleWebhook,
    deleteWebhook,
    handleWebhookTrigger
  }
})