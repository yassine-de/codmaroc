<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Leads</h1>
      <button 
        @click="exportToExcel"
        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        <i class="fas fa-file-excel mr-2"></i>
        Export to Excel
      </button>
    </div>

    <div class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller Name</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="lead in leads" :key="lead.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.orderId }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.customerName }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.productName }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.quantity }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.totalAmount }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.status }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.createdAt }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.seller }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orders'
import XLSX from 'xlsx'

const orderStore = useOrderStore()
const leads = ref<any[]>([])

onMounted(async () => {
  console.log('Component mounted')
  await orderStore.fetchOrders()
  console.log('Orders fetched')
  leads.value = orderStore.orders
  console.log('Orders assigned to leads:', leads.value)
  
  if (leads.value.length > 0) {
    console.log('Beispiel für ersten Eintrag:', leads.value[0])
  } else {
    console.log('Keine Daten geladen')
  }
})

const exportToExcel = () => {
  console.log('Export-Funktion gestartet')
  
  const headers = [
    'CUSTOMER',
    'City',
    'Adress',
    'Total Price',
    'SKU',
    'ORDER ID',
    'Quantity',
    'Product Name',
    'SKU',
    'Seller'
  ]
  
  console.log('Headers definiert:', headers)
  console.log('Verfügbare Daten:', leads.value)
  
  const data = leads.value.map(lead => {
    console.log('Verarbeite Lead:', lead)
    return [
      lead.customerName || '',
      lead.city || '',
      lead.shippingAddress || '',
      lead.totalAmount || 0,
      lead.sku || '',
      lead.orderId || '',
      lead.quantity || 1,
      lead.productName || '',
      lead.sku || '',
      lead.seller || ''
    ]
  })
  
  console.log('Aufbereitete Daten:', data)
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
  
  console.log('Excel-Datei wird erstellt...')
  XLSX.writeFile(workbook, `leads_${new Date().toISOString().split('T')[0]}.xlsx`)
  console.log('Excel-Datei wurde erstellt und gespeichert')
}
</script> 