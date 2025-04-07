<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useOrderStore, ORDER_STATUS } from '../stores/orders'
import { useAuthStore } from '../stores/auth'

const orderStore = useOrderStore()
const authStore = useAuthStore()

// Check if user is staff (role === 2)
const isStaff = computed(() => {
  return authStore.user?.role === 2
})

// Check if user is admin (role === 1)
const isAdmin = computed(() => {
  return authStore.user?.role === 1
})

const stats = ref({
  totalRevenue: '0.00 $',
  totalLeads: '0',
  confirmationRate: {
    leads: '0',
    percentage: '0%',
    period: 'All of Time'
  },
  deliveryRate: {
    orders: '0',
    percentage: '0%',
    period: 'All of Time'
  }
})

const productFilter = ref('All')
const dateRange = ref('')
const statusFilter = ref('All')

const correctLeads = ref({
  count: 0,
  percentage: '0%',
  label: 'Correct Leads'
})

const wrongLeads = ref({
  count: 0,
  percentage: '0%',
  label: 'Wrong & Duplicated Leads'
})

const productLeads = ref([])

// Filter orders based on selected filters
const filteredOrders = computed(() => {
  let filtered = [...orderStore.orders]

  // Apply product filter
  if (productFilter.value !== 'All') {
    filtered = filtered.filter(order => order.product_name === productFilter.value)
  }

  // Apply status filter
  if (statusFilter.value !== 'All') {
    filtered = filtered.filter(order => {
      switch (statusFilter.value) {
        case 'Confirmed':
          return order.status === ORDER_STATUS.CONFIRMED
        case 'Delivered':
          return order.status === ORDER_STATUS.DELIVERED
        case 'Pending':
          return [
            ORDER_STATUS.NEW,
            ORDER_STATUS.NO_REPLY1,
            ORDER_STATUS.NO_REPLY2,
            ORDER_STATUS.NO_REPLY3,
            ORDER_STATUS.NO_REPLY4,
            ORDER_STATUS.NO_REPLY5,
            ORDER_STATUS.NO_REPLY6,
            ORDER_STATUS.NO_REPLY7,
            ORDER_STATUS.NO_REPLY8,
            ORDER_STATUS.NO_REPLY9
          ].includes(order.status)
        case 'Canceled':
          return [
            ORDER_STATUS.CANCELED,
            ORDER_STATUS.WRONG_NUMBER,
            ORDER_STATUS.REPORTED,
            ORDER_STATUS.DOUBLE
          ].includes(order.status)
        default:
          return true
      }
    })
  }

  // Apply date filter
  if (dateRange.value) {
    const [start, end] = dateRange.value.split(' - ').map(date => new Date(date))
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= start && orderDate <= end
      })
    }
  }

  return filtered
})

// Calculate statistics
const calculateStats = () => {
  if (!filteredOrders.value.length) return

  // Total Revenue and Leads
  const totalAmount = filteredOrders.value.reduce((sum, order) => sum + order.total_amount, 0)
  stats.value.totalRevenue = `${totalAmount.toFixed(2)} $`
  stats.value.totalLeads = filteredOrders.value.length.toString()

  // Confirmation Rate - Updated to include SHIPPED status
  const confirmedOrders = filteredOrders.value.filter(order => 
    order.status === ORDER_STATUS.CONFIRMED || 
    order.status === ORDER_STATUS.SHIPPED || 
    order.status === ORDER_STATUS.DELIVERED
  )
  const deliveredOrders = filteredOrders.value.filter(order => order.status === ORDER_STATUS.DELIVERED)
  const confirmedCount = confirmedOrders.length
  const confirmationRate = (confirmedCount / filteredOrders.value.length) * 100
  stats.value.confirmationRate = {
    leads: confirmedCount.toString(),
    percentage: `${confirmationRate.toFixed(2)}%`,
    period: 'All of Time'
  }

  // Delivery Rate
  const deliveryRatePercentage = confirmedCount > 0
    ? (deliveredOrders.length * 100) / confirmedCount
    : 0
  stats.value.deliveryRate = {
    orders: deliveredOrders.length.toString(),
    percentage: `${deliveryRatePercentage.toFixed(2)}%`,
    period: 'All of Time'
  }

  // Correct vs Wrong Leads
  const wrongStatusOrders = filteredOrders.value.filter(order => 
    [ORDER_STATUS.CANCELED, ORDER_STATUS.WRONG_NUMBER, ORDER_STATUS.REPORTED, ORDER_STATUS.DOUBLE].includes(order.status)
  )
  const correctStatusOrders = filteredOrders.value.filter(order => !wrongStatusOrders.includes(order))

  correctLeads.value = {
    count: correctStatusOrders.length,
    percentage: `${((correctStatusOrders.length / filteredOrders.value.length) * 100).toFixed(2)}%`,
    label: 'Correct Leads'
  }

  wrongLeads.value = {
    count: wrongStatusOrders.length,
    percentage: `${((wrongStatusOrders.length / filteredOrders.value.length) * 100).toFixed(2)}%`,
    label: 'Wrong & Duplicated Leads'
  }

  // Product Leads
  const productStats = new Map()
  filteredOrders.value.forEach(order => {
    const productName = order.product_name
    if (!productStats.has(productName)) {
      productStats.set(productName, { count: 0, total: 0 })
    }
    const stats = productStats.get(productName)
    stats.count++
    stats.total += order.total_amount
  })

  productLeads.value = Array.from(productStats.entries()).map(([name, stats]) => ({
    name,
    count: stats.count,
    total: stats.total,
    percentage: `${((stats.count / filteredOrders.value.length) * 100).toFixed(2)}%`
  }))
}

