<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useOrderStore, ORDER_STATUS } from '../stores/orders'
import { useAuthStore } from '../stores/auth'

const orderStore = useOrderStore()
const authStore = useAuthStore()

// Hilfsfunktionen
const formatPrice = (price: number) => {
  return `${price.toFixed(2)} $`
}

const calculateConfirmationRate = () => {
  const confirmedOrders = orderStore.orders.filter(order => 
    order.status === ORDER_STATUS.CONFIRMED || 
    order.status === ORDER_STATUS.SHIPPED || 
    order.status === ORDER_STATUS.DELIVERED
  )
  
  const invalidOrders = orderStore.orders.filter(order =>
    order.status === ORDER_STATUS.WRONG_NUMBER ||
    order.status === ORDER_STATUS.DOUBLE
  )
  
  const validOrdersCount = orderStore.orders.length - invalidOrders.length
  const rate = validOrdersCount > 0 
    ? (confirmedOrders.length / validOrdersCount) * 100 
    : 0
  return `${rate.toFixed(2)}%`
}

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
  newOrders: '0',
  confirmedOrders: '0',
  confirmedPercentage: '0%',
  deliveredOrders: '0',
  deliveredPercentage: '0%',
  shippedOrders: '0',
  canceledOrders: '0',
  canceledPercentage: '0%',
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

