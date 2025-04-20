<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useOrderStore, ORDER_STATUS, ORDER_STATUS_LABELS } from '../stores/orders'
import { useProductStore } from '../stores/products'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const orderStore = useOrderStore()
const productStore = useProductStore()
const loading = ref(false)
const error = ref('')
const charts = ref<any[]>([])
const selectedTimeRange = ref('all')

const timeRanges = [
  { value: 'all', label: 'ALL' },
  { value: 'today', label: 'TODAY' },
  { value: 'yesterday', label: 'YESTERDAY' },
  { value: 'last7days', label: 'LAST 7 DAYS' },
  { value: 'last30days', label: 'LAST 30 DAYS' }
]

// Helper functions for line charts
const getLast7Days = () => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

const getOrdersByDate = (status: number | null = null) => {
  const days = getLast7Days()
  const ordersByDate = new Array(7).fill(0)
  const startDate = days[0]
  
  try {
    // Filter orders for last 7 days
    const orders = orderStore.orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      return orderDate >= startDate
    })

    orders.forEach(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      const dayIndex = days.indexOf(orderDate)
      if (dayIndex !== -1 && (!status || order.status === status)) {
        ordersByDate[dayIndex]++
      }
    })
    
    return ordersByDate
  } catch (err) {
    console.error('Error processing orders:', err)
    return ordersByDate
  }
}

// Filter orders based on selected time range
const getFilteredOrders = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return orderStore.orders.filter(order => {
    const orderDate = new Date(order.created_at)
    
    switch (selectedTimeRange.value) {
      case 'today':
        return orderDate >= today
      case 'yesterday':
        return orderDate >= yesterday && orderDate < today
      case 'last7days':
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 7)
        return orderDate >= last7Days
      case 'last30days':
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 30)
        return orderDate >= last30Days
      default:
        return true
    }
  })
}

// Compute order statistics for donut chart
const orderStats = computed(() => {
  const filteredOrders = getFilteredOrders()
  const total = filteredOrders.length
  const stats = [
    { status: 'Delivered', count: filteredOrders.filter(o => o.status === ORDER_STATUS.DELIVERED).length, color: '#10B981' },
    { status: 'Cancelled', count: filteredOrders.filter(o => o.status === ORDER_STATUS.CANCELED).length, color: '#EF4444' },
    { status: 'Wrong Number', count: filteredOrders.filter(o => o.status === ORDER_STATUS.WRONG_NUMBER).length, color: '#1F2937' },
    { status: 'Shipping', count: filteredOrders.filter(o => o.status === ORDER_STATUS.SHIPPED).length, color: '#E5E7EB' },
    { status: 'Reported', count: filteredOrders.filter(o => o.status === ORDER_STATUS.REPORTED).length, color: '#EC4899' },
    { status: 'No Reply', count: filteredOrders.filter(o => [ORDER_STATUS.NO_REPLY1, ORDER_STATUS.NO_REPLY2, ORDER_STATUS.NO_REPLY3].includes(o.status)).length, color: '#F59E0B' },
    { status: 'Confirmed', count: filteredOrders.filter(o => o.status === ORDER_STATUS.CONFIRMED).length, color: '#06B6D4' },
    { status: 'New', count: filteredOrders.filter(o => o.status === ORDER_STATUS.NEW).length, color: '#3B82F6' }
  ]

  return stats.map(stat => ({
    ...stat,
    percentage: total > 0 ? ((stat.count / total) * 100).toFixed(2) : '0.00'
  }))
})

// Compute product statistics
const productStats = computed(() => {
  const filteredOrders = getFilteredOrders()
  const productMap = new Map()

  // Group orders by product
  filteredOrders.forEach(order => {
    const productId = String(order.product_id)
    const product = productStore.products.find(p => String(p.id) === productId)
    const stats = productMap.get(productId) || {
      totalOrders: 0,
      totalRevenue: 0,
      confirmedOrders: 0,
      deliveredOrders: 0,
      invalidOrders: 0,
      productName: product?.name || `Product ${productId}`,
      productId: productId
    }

    stats.totalOrders++
    stats.totalRevenue += Number(order.total_amount) || 0
    
    // Count confirmed orders (including shipped and delivered)
    if (order.status === ORDER_STATUS.CONFIRMED || 
        order.status === ORDER_STATUS.SHIPPED || 
        order.status === ORDER_STATUS.DELIVERED) {
      stats.confirmedOrders++
    }
    
    // Count delivered orders
    if (order.status === ORDER_STATUS.DELIVERED) {
      stats.deliveredOrders++
    }
    
    // Count invalid orders
    if (order.status === ORDER_STATUS.WRONG_NUMBER || 
        order.status === ORDER_STATUS.DOUBLE) {
      stats.invalidOrders++
    }

    productMap.set(productId, stats)
  })

  // Convert map to array and calculate rates
  return Array.from(productMap.entries())
    .map(([productId, stats]) => {
      const validOrdersCount = stats.totalOrders - stats.invalidOrders
      const confirmationRate = validOrdersCount > 0 
        ? (stats.confirmedOrders / validOrdersCount) * 100 
        : 0
      
      const deliveryRate = stats.confirmedOrders > 0
        ? (stats.deliveredOrders / stats.confirmedOrders) * 100
        : 0

      return {
        productId: String(productId),
        productName: stats.productName,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        confirmationRate: confirmationRate.toFixed(1),
        deliveredRate: deliveryRate.toFixed(1),
        averageOrderValue: (stats.totalRevenue / stats.totalOrders).toFixed(2)
      }
    })
    .sort((a, b) => b.totalOrders - a.totalOrders)
})

