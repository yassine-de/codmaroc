<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useOrderStore, ORDER_STATUS, ORDER_STATUS_LABELS, type Order } from '../stores/orders'
import { useAuthStore } from '../stores/auth'
import { useIntegrationStore } from '../stores/integration'
import { useProductStore } from '../stores/products'
import { exportToExcel, exportToCSV } from '../lib/export'
import { supabase } from '../lib/supabase'
import cityList from '../assets/city.txt?raw'

const orderStore = useOrderStore()
const authStore = useAuthStore()
const integrationStore = useIntegrationStore()
const productStore = useProductStore()
const searchQuery = ref('')
const itemsPerPage = ref(10)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingOrder = ref<Order | null>(null)
const showExportDropdown = ref(false)
const syncing = ref(false)
const success = ref('')
const error = ref('')
const selectedOrders = ref<number[]>([])

// Filters
const statusFilter = ref('All')
const productFilter = ref('All')
const sellerFilter = ref('All')
const startDate = ref('')
const endDate = ref('')

const newOrder = ref({
  product_id: '',
  customer_name: '',
  phone: '',
  shipping_address: '',
  quantity: 1,
  info: ''
})

const cities = ref(cityList.split('\n').filter(city => city.trim()))
const citySearchQuery = ref('')
const showCityDropdown = ref(false)
const selectedCity = ref('')

const isAdmin = computed(() => {
  return authStore.user?.role === 1
})

const isStaffOrAdmin = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 1 || userRole === 2 // 1 for admin, 2 for staff
})

// Get unique sellers for filter
const sellers = computed(() => {
  const uniqueSellers = new Map()
  orderStore.orders.forEach(order => {
    if (!uniqueSellers.has(order.user_id)) {
      uniqueSellers.set(order.user_id, {
        id: order.user_id,
        name: order.seller_name
      })
    }
  })
  return Array.from(uniqueSellers.values())
})

// Filter orders based on selected filters
const filteredOrders = computed(() => {
  let filtered = [...orderStore.orders]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order => 
      order.customer_name.toLowerCase().includes(query) ||
      order.phone.toLowerCase().includes(query) ||
      order.shipping_address.toLowerCase().includes(query)
    )
  }

  // Apply status filter
  if (statusFilter.value !== 'All') {
    const status = parseInt(statusFilter.value)
    filtered = filtered.filter(order => order.status === status)
  }

  // Apply product filter
  if (productFilter.value !== 'All') {
    filtered = filtered.filter(order => order.product_id === productFilter.value)
  }

  // Apply seller filter (admin only)
  if (isAdmin.value && sellerFilter.value !== 'All') {
    filtered = filtered.filter(order => order.user_id === parseInt(sellerFilter.value))
  }

  // Apply date range filter
  if (startDate.value && endDate.value) {
    const start = new Date(startDate.value)
    const end = new Date(endDate.value)
    end.setHours(23, 59, 59, 999) // Set end date to end of day

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= start && orderDate <= end
      })
    }
  }

  return filtered
})

// Add pagination
const currentPage = ref(1)

const totalPages = computed(() => {
  return Math.ceil(filteredOrders.value.length / parseInt(itemsPerPage.value))
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * parseInt(itemsPerPage.value)
  const end = start + parseInt(itemsPerPage.value)
  return filteredOrders.value.slice(start, end)
})

// Close export dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showExportDropdown.value = false
  }
}

// Nach dem handleClickOutside für das Export-Dropdown
const handleCityClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.city-dropdown-container')) {
    showCityDropdown.value = false
  }
}