const statsArray = computed(() => {
  const orders = orderStore.orders
  const user = authStore.user

  // Berechne New Orders basierend auf der Benutzerrolle
  const newOrders = user?.role === 'seller' 
    ? orders.filter(order => order.status === ORDER_STATUS.NEW && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.NEW)

  return [
    {
      name: 'New Orders',
      value: newOrders.length,
      icon: 'fas fa-shopping-cart',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Total Orders',
      value: user?.role === 'seller' 
        ? orders.filter(order => order.user_id === user.id).length
        : orders.length,
      icon: 'fas fa-shopping-bag',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Total Revenue',
      value: formatPrice(
        user?.role === 'seller'
          ? orders
              .filter(order => order.user_id === user.id)
              .reduce((sum, order) => sum + order.total_amount, 0)
          : orders.reduce((sum, order) => sum + order.total_amount, 0)
      ),
      icon: 'fas fa-dollar-sign',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Confirmation Rate',
      value: calculateConfirmationRate(),
      icon: 'fas fa-chart-line',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]
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

  const user = authStore.user
  const orders = orderStore.orders

  // Calculate New Orders
  const newOrders = user?.role === 'seller' 
    ? orders.filter(order => order.status === ORDER_STATUS.NEW && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.NEW)
  stats.value.newOrders = newOrders.length.toString()

  // Calculate Confirmed Orders
  const confirmedOrders = user?.role === 'seller'
    ? orders.filter(order => 
        (order.status === ORDER_STATUS.CONFIRMED || 
         order.status === ORDER_STATUS.DELIVERED || 
         order.status === ORDER_STATUS.SHIPPED) && 
        order.user_id === user.id
      )
    : orders.filter(order => 
        order.status === ORDER_STATUS.CONFIRMED || 
        order.status === ORDER_STATUS.DELIVERED || 
        order.status === ORDER_STATUS.SHIPPED
      )
  stats.value.confirmedOrders = confirmedOrders.length.toString()
  
  // Calculate invalid orders (Wrong Number + Double)
  const invalidOrders = user?.role === 'seller'
    ? orders.filter(order => 
        (order.status === ORDER_STATUS.WRONG_NUMBER || 
         order.status === ORDER_STATUS.DOUBLE) && 
        order.user_id === user.id
      )
    : orders.filter(order => 
        order.status === ORDER_STATUS.WRONG_NUMBER || 
        order.status === ORDER_STATUS.DOUBLE
      )
  
  // Calculate total valid orders
  const totalValidOrders = user?.role === 'seller'
    ? orders.filter(order => order.user_id === user.id).length - invalidOrders.length
    : orders.length - invalidOrders.length
  
  // Calculate Confirmed Percentage (now based on valid orders)
  const confirmedPercentage = totalValidOrders > 0
    ? (confirmedOrders.length / totalValidOrders) * 100
    : 0
  stats.value.confirmedPercentage = `${confirmedPercentage.toFixed(2)}%`

  // Calculate Delivered Orders
  const deliveredOrders = user?.role === 'seller'
    ? orders.filter(order => order.status === ORDER_STATUS.DELIVERED && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.DELIVERED)
  stats.value.deliveredOrders = deliveredOrders.length.toString()
  
  // Calculate Delivered Percentage (now based on confirmed orders)
  const deliveredPercentage = confirmedOrders.length > 0
    ? (deliveredOrders.length / confirmedOrders.length) * 100
    : 0
  stats.value.deliveredPercentage = `${deliveredPercentage.toFixed(2)}% of Confirmed Orders`

  // Calculate Shipped Orders
  const shippedOrders = user?.role === 'seller'
    ? orders.filter(order => order.status === ORDER_STATUS.SHIPPED && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.SHIPPED)
  stats.value.shippedOrders = shippedOrders.length.toString()

  // Calculate Canceled/Wrong Number Orders
  const canceledOrders = user?.role === 'seller'
    ? orders.filter(order => 
        (order.status === ORDER_STATUS.CANCELED || 
         order.status === ORDER_STATUS.WRONG_NUMBER) && 
        order.user_id === user.id
      )
    : orders.filter(order => 
        order.status === ORDER_STATUS.CANCELED || 
        order.status === ORDER_STATUS.WRONG_NUMBER
      )
  stats.value.canceledOrders = canceledOrders.length.toString()
  
  // Calculate Canceled Percentage
  const canceledPercentage = totalValidOrders > 0
    ? (canceledOrders.length / totalValidOrders) * 100
    : 0
  stats.value.canceledPercentage = `${canceledPercentage.toFixed(2)}%`

  // Total Revenue and Leads
  if (user?.role === 'seller') {
    const sellerOrders = orders.filter(order => order.user_id === user.id)
    const totalRevenue = sellerOrders.reduce((sum, order) => sum + order.total_amount, 0)
    stats.value.totalRevenue = `${totalRevenue.toFixed(2)} $`
    stats.value.totalLeads = sellerOrders.length.toString()
  } else {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
    stats.value.totalRevenue = `${totalRevenue.toFixed(2)} $`
    stats.value.totalLeads = orders.length.toString()
  }

  // Confirmation Rate (updated to exclude invalid orders)
  const confirmedCount = confirmedOrders.length;
  const validFilteredOrders = filteredOrders.value.filter(order => 
    order.status !== ORDER_STATUS.WRONG_NUMBER && 
    order.status !== ORDER_STATUS.DOUBLE
  );
  const confirmationRate = validFilteredOrders.length > 0
    ? (confirmedCount / validFilteredOrders.length) * 100
    : 0;
  stats.value.confirmationRate = {
    leads: confirmedCount.toString(),
    percentage: `${confirmationRate.toFixed(2)}%`,
    period: 'All of Time'
  };

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
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- Total Revenue (Only visible for non-staff users) -->
      <div v-if="!isStaff" class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Welcome {{ authStore.user?.email }} 🎉</h3>
            <p class="text-sm text-gray-500">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats.totalRevenue }}</p>
            <p class="text-xl font-bold text-gray-900">{{ stats.totalLeads }} Leads 🚀</p>
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

      <!-- New Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">New Orders</h3>
            <p class="text-2xl font-bold text-blue-600 mt-2">{{ stats.newOrders }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-blue-600">
            <i class="fas fa-shopping-cart text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Confirmed Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Confirmed Orders</h3>
            <p class="text-2xl font-bold text-green-600 mt-2">{{ stats.confirmedOrders }}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">{{ stats.confirmedPercentage }} of Total Orders</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-check-circle text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Delivered Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Delivered Orders</h3>
            <p class="text-2xl font-bold text-green-600 mt-2">{{ stats.deliveredOrders }}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">{{ stats.deliveredPercentage }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-box text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Canceled/Wrong Number Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Canceled/Wrong Number</h3>
            <p class="text-2xl font-bold text-red-600 mt-2">{{ stats.canceledOrders }}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">{{ stats.canceledPercentage }} of Total Orders</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-red-600">
            <i class="fas fa-times-circle text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Shipped Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Shipped Orders</h3>
            <p class="text-2xl font-bold text-purple-600 mt-2">{{ stats.shippedOrders }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-purple-600">
            <i class="fas fa-truck-loading text-6xl"></i>
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