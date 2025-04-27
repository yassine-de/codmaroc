<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { WakilniService, WAKILNI_STATUS_LABELS } from '../lib/wakilni'
import type { Order } from '../stores/orders'

// Wakilni Service initialisieren
const wakilniService = new WakilniService({
  key: "fgpdVPA7pU",
  secret: "N1IpMmCUn4CIqckrvTqmDznbZPlSaf3lww1"
})

const orders = ref<Order[]>([])
const loading = ref(false)
const error = ref('')
const selectedOrders = ref<number[]>([])

// Orders laden die confirmed sind aber noch keine wakilni_id haben
const loadOrders = async () => {
  try {
    loading.value = true
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, product:products(*)')
      .eq('status', 11) // CONFIRMED
      .is('wakilni_id', null)
    
    if (err) throw err
    orders.value = data || []
  } catch (err) {
    console.error('Error loading orders:', err)
    error.value = 'Fehler beim Laden der Bestellungen'
  } finally {
    loading.value = false
  }
}

// Checkbox Handler
const handleSelect = (orderId: number) => {
  const index = selectedOrders.value.indexOf(orderId)
  if (index === -1) {
    selectedOrders.value.push(orderId)
  } else {
    selectedOrders.value.splice(index, 1)
  }
}

// Select All Handler
const handleSelectAll = (event: Event) => {
  const checkbox = event.target as HTMLInputElement
  if (checkbox.checked) {
    selectedOrders.value = orders.value.map(order => order.id)
  } else {
    selectedOrders.value = []
  }
}

// Send to Wakilni Handler
const sendToWakilni = async () => {
  if (selectedOrders.value.length === 0) {
    error.value = 'Bitte wählen Sie mindestens eine Bestellung aus'
    return
  }

  try {
    loading.value = true
    error.value = ''
    
    // Ausgewählte Orders finden
    const selectedOrdersData = orders.value.filter(order => 
      selectedOrders.value.includes(order.id)
    )

    // Orders nacheinander an Wakilni senden
    for (const order of selectedOrdersData) {
      try {
        // Order für Wakilni vorbereiten
        const wakilniOrder = {
          customer_name: order.customer_name,
          phone: order.phone,
          address: order.shipping_address,
          city: order.city || 'Beirut', // Fallback wenn keine Stadt angegeben
          items: [{
            name: order.product?.name || 'Unknown Product',
            quantity: order.quantity,
            price: order.total_amount / order.quantity, // Einzelpreis berechnen
            sku: order.product?.sku
          }],
          total_amount: order.total_amount,
          reference_id: order.id.toString(),
          notes: order.notes || undefined
        }

        // Order an Wakilni senden
        const response = await wakilniService.createOrder(wakilniOrder)
        
        if (!response.success || !response.data?.tracking_id) {
          throw new Error(response.message || 'Keine Tracking ID erhalten')
        }

        // Order in der Datenbank aktualisieren
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            wakilni_id: response.data.id,
            tracking_id: response.data.tracking_id,
            wakilni_status: 1, // PENDING
            last_checked_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (updateError) throw updateError

      } catch (err) {
        console.error(`Error processing order ${order.id}:`, err)
        error.value = `Fehler bei Bestellung ${order.id}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
        return // Bei einem Fehler abbrechen
      }
    }

    // Nach erfolgreichem Senden neu laden
    await loadOrders()
    selectedOrders.value = []
    
  } catch (err) {
    console.error('Error sending orders to Wakilni:', err)
    error.value = 'Fehler beim Senden der Bestellungen an Wakilni'
  } finally {
    loading.value = false
  }
}

const isError = (message: string) => {
  return message.toLowerCase().includes('error') || 
         message.toLowerCase().includes('fehler') ||
         message.toLowerCase().includes('failed');
}

const getMessageClass = (message: string) => {
  return {
    'text-red-500': isError(message),
    'text-green-500': !isError(message)
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Wakilni Status</h1>
      <button
        @click="sendToWakilni"
        :disabled="selectedOrders.length === 0 || loading"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Sending...' : `Send to Wakilni (${selectedOrders.length})` }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded">
      {{ error }}
    </div>

    <div class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                @change="handleSelectAll"
                :checked="selectedOrders.length === orders.length && orders.length > 0"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Address
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                :value="order.id"
                v-model="selectedOrders"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ order.id }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ order.customer_name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ order.phone }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ order.shipping_address }}
              <span v-if="order.city" class="text-gray-500">({{ order.city }})</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                class="px-2 py-1 rounded text-sm"
                :class="{
                  'bg-yellow-100 text-yellow-800': order.wakilni_status === 1,
                  'bg-blue-100 text-blue-800': order.wakilni_status === 2 || order.wakilni_status === 3,
                  'bg-green-100 text-green-800': order.wakilni_status === 4,
                  'bg-red-100 text-red-800': order.wakilni_status ? [5,6,7,8].includes(order.wakilni_status) : false,
                  'bg-gray-100 text-gray-800': order.wakilni_status === 9 || order.wakilni_status === 10
                }"
              >
                {{ order.wakilni_status && WAKILNI_STATUS_LABELS[order.wakilni_status] || 'Not Sent' }}
              </span>
            </td>
          </tr>
          <tr v-if="orders.length === 0">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              Keine Bestellungen gefunden
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>