// Watch for filter changes
watch([productFilter, statusFilter, dateRange], () => {
  calculateStats()
}, { deep: true })

onMounted(async () => {
  await orderStore.fetchOrders()
  calculateStats()
})
</script>

<template>
  <div class="max-w-full mx-auto px-4 py-8">
    <!-- Filters -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-4">
        <select
          v-model="productFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
        >
          <option>All</option>
          <option v-for="product in productLeads" :key="product.name">{{ product.name }}</option>
        </select>

        <select
          v-model="statusFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
        >
          <option>All</option>
          <option>Confirmed</option>
          <option>Delivered</option>
          <option>Pending</option>
          <option>Canceled</option>
        </select>
      </div>

      <div class="flex items-center space-x-4">
        <input
          type="text"
          v-model="dateRange"
          placeholder="Between Date"
          class="rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
        />
        <button class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
          <i class="fas fa-search"></i>
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Total Revenue (Only visible for non-staff users) -->
      <div v-if="!isStaff" class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Welcome {{ authStore.user?.email }} 🎉</h3>
            <p class="text-sm text-gray-500">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats.totalRevenue }}</p>
            <p class="text-sm text-gray-500">{{ stats.totalLeads }} Leads 🚀</p>
            <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
              VIEW SALES
            </button>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-yellow-400">
            <i class="fas fa-trophy text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Total Leads (Only visible for staff) -->
      <div v-if="isStaff" class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Total Leads</h3>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats.totalLeads }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-blue-600">
            <i class="fas fa-users text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Confirmation Rate -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <div class="inline-block bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
              {{ stats.confirmationRate.period }}
            </div>
            <h3 class="text-lg font-medium text-gray-900 mt-2">Confirmation Rate</h3>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats.confirmationRate.leads }} Confirmed</p>
            <p class="text-xl font-semibold text-red-600">{{ stats.confirmationRate.percentage }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-gray-600">
            <i class="fas fa-user-check text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Delivery Rate -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <div class="inline-block bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
              {{ stats.deliveryRate.period }}
            </div>
            <h3 class="text-lg font-medium text-gray-900 mt-2">Delivery Rate</h3>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats.deliveryRate.orders }} Delivered</p>
            <p class="text-xl font-semibold text-green-600">{{ stats.deliveryRate.percentage }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-truck text-6xl"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Staff Stats -->
    <div v-if="isStaff" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Correct Leads -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-medium text-gray-900">Correct Leads</h3>
          <span class="text-green-600 text-xl font-bold">{{ correctLeads.percentage }}</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">{{ correctLeads.count }}</p>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div class="bg-green-600 h-2 rounded-full" :style="{ width: correctLeads.percentage }"></div>
        </div>
      </div>

      <!-- Wrong & Duplicated Leads -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-medium text-gray-900">Wrong & Duplicated Leads</h3>
          <span class="text-red-600 text-xl font-bold">{{ wrongLeads.percentage }}</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">{{ wrongLeads.count }}</p>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div class="bg-red-600 h-2 rounded-full" :style="{ width: wrongLeads.percentage }"></div>
        </div>
      </div>
    </div>

    <!-- Additional Stats (Only for non-staff users) -->
    <div v-if="!isStaff">
      <!-- Live Sells Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <!-- Left Column -->
        <div class="col-span-2">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-medium text-gray-900">Live Sells</h3>
              <p class="text-sm text-gray-500">Today : 0</p>
            </div>
            <p class="text-sm text-gray-500">Total {{ stats.totalLeads }} Leads for all time</p>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div class="bg-white rounded-lg shadow p-6">
            <!-- Correct Leads -->
            <div class="mb-6">
              <div class="flex items-center justify-between">
                <span class="text-lg font-medium">{{ correctLeads.count }}</span>
                <span class="text-green-600">{{ correctLeads.percentage }}</span>
              </div>
              <p class="text-sm text-gray-500">{{ correctLeads.label }}</p>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div class="bg-green-600 h-2 rounded-full" :style="{ width: correctLeads.percentage }"></div>
              </div>
            </div>

            <!-- Wrong Leads -->
            <div>
              <div class="flex items-center justify-between">
                <span class="text-lg font-medium">{{ wrongLeads.count }}</span>
                <span class="text-red-600">{{ wrongLeads.percentage }}</span>
              </div>
              <p class="text-sm text-gray-500">{{ wrongLeads.label }}</p>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div class="bg-red-600 h-2 rounded-full" :style="{ width: wrongLeads.percentage }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Product Leads Statistics -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Product Leads Statistics</h3>
          <!-- Add chart or graph here -->
        </div>

        <!-- Count Leads for each Product -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Count Leads for each Product</h3>
          <p class="text-sm text-gray-500 mb-4">Total leads {{ stats.totalLeads }}</p>
          
          <div class="space-y-4">
            <div v-for="product in productLeads" :key="product.name" class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-gray-900">{{ product.name }}</span>
                <span class="text-gray-500">({{ product.count }})</span>
              </div>
              <span class="text-gray-900">{{ product.percentage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>