const createLineChart = (canvasId: string, data: number[], label: string, color: string) => {
  const ctx = document.getElementById(canvasId) as HTMLCanvasElement
  if (!ctx) return

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getLast7Days().map(date => new Date(date).toLocaleDateString('de-DE', { weekday: 'short' })),
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '40',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  }) as any

  charts.value.push(chart)
}

const createDonutChart = () => {
  const ctx = document.getElementById('statusDonutChart') as HTMLCanvasElement
  if (!ctx) return

  const stats = orderStats.value
  
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: stats.map(s => s.status),
      datasets: [{
        data: stats.map(s => s.count),
        backgroundColor: stats.map(s => s.color),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })

  charts.value.push(chart)
}

const destroyCharts = () => {
  charts.value.forEach(chart => chart.destroy())
  charts.value = []
}

const initializeCharts = async () => {
  try {
    loading.value = true
    error.value = ''

    destroyCharts()

    // Warte auf Produktdaten
    if (!productStore.products.length) {
      await productStore.fetchProducts()
    }

    // Create line charts
    const allOrders = getOrdersByDate()
    const confirmedOrders = getOrdersByDate(ORDER_STATUS.CONFIRMED)
    const deliveredOrders = getOrdersByDate(ORDER_STATUS.DELIVERED)

    createLineChart('allOrdersChart', allOrders, 'Gesamtbestellungen', '#3B82F6')
    createLineChart('confirmedOrdersChart', confirmedOrders, 'Bestätigte Bestellungen', '#10B981')
    createLineChart('deliveredOrdersChart', deliveredOrders, 'Gelieferte Bestellungen', '#8B5CF6')

    // Create donut chart
    createDonutChart()
  } catch (err: any) {
    error.value = err.message
    console.error('Error initializing charts:', err)
  } finally {
    loading.value = false
  }
}

// Watch for changes that should trigger chart updates
watch([() => orderStore.orders, selectedTimeRange], async () => {
  await initializeCharts()
}, { deep: true })

onMounted(async () => {
  await initializeCharts()
})

onUnmounted(() => {
  destroyCharts()
})
</script>

<template>
  <div class="max-w-full">
    <div class="py-8 px-4">
      <h1 class="text-2xl font-semibold mb-6">Statistics</h1>

      <!-- Error Message -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading statistics...</p>
      </div>

      <!-- Charts Section -->
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Total Orders Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Total Orders (Last 7 Days)</h3>
          <div class="h-64">
            <canvas id="allOrdersChart"></canvas>
          </div>
        </div>

        <!-- Confirmed Orders Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Confirmed Orders (Last 7 Days)</h3>
          <div class="h-64">
            <canvas id="confirmedOrdersChart"></canvas>
          </div>
        </div>

        <!-- Delivered Orders Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Delivered Orders (Last 7 Days)</h3>
          <div class="h-64">
            <canvas id="deliveredOrdersChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Order Status Distribution -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium text-gray-900">Order Status Distribution</h2>
          <select
            v-model="selectedTimeRange"
            class="rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
          >
            <option v-for="range in timeRanges" :key="range.value" :value="range.value">
              {{ range.label }}
            </option>
          </select>
        </div>
        
        <div class="flex flex-col lg:flex-row items-start gap-8">
          <!-- Donut Chart -->
          <div class="w-full lg:w-1/2">
            <div class="h-80">
              <canvas id="statusDonutChart"></canvas>
            </div>
          </div>

          <!-- Status Legend -->
          <div class="w-full lg:w-1/2">
            <div class="grid grid-cols-2 gap-2">
              <div v-for="stat in orderStats" :key="stat.status" class="flex items-center space-x-1 p-1 rounded-lg hover:bg-gray-50">
                <div class="flex items-center space-x-1 min-w-[80px]">
                  <div class="w-3 h-3 rounded" :style="{ backgroundColor: stat.color }"></div>
                  <span class="font-medium text-sm">{{ stat.count }}</span>
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-900">{{ stat.status }}</div>
                  <div class="text-xs text-gray-500">{{ stat.percentage }}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Statistics -->
      <div class="bg-white rounded-lg shadow p-6 mt-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-medium text-gray-900">Product Performance</h2>
          <div class="text-sm text-gray-500">
            {{ productStore.products.length }} Products Total
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">Product</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Total Orders</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Total Revenue</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Avg. Order Value</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Confirmation Rate</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Delivered Rate</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="product in productStats" :key="'product-' + product.productId" class="hover:bg-gray-50">
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-[200px] truncate">
                  {{ product.productName }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {{ product.totalOrders }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  ${{ product.totalRevenue.toLocaleString() }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  ${{ product.averageOrderValue }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right">
                  <span :class="[
                    'px-2 py-1 rounded-full text-xs font-medium inline-block min-w-[60px]',
                    Number(product.confirmationRate) > 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ product.confirmationRate }}%
                  </span>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right">
                  <span :class="[
                    'px-2 py-1 rounded-full text-xs font-medium inline-block min-w-[60px]',
                    Number(product.deliveredRate) > 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ product.deliveredRate }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template> 