onMounted(async () => {
  await orderStore.fetchOrders()
  await productStore.fetchProducts()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('click', handleCityClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('click', handleCityClickOutside)
})

// Sync all integrations
const handleSyncAll = async () => {
  try {
    syncing.value = true
    console.log('Starting sync all...')
    
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
    
    if (fetchError) {
      console.error('Error fetching integrations:', fetchError)
      throw fetchError
    }
    
    console.log(`Found ${integrations.length} integrations to sync`)
    
    let successCount = 0
    let errorCount = 0
    let totalNewOrders = 0
    let totalSkippedOrders = 0
    
    for (const integration of integrations) {
      try {
        console.log(`Syncing integration ${integration.id}...`)
        const result = await integrationStore.handleSync(integration)
        console.log(`Sync result for integration ${integration.id}:`, result)
        
        if (result) {
          successCount++
          totalNewOrders += result.new || 0
          totalSkippedOrders += result.skipped || 0
        }
      } catch (error) {
        console.error(`Error syncing integration ${integration.id}:`, error)
        errorCount++
      }
    }

    // Refresh orders after sync
    await orderStore.fetchOrders()
    
    // Show success message with details
    success.value = `Sync completed!\nTotal new Orders: ${totalNewOrders}`
  } catch (error) {
    console.error('Error during sync all:', error)
    error.value = 'Error during sync. Please check the console for details.'
  } finally {
    syncing.value = false
  }
}

const handleStatusChange = async (orderId: number, newStatus: number) => {
  try {
    await orderStore.updateOrderStatus(orderId, newStatus)
  } catch (error) {
    console.error('Error updating order status:', error)
  }
}

const getStatusColor = (status: number) => {
  switch (status) {
    case ORDER_STATUS.NEW:
      return 'text-blue-600'
    case ORDER_STATUS.NO_REPLY1:
    case ORDER_STATUS.NO_REPLY2:
    case ORDER_STATUS.NO_REPLY3:
    case ORDER_STATUS.NO_REPLY4:
    case ORDER_STATUS.NO_REPLY5:
    case ORDER_STATUS.NO_REPLY6:
    case ORDER_STATUS.NO_REPLY7:
    case ORDER_STATUS.NO_REPLY8:
    case ORDER_STATUS.NO_REPLY9:
    case ORDER_STATUS.REPORTED:
      return 'text-orange-500'
    case ORDER_STATUS.CONFIRMED:
    case ORDER_STATUS.DELIVERED:
      return 'text-green-600'
    case ORDER_STATUS.CANCELED:
    case ORDER_STATUS.WRONG_NUMBER:
    case ORDER_STATUS.DOUBLE:
      return 'text-red-600'
    case ORDER_STATUS.SHIPPED:
      return 'text-blue-600'
    default:
      return 'text-gray-700'
  }
}

const getStatusBgColor = (status: number) => {
  switch (status) {
    case ORDER_STATUS.NEW:
      return 'bg-blue-50'
    case ORDER_STATUS.NO_REPLY1:
    case ORDER_STATUS.NO_REPLY2:
    case ORDER_STATUS.NO_REPLY3:
    case ORDER_STATUS.NO_REPLY4:
    case ORDER_STATUS.NO_REPLY5:
    case ORDER_STATUS.NO_REPLY6:
    case ORDER_STATUS.NO_REPLY7:
    case ORDER_STATUS.NO_REPLY8:
    case ORDER_STATUS.NO_REPLY9:
    case ORDER_STATUS.REPORTED:
      return 'bg-orange-50'
    case ORDER_STATUS.CONFIRMED:
    case ORDER_STATUS.DELIVERED:
      return 'bg-green-50'
    case ORDER_STATUS.CANCELED:
    case ORDER_STATUS.WRONG_NUMBER:
    case ORDER_STATUS.DOUBLE:
      return 'bg-red-50'
    case ORDER_STATUS.SHIPPED:
      return 'bg-blue-50'
    default:
      return 'bg-gray-50'
  }
}

const handleDeleteOrder = async (orderId: number) => {
  if (!confirm('Are you sure you want to delete this order?')) return
  
  try {
    await orderStore.deleteOrder(orderId)
  } catch (error) {
    console.error('Error deleting order:', error)
  }
}

const handleAddOrder = async () => {
  try {
    await orderStore.addOrder(newOrder.value)
    showAddModal.value = false
    newOrder.value = {
      product_id: '',
      customer_name: '',
      phone: '',
      shipping_address: '',
      quantity: 1,
      info: ''
    }
  } catch (error) {
    console.error('Error adding order:', error)
  }
}

const handleEditOrder = async () => {
  if (!editingOrder.value) return

  try {
    // Füge Stadt zur Adresse hinzu
    const fullAddress = selectedCity.value 
      ? `${editingOrder.value.shipping_address}, ${selectedCity.value}`
      : editingOrder.value.shipping_address

    await orderStore.updateOrder(editingOrder.value.id, {
      customer_name: editingOrder.value.customer_name,
      phone: editingOrder.value.phone,
      shipping_address: fullAddress,
      quantity: editingOrder.value.quantity,
      total_amount: editingOrder.value.total_amount,
      info: editingOrder.value.info,
      notes: editingOrder.value.notes,
      product_id: editingOrder.value.product_id,
      status: editingOrder.value.status
    })
    showEditModal.value = false
    editingOrder.value = null
    selectedCity.value = ''
  } catch (error) {
    console.error('Error updating order:', error)
  }
}

const openEditModal = (order: Order) => {
  editingOrder.value = { ...order }
  // Extrahiere die Stadt aus der Adresse
  const addressParts = order.shipping_address.split(',')
  if (addressParts.length > 1) {
    selectedCity.value = addressParts[1].trim()
    editingOrder.value.shipping_address = addressParts[0].trim()
  }
  showEditModal.value = true
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price: number) => {
  return `${price.toFixed(2)} $`
}

const selectedProduct = computed(() => {
  if (!editingOrder.value?.product_id) return null
  return productStore.products.find(p => p.id === editingOrder.value?.product_id)
})

const totalPrice = computed(() => {
  if (!selectedProduct.value) return 0
  return selectedProduct.value.price * newOrder.value.quantity
})

const editingProduct = computed(() => {
  if (!editingOrder.value) return null
  return productStore.products.find(p => p.id === editingOrder.value?.product_id)
})

const editingTotalPrice = computed(() => {
  if (!editingOrder.value) return 0
  return editingOrder.value.unit_price * editingOrder.value.quantity
})

const handleExportExcel = () => {
  const data = filteredOrders.value.map(order => {
    // Finde das Produkt für die SKU
    const product = productStore.products.find(p => p.id === order.product_id)
    return {
      'Phone': order.phone,
      'CUSTOMER': order.customer_name,
      'City': order.city || '',
      'Adress': order.shipping_address || '',
      'Total Price': order.total_amount,
      'SKU': product?.sku || '',
      'ORDER ID': order.id,
      'Quantity': order.quantity,
      'Product Name': order.product_name,
      'Seller': order.seller_name || ''
    }
  })
  exportToExcel(data, 'orders')
}

const handleExportCSV = () => {
  const data = filteredOrders.value.map(order => ({
    'Order ID': order.id,
    'Customer Name': order.customer_name,
    'Phone': order.phone,
    'Product': order.product_name,
    'Quantity': order.quantity,
    'Total Amount': order.total_amount,
    'Status': ORDER_STATUS_LABELS[order.status],
    'Created At': formatDate(order.created_at),
    ...(isAdmin.value ? { 'Seller Name': order.seller_name } : {})
  }))
  exportToCSV(data, 'orders')
}

const handleDeleteSelected = async () => {
  if (!selectedOrders.value.length) return
  
  if (!confirm(`Sind Sie sicher, dass Sie ${selectedOrders.value.length} ausgewählte Leads löschen möchten?`)) {
    return
  }

  try {
    for (const orderId of selectedOrders.value) {
      await orderStore.deleteOrder(orderId)
    }
    selectedOrders.value = []
    success.value = 'Ausgewählte Leads wurden erfolgreich gelöscht'
  } catch (error) {
    console.error('Error deleting orders:', error)
    error.value = 'Fehler beim Löschen der Leads'
  }
}

// Computed property für gefilterte Städte
const filteredCities = computed(() => {
  if (!citySearchQuery.value) return []
  const query = citySearchQuery.value.toLowerCase()
  return cities.value
    .filter(city => city.toLowerCase().includes(query))
    .slice(0, 10) // Begrenzen auf 10 Ergebnisse
})

const filteredProducts = computed(() => {
  console.log('Current user:', authStore.user)
  console.log('All products:', productStore.products)
  
  if (authStore.user?.role === 'seller') {
    const sellerProducts = productStore.products.filter(product => {
      console.log('Product user_id:', product.user_id, 'Auth user id:', authStore.user?.id)
      return product.user_id === authStore.user?.id
    })
    console.log('Filtered products for seller:', sellerProducts)
    return sellerProducts
  }
  
  return productStore.products
})
</script>

<template>
  <div class="max-w-full mx-auto px-4 py-8">
    <!-- Success/Error Messages -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md whitespace-pre-line">{{ success }}</div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- ... existing stats grid code ... -->
    </div>

    <!-- Table Controls -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-4">
        <label class="text-sm text-gray-600">Show</label>
        <select
          v-model="itemsPerPage"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option>10</option>
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </select>

        <select
          v-model="statusFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="All">All Status</option>
          <option v-for="(label, value) in ORDER_STATUS_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>

        <select
          v-model="productFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="All">All Products</option>
          <option v-for="product in filteredProducts" :key="product.id" :value="product.id">
            {{ product.name }}
          </option>
        </select>

        <select
          v-if="isAdmin"
          v-model="sellerFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="All">All Sellers</option>
          <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
            {{ seller.name }}
          </option>
        </select>

        <div class="flex items-center space-x-2">
          <input
            type="date"
            v-model="startDate"
            class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
          />
          <span class="text-gray-500">to</span>
          <input
            type="date"
            v-model="endDate"
            class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
          />
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <!-- Delete Selected Button -->
        <button
          v-if="selectedOrders.length > 0"
          @click="handleDeleteSelected"
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
        >
          <i class="fas fa-trash mr-2"></i>
          Delete Selected ({{ selectedOrders.length }})
        </button>

        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search..."
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
        />

        <!-- Export Dropdown -->
        <div class="relative" v-if="isAdmin">
          <button
            @click="showExportDropdown = !showExportDropdown"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <i class="fas fa-download mr-2"></i>
            EXPORT
            <i class="fas fa-chevron-down ml-2"></i>
          </button>
          <div
            v-if="showExportDropdown"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
          >
            <button
              @click="handleExportExcel"
              class="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              <i class="fas fa-file-excel text-green-600 mr-2"></i>
              Excel
            </button>
            <button
              @click="handleExportCSV"
              class="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              <i class="fas fa-file-csv text-blue-600 mr-2"></i>
              CSV
            </button>
          </div>
        </div>

        <!-- Sync All Button (visible for staff and admin) -->
        <button
          v-if="isStaffOrAdmin"
          @click="handleSyncAll"
          :disabled="syncing"
          class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
        >
          <i class="fas fa-sync-alt mr-2" :class="{ 'animate-spin': syncing }"></i>
          SYNC ALL
        </button>

        <button
          @click="showAddModal = true"
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
        >
          <i class="fas fa-plus mr-2"></i>
          ADD ORDER
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="orderStore.loading" class="text-center py-12">
      <p class="text-gray-600">Loading orders...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="orderStore.error" class="bg-red-50 p-4 rounded-md">
      <p class="text-red-700">{{ orderStore.error }}</p>
    </div>

    <!-- Orders Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                :checked="selectedOrders.length === filteredOrders.length && filteredOrders.length > 0"
                :indeterminate="selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length"
                @change="e => {
                  const checked = e.target.checked
                  selectedOrders = checked ? filteredOrders.map(o => o.id) : []
                }"
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              >
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
            <th v-if="isAdmin" scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="order in paginatedOrders" :key="order.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                v-model="selectedOrders"
                :value="order.id"
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{{ order.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(order.created_at) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <select
                v-if="isStaffOrAdmin"
                v-model="order.status"
                @change="handleStatusChange(order.id, order.status)"
                :class="[
                  'rounded-md border-0 shadow-sm text-sm',
                  getStatusColor(order.status),
                  getStatusBgColor(order.status)
                ]"
              >
                <option 
                  v-for="(label, value) in ORDER_STATUS_LABELS" 
                  :key="value" 
                  :value="Number(value)"
                  :class="getStatusColor(Number(value))"
                >
                  {{ label }}
                </option>
              </select>
              <span 
                v-else 
                :class="[
                  'px-2 py-1 text-sm rounded-full',
                  getStatusColor(order.status),
                  getStatusBgColor(order.status)
                ]"
              >
                {{ ORDER_STATUS_LABELS[order.status] }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ order.product_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ order.customer_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ order.quantity }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatPrice(order.total_amount) }}</td>
            <td v-if="isAdmin" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ order.seller_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button @click="openEditModal(order)" class="text-blue-600 hover:text-blue-800">
                {{ isStaffOrAdmin ? '✏️' : '👁️' }}
              </button>
              <button 
                v-if="isStaffOrAdmin" 
                @click="handleDeleteOrder(order.id)" 
                class="text-red-600 hover:text-red-800"
              >
                🗑️
              </button>
              <button 
                v-if="isStaffOrAdmin" 
                @click="addFees(order)" 
                class="text-purple-600 hover:text-purple-800"
              >
                <i class="fas fa-plus-circle"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div class="flex items-center">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 mr-2 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div class="text-sm text-gray-700">
          Showing {{ ((currentPage - 1) * parseInt(itemsPerPage)) + 1 }} to {{ Math.min(currentPage * parseInt(itemsPerPage), filteredOrders.length) }} of {{ filteredOrders.length }} entries
        </div>
      </div>
    </div>

    <!-- Add Order Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Add New Order</h2>
        <form @submit.prevent="handleAddOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Product</label>
            <select
              v-model="newOrder.product_id"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="">Select a product</option>
              <option v-for="product in filteredProducts" :key="product.id" :value="product.id">
                {{ product.name }} - {{ formatPrice(product.price) }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Customer Name</label>
            <input
              v-model="newOrder.customer_name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Phone</label>
            <input
              v-model="newOrder.phone"
              type="tel"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Shipping Address</label>
            <textarea
              v-model="newOrder.shipping_address"
              rows="3"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              v-model.number="newOrder.quantity"
              type="number"
              min="1"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Info</label>
            <textarea
              v-model="newOrder.info"
              rows="2"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            ></textarea>
          </div>
          <div class="pt-4 border-t">
            <div class="flex justify-between items-center text-lg font-medium">
              <span>Total Price:</span>
              <span>{{ formatPrice(totalPrice) }}</span>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showAddModal = false"
              class="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
            >
              Add Order
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Order Modal -->
    <div v-if="showEditModal && editingOrder" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-4xl w-full">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold">Edit Order #{{ editingOrder.id }}</h2>
          <button
            type="button"
            @click="showEditModal = false"
            class="text-gray-400 hover:text-gray-500"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="handleEditOrder" class="space-y-6">
          <!-- Status and Product Row -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <select
                v-model="editingOrder.status"
                required
                :disabled="!isStaffOrAdmin"
                :class="[
                  'mt-1 block w-full rounded-md shadow-sm text-sm',
                  getStatusColor(editingOrder.status),
                  getStatusBgColor(editingOrder.status)
                ]"
              >
                <option 
                  v-for="(label, value) in ORDER_STATUS_LABELS" 
                  :key="value" 
                  :value="Number(value)"
                  :class="getStatusColor(Number(value))"
                >
                  {{ label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Product</label>
              <select
                v-model="editingOrder.product_id"
                required
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              >
                <option value="">Select a product</option>
                <option v-for="product in filteredProducts" :key="product.id" :value="product.id">
                  {{ product.name }} - {{ formatPrice(product.price) }}
                </option>
              </select>

              <!-- Product Links -->
              <div class="mt-2 flex space-x-4">
                <a 
                  v-if="selectedProduct?.product_link"
                  :href="selectedProduct.product_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  title="Open Product Page"
                >
                  <i class="fas fa-external-link-alt mr-2"></i>
                  Product Page
                </a>
                <a 
                  v-if="selectedProduct?.video_link"
                  :href="selectedProduct.video_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  title="Open Product Video"
                >
                  <i class="fas fa-video mr-2"></i>
                  Video
                </a>
              </div>
            </div>
          </div>

          <!-- Customer Info Row -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                v-model="editingOrder.customer_name"
                type="text"
                required
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Phone</label>
              <input
                v-model="editingOrder.phone"
                type="tel"
                required
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
            </div>
          </div>

          <!-- Quantity and Total Price Row -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                v-model.number="editingOrder.quantity"
                type="number"
                min="1"
                required
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Total Price</label>
              <input
                v-model.number="editingOrder.total_amount"
                type="number"
                step="0.01"
                min="0"
                required
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
            </div>
          </div>

          <!-- Address and Info Row -->
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="relative city-dropdown-container">
                <label class="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  v-model="citySearchQuery"
                  @focus="showCityDropdown = true"
                  :placeholder="selectedCity || 'Search city...'"
                  :disabled="!isStaffOrAdmin"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                />
                <!-- City Dropdown -->
                <div
                  v-if="showCityDropdown && filteredCities.length > 0 && isStaffOrAdmin"
                  class="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
                >
                  <div
                    v-for="city in filteredCities"
                    :key="city"
                    @click="() => {
                      selectedCity = city
                      citySearchQuery = ''
                      showCityDropdown = false
                    }"
                    class="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                  >
                    {{ city }}
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  v-model="editingOrder.shipping_address"
                  rows="3"
                  required
                  :disabled="!isStaffOrAdmin"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                ></textarea>
              </div>

              <!-- Product Links Info -->
              <div class="mt-2">
                <div v-if="!selectedProduct?.product_link && !selectedProduct?.video_link" class="text-sm text-gray-500">
                  <i class="fas fa-info-circle mr-2"></i>
                  No links available for this product
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Info</label>
              <textarea
                v-model="editingOrder.info"
                rows="3"
                :disabled="!isStaffOrAdmin"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t">
            <div class="text-lg font-medium">
              <span v-if="!isStaffOrAdmin">Total Price: <span class="text-green-600">{{ formatPrice(editingOrder.total_amount) }}</span></span>
            </div>

            <div class="flex space-x-3">
              <button
                type="button"
                @click="showEditModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                {{ isStaffOrAdmin ? 'Cancel' : 'Close' }}
              </button>
              <button
                v-if="isStaffOrAdmin"
                type="submit"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>