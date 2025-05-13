<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useOrderStore, ORDER_STATUS } from '../stores/orders'
import { useAuthStore } from '../stores/auth'
import { Chart, registerables } from 'chart.js'
import { supabase } from '../lib/supabase'
import { useProductStore } from '../stores/products'
Chart.register(...registerables)

interface Order {
  id: string
  user_id: string
  status: number
  created_at: string
  total_amount: number
  product_name: string
}

interface User {
  id: string
  role: string
  email: string
}

const orderStore = useOrderStore()
const authStore = useAuthStore()
const productStore = useProductStore()

// Hilfsfunktionen
const formatPrice = (price: number) => {
  return `${Math.round(price)} $`
}

const calculateConfirmationRate = (orders: Order[]) => {
  const filteredOrders = authStore.user?.role === 'seller'
    ? orders.filter(order => order.user_id === authStore.user?.id)
    : orders

  const confirmedOrders = filteredOrders.filter(order => 
    order.status === ORDER_STATUS.CONFIRMED || 
    order.status === ORDER_STATUS.SHIPPED || 
    order.status === ORDER_STATUS.DELIVERED
  )
  
  const invalidOrders = filteredOrders.filter(order =>
    order.status === ORDER_STATUS.WRONG_NUMBER ||
    order.status === ORDER_STATUS.DOUBLE
  )
  
  const validOrdersCount = filteredOrders.length - invalidOrders.length
  const rate = validOrdersCount > 0 
    ? (confirmedOrders.length / validOrdersCount) * 100 
    : 0
  return `${Math.round(rate)}%`
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
  },
  doubleWrongOrders: '0',
  doubleWrongPercentage: '0%',
  canceledOnlyOrders: '0',
  canceledOnlyPercentage: '0%'
})

const statsArray = computed(() => {
  const orders = filteredOrders.value
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
      value: calculateConfirmationRate(orders),
      icon: 'fas fa-chart-line',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]
})

const productFilter = ref('All')
const dateRange = ref('')
const statusFilter = ref('All')

// Neue computed property für alle verfügbaren Produkte
const availableProducts = computed(() => {
  const productSet = new Set()
  orderStore.orders.forEach(order => {
    if (order.product_name) {
      productSet.add(order.product_name)
    }
  })
  return Array.from(productSet)
})

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
    filtered = filtered.filter(order => order.status === statusFilter.value)
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
  const orders = filteredOrders.value

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
  
  // Calculate total valid orders (ohne NEW, DOUBLE, WRONG_NUMBER)
  const totalValidOrders = user?.role === 'seller'
    ? orders.filter(order => order.user_id === user.id && order.status !== ORDER_STATUS.NEW && order.status !== ORDER_STATUS.DOUBLE && order.status !== ORDER_STATUS.WRONG_NUMBER).length
    : orders.filter(order => order.status !== ORDER_STATUS.NEW && order.status !== ORDER_STATUS.DOUBLE && order.status !== ORDER_STATUS.WRONG_NUMBER).length
  
  // Calculate Confirmed Percentage (now based on valid orders)
  const confirmedPercentage = totalValidOrders > 0
    ? (confirmedOrders.length / totalValidOrders) * 100
    : 0
  stats.value.confirmedPercentage = `${Math.round(confirmedPercentage)}%`

  // Calculate Delivered Orders
  const deliveredOrders = user?.role === 'seller'
    ? orders.filter(order => order.status === ORDER_STATUS.DELIVERED && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.DELIVERED)
  stats.value.deliveredOrders = deliveredOrders.length.toString()
  
  // Calculate Delivered Percentage (now based on confirmed orders)
  const deliveredPercentage = confirmedOrders.length > 0
    ? (deliveredOrders.length / confirmedOrders.length) * 100
    : 0
  stats.value.deliveredPercentage = `${Math.round(deliveredPercentage)}% of Confirmed Orders`

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
  stats.value.canceledPercentage = `${Math.round(canceledPercentage)}%`

  // Double/Wrong Number Orders
  const doubleWrongOrders = user?.role === 'seller'
    ? orders.filter(order => 
        (order.status === ORDER_STATUS.DOUBLE || 
         order.status === ORDER_STATUS.WRONG_NUMBER) && 
        order.user_id === user.id
      )
    : orders.filter(order => 
        order.status === ORDER_STATUS.DOUBLE || 
        order.status === ORDER_STATUS.WRONG_NUMBER
      )
  stats.value.doubleWrongOrders = doubleWrongOrders.length.toString()

  const doubleWrongPercentage = totalValidOrders > 0
    ? (doubleWrongOrders.length / totalValidOrders) * 100
    : 0
  stats.value.doubleWrongPercentage = `${Math.round(doubleWrongPercentage)}%`

  // Canceled Orders (nur Status CANCELED)
  const canceledOnlyOrders = user?.role === 'seller'
    ? orders.filter(order => order.status === ORDER_STATUS.CANCELED && order.user_id === user.id)
    : orders.filter(order => order.status === ORDER_STATUS.CANCELED)
  stats.value.canceledOnlyOrders = canceledOnlyOrders.length.toString()

  const canceledOnlyPercentage = totalValidOrders > 0
    ? (canceledOnlyOrders.length / totalValidOrders) * 100
    : 0
  stats.value.canceledOnlyPercentage = `${Math.round(canceledOnlyPercentage)}%`

  // Total Revenue and Leads
  if (user?.role === 'seller') {
    const sellerOrders = orders.filter(order => order.user_id === user.id)
    const totalRevenue = sellerOrders.reduce((sum, order) => sum + order.total_amount, 0)
    stats.value.totalRevenue = formatPrice(totalRevenue)
    stats.value.totalLeads = sellerOrders.length.toString()
  } else {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
    stats.value.totalRevenue = formatPrice(totalRevenue)
    stats.value.totalLeads = orders.length.toString()
  }

  // Confirmation Rate
  const validOrders = user?.role === 'seller'
    ? orders.filter(order => order.user_id === user.id)
    : orders

  const confirmedCount = confirmedOrders.length
  const validOrdersCount = validOrders.length - invalidOrders.length
  const confirmationRate = validOrdersCount > 0
    ? (confirmedCount / validOrdersCount) * 100
    : 0
  stats.value.confirmationRate = {
    leads: confirmedCount.toString(),
    percentage: `${Math.round(confirmationRate)}%`,
    period: 'All of Time'
  }

  // Delivery Rate
  const deliveryRatePercentage = confirmedCount > 0
    ? (deliveredOrders.length * 100) / confirmedCount
    : 0
  stats.value.deliveryRate = {
    orders: deliveredOrders.length.toString(),
    percentage: `${Math.round(deliveryRatePercentage)}%`,
    period: 'All of Time'
  }

  // Correct vs Wrong Leads
  const wrongStatusOrders = orders.filter(order => 
    [ORDER_STATUS.CANCELED, ORDER_STATUS.WRONG_NUMBER, ORDER_STATUS.REPORTED, ORDER_STATUS.DOUBLE].includes(order.status)
  )
  const correctStatusOrders = orders.filter(order => !wrongStatusOrders.includes(order))

  correctLeads.value = {
    count: correctStatusOrders.length,
    percentage: `${Math.round((correctStatusOrders.length / orders.length) * 100)}%`,
    label: 'Correct Leads'
  }

  wrongLeads.value = {
    count: wrongStatusOrders.length,
    percentage: `${Math.round((wrongStatusOrders.length / orders.length) * 100)}%`,
    label: 'Wrong & Duplicated Leads'
  }

  // Product Leads
  const productStats = new Map()
  orders.forEach(order => {
    const productId = String(order.product_id)
    const product = productStore.products.find(p => String(p.uuid) === productId)
    const stats = productStats.get(productId) || {
      totalOrders: 0,
      confirmedOrders: 0,
      deliveredOrders: 0,
      deliveredQuantity: 0,
      invalidOrders: 0,
      productName: product?.name || order.product_name || `Product ${productId}`,
      productId: productId,
      initialStock: product?.stock || 0
    }
    stats.totalOrders++
    
    if (order.status === ORDER_STATUS.CONFIRMED || 
        order.status === ORDER_STATUS.SHIPPED || 
        order.status === ORDER_STATUS.DELIVERED) {
      stats.confirmedOrders++
    }
    if (order.status === ORDER_STATUS.DELIVERED) {
      stats.deliveredOrders++
      stats.deliveredQuantity += order.quantity || 1
    }
    if (order.status === ORDER_STATUS.WRONG_NUMBER || 
        order.status === ORDER_STATUS.DOUBLE) {
      stats.invalidOrders++
    }
    productStats.set(productId, stats)
  })

  productLeads.value = Array.from(productStats.entries()).map(([name, stats]) => {
    const validOrders = stats.count - stats.invalid
    const confirmationRate = validOrders > 0 
      ? (stats.confirmed / validOrders) * 100 
      : 0
    
    return {
      name,
      count: stats.count,
      total: stats.total,
      percentage: `${Math.round((stats.count / orders.length) * 100)}%`,
      percentValue: stats.count / orders.length,
      confirmationRate: `${Math.round(confirmationRate)}%`
    }
  })
  // Nach Prozentwert absteigend sortieren
  productLeads.value.sort((a, b) => b.percentValue - a.percentValue)
}

// Watch for filter changes
watch([productFilter, statusFilter, dateRange], () => {
  calculateStats()
}, { deep: true })

onMounted(async () => {
  await orderStore.fetchOrders()
  await productStore.fetchProducts()
  calculateStats()
  fetchStaffConfirmation()
  drawOrdersLast7DaysChart()
  drawConfirmationRateChart()
})

function drawOrdersLast7DaysChart() {
  const ctx = document.getElementById('ordersLast7DaysChart') as HTMLCanvasElement
  if (!ctx) return
  const days = getLast7Days()
  const ordersByDate = getOrdersByDate(orderStore.orders)
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(date => new Date(date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: 'Orders',
        data: ordersByDate,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

// Add the computed property for confirmed orders total
const confirmedOrdersTotal = computed(() => {
  let orders = authStore.user?.role === 'seller'
    ? orderStore.orders.filter(order => order.user_id === authStore.user?.id)
    : orderStore.orders

  // Apply product filter
  if (productFilter.value !== 'All') {
    orders = orders.filter(order => order.product_name === productFilter.value)
  }

  return orders
    .filter(order => 
      order.status === ORDER_STATUS.CONFIRMED || 
      order.status === ORDER_STATUS.SHIPPED || 
      order.status === ORDER_STATUS.DELIVERED
    )
    .reduce((sum, order) => sum + order.total_amount, 0)
})

// Add new computed properties
const deliveredOrdersTotal = computed(() => {
  let orders = authStore.user?.role === 'seller'
    ? orderStore.orders.filter(order => order.user_id === authStore.user?.id)
    : orderStore.orders

  // Apply product filter
  if (productFilter.value !== 'All') {
    orders = orders.filter(order => order.product_name === productFilter.value)
  }

  return orders
    .filter(order => order.status === ORDER_STATUS.DELIVERED)
    .reduce((sum, order) => sum + order.total_amount, 0)
})

const shippedOrdersTotal = computed(() => {
  let orders = authStore.user?.role === 'seller'
    ? orderStore.orders.filter(order => order.user_id === authStore.user?.id)
    : orderStore.orders

  // Apply product filter
  if (productFilter.value !== 'All') {
    orders = orders.filter(order => order.product_name === productFilter.value)
  }

  return orders
    .filter(order => order.status === ORDER_STATUS.SHIPPED)
    .reduce((sum, order) => sum + order.total_amount, 0)
})

// Hilfsfunktion: Confirmation Rate für die letzten 7 Tage
const getLast7Days = () => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

const getOrdersByDate = (orders: Order[], status: number | null = null) => {
  const days = getLast7Days()
  const ordersByDate = new Array(7).fill(0)
  
  orders.forEach(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0]
    const dayIndex = days.indexOf(orderDate)
    if (dayIndex !== -1 && (!status || order.status === status)) {
      ordersByDate[dayIndex]++
    }
  })
  
  return ordersByDate
}

const createChart = (canvasId: string, data: number[], label: string) => {
  const ctx = document.getElementById(canvasId) as HTMLCanvasElement
  if (!ctx) return

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: getLast7Days().map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [{
        label: label,
        data: data,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

// Watch für die Diagramme
watch(() => orderStore.orders, () => {
  const allOrders = getOrdersByDate(orderStore.orders)
  const confirmedOrders = getOrdersByDate(orderStore.orders, ORDER_STATUS.CONFIRMED)
  const deliveredOrders = getOrdersByDate(orderStore.orders, ORDER_STATUS.DELIVERED)

  createChart('allOrdersChart', allOrders, 'All Orders')
  createChart('confirmedOrdersChart', confirmedOrders, 'Confirmed Orders')
  createChart('deliveredOrdersChart', deliveredOrders, 'Delivered Orders')
}, { immediate: true })

const staffConfirmation = ref({
  confirmed: 0,
  handled: 0,
  rate: 0
})

const fetchStaffConfirmation = async () => {
  if (!isStaff.value || !authStore.user?.user_id) return

  // 1. Hole das früheste Datum aus order_history für diesen Staff
  const { data: minDateData, error: minDateError } = await supabase
    .from('order_history')
    .select('changed_at')
    .eq('changed_by', authStore.user.user_id)
    .order('changed_at', { ascending: true })
    .limit(1)
    .single()
  if (minDateError || !minDateData) return
  const minDate = minDateData.changed_at

  // 2. Anzahl bestätigter Bestätigungen (new_status = 11) ab minDate
  const { data: confirmedHistory, error: errorConfirmed } = await supabase
    .from('order_history')
    .select('order_id, new_status')
    .eq('changed_by', authStore.user.user_id)
    .eq('new_status', 11)
    .gte('changed_at', minDate)
  if (errorConfirmed) return

  // 3. Alle bearbeiteten Bestätigungen ab minDate (ohne NEW, DOUBLE, WRONG_NUMBER)
  const { data: handledHistory, error: errorHandled } = await supabase
    .from('order_history')
    .select('order_id, new_status')
    .eq('changed_by', authStore.user.user_id)
    .gte('changed_at', minDate)
  if (errorHandled) return

  // Zähler: eindeutige Orders mit mindestens einer Bestätigung
  const confirmedOrderIds = new Set(confirmedHistory.map(h => h.order_id))
  // Nenner: eindeutige Orders mit mindestens einer gültigen Bearbeitung
  const validHandledOrderIds = new Set(
    handledHistory
      .filter(h => ![1, 15, 14].includes(h.new_status)) // 1=NEW, 15=DOUBLE, 14=WRONG_NUMBER
      .map(h => h.order_id)
  )
  // Zähler: nur Orders, die im Set der gültig bearbeiteten Orders UND im Set der bestätigten Orders sind
  const confirmed = Array.from(validHandledOrderIds).filter(orderId => confirmedOrderIds.has(orderId)).length;
  const handled = validHandledOrderIds.size;
  staffConfirmation.value = {
    confirmed,
    handled,
    rate: handled > 0 ? Math.round((confirmed / handled) * 100) : 0
  }
}

const productPerformanceStats = computed(() => {
  const orders = orderStore.orders
  const products = productStore.products
  const totalOrders = orders.length
  const productMap = new Map()

  orders.forEach(order => {
    // Produkt anhand des Namens suchen
    const product = products.find(p => p.name === order.product_name)
    const stats = productMap.get(order.product_name) || {
      totalOrders: 0,
      confirmedOrders: 0,
      deliveredOrders: 0,
      deliveredQuantity: 0,
      invalidOrders: 0,
      productName: order.product_name,
      productId: order.product_name,
      initialStock: product?.stock || 0
    }
    stats.totalOrders++
    
    if (order.status === ORDER_STATUS.CONFIRMED || 
        order.status === ORDER_STATUS.SHIPPED || 
        order.status === ORDER_STATUS.DELIVERED) {
      stats.confirmedOrders++
    }
    if (order.status === ORDER_STATUS.DELIVERED) {
      stats.deliveredOrders++
      stats.deliveredQuantity += order.quantity || 1
    }
    if (order.status === ORDER_STATUS.WRONG_NUMBER || 
        order.status === ORDER_STATUS.DOUBLE) {
      stats.invalidOrders++
    }
    productMap.set(order.product_name, stats)
  })

  return Array.from(productMap.entries())
    .map(([productName, stats]) => {
      // NEW Orders nicht mitzählen
      const newOrdersCount = orders.filter(order => order.product_name === productName && order.status === ORDER_STATUS.NEW).length
      const validOrdersCount = stats.totalOrders - stats.invalidOrders - newOrdersCount
      const confirmationRate = validOrdersCount > 0 
        ? (stats.confirmedOrders / validOrdersCount) * 100 
        : 0
      const deliveryRate = stats.confirmedOrders > 0
        ? (stats.deliveredOrders / stats.confirmedOrders) * 100
        : 0
      const percentOfTotal = totalOrders > 0 ? (stats.totalOrders / totalOrders) * 100 : 0
      return {
        productName,
        totalOrders: stats.totalOrders,
        initialStock: stats.initialStock,
        deliveredQuantity: stats.deliveredQuantity,
        confirmationRate: confirmationRate.toFixed(1),
        deliveredRate: deliveryRate.toFixed(1),
        percentOfTotal: percentOfTotal.toFixed(1)
      }
    })
    .sort((a, b) => b.totalOrders - a.totalOrders)
})

function drawConfirmationRateChart() {
  const ctx = document.getElementById('confirmationRateChart') as HTMLCanvasElement
  if (!ctx) return
  const days = getLast7Days()
  const data = getConfirmationRateByDate()
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(date => new Date(date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: 'Confirmation Rate',
        data: data,
        borderColor: 'rgb(34,197,94)',
        backgroundColor: 'rgba(34,197,94,0.2)',
        tension: 0.2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 10,
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  })
}

const getConfirmationRateByDate = () => {
  const days = getLast7Days()
  const orders = orderStore.orders
  return days.map(day => {
    const ordersOfDay = orders.filter(order => order.created_at.startsWith(day))
    const invalid = ordersOfDay.filter(order => order.status === ORDER_STATUS.WRONG_NUMBER || order.status === ORDER_STATUS.DOUBLE)
    const validCount = ordersOfDay.length - invalid.length
    const confirmed = ordersOfDay.filter(order =>
      order.status === ORDER_STATUS.CONFIRMED ||
      order.status === ORDER_STATUS.SHIPPED ||
      order.status === ORDER_STATUS.DELIVERED
    )
    const rate = validCount > 0 ? (confirmed.length / validCount) * 100 : 0
    return Math.round(rate)
  })
}
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
          <option v-for="product in availableProducts" :key="product">{{ product }}</option>
        </select>
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
            <h3 class="text-lg font-medium text-gray-900">Your Confirmation Rate</h3>
            <p class="text-2xl font-bold text-green-600 mt-2">{{ staffConfirmation.rate }}%</p>
            <p class="text-lg text-gray-600 mt-1">({{ staffConfirmation.confirmed }} of {{ staffConfirmation.handled }} confirmations)</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-chart-line text-6xl"></i>
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
            <p class="text-lg font-bold text-green-600 mt-1" v-if="!isStaff">{{ formatPrice(confirmedOrdersTotal) }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-check-circle text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Double/Wrong Number Orders -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Double/Wrong Number</h3>
            <p class="text-2xl font-bold text-red-600 mt-2">{{ stats.doubleWrongOrders }}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">{{ stats.doubleWrongPercentage }} of Total Orders</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-red-600">
            <i class="fas fa-clone text-6xl"></i>
          </div>
        </div>
      </div>

      <!-- Canceled Orders (nur Status CANCELED) -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Canceled Orders</h3>
            <p class="text-2xl font-bold text-red-600 mt-2">{{ stats.canceledOnlyOrders }}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">{{ stats.canceledOnlyPercentage }} of Total Orders</p>
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
            <p class="text-lg font-bold text-purple-600 mt-1" v-if="!isStaff">{{ formatPrice(shippedOrdersTotal) }}</p>
          </div>
          <div class="w-24 h-24 flex items-center justify-center text-purple-600">
            <i class="fas fa-truck-loading text-6xl"></i>
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
            <p class="text-lg font-bold text-green-600 mt-1" v-if="!isStaff">{{ formatPrice(deliveredOrdersTotal) }}</p>
        </div>
          <div class="w-24 h-24 flex items-center justify-center text-green-600">
            <i class="fas fa-box text-6xl"></i>
        </div>
        </div>
      </div>
    </div>

    <!-- Staff Stats -->
    <div v-if="isStaff" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Entferne die Statistik-Karten hier -->
    </div>

    <!-- Additional Stats (Only for non-staff users) -->
    <div v-if="!isStaff">
      <!-- Product Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Orders last 7 days Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Orders (Last 7 Days)</h3>
          <div class="h-64">
            <canvas id="ordersLast7DaysChart"></canvas>
          </div>
        </div>

        <!-- Confirmation Rate Chart (letzte 7 Tage) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Confirmation Rate (Last 7 Days)</h3>
          <div class="h-64">
            <canvas id="confirmationRateChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Product Performance Tabelle -->
      <div class="bg-white rounded-lg shadow p-6 mt-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-lg font-medium text-gray-900">Product Performance</h2>
            <div class="text-sm text-gray-500">Total Leads: {{ orderStore.orders.length }}</div>
          </div>
          <div class="text-sm text-gray-500">
            {{ productStore.products.length }} Products Total
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">Product</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">% of Total Orders</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Orders</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Initial Stock</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Delivered</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Confirmation Rate</th>
                <th class="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Delivered Rate</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="product in productPerformanceStats" :key="'product-' + product.productId" class="hover:bg-gray-50">
                <td class="px-3 py-4 whitespace-nowrap text-base font-bold text-gray-900 max-w-[200px] truncate">
                  {{ product.productName }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {{ product.percentOfTotal }}%
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {{ product.totalOrders }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {{ product.initialStock }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {{ product.deliveredQuantity }}
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