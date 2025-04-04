<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Google Sheets Integration</h1>

      <!-- Error/Success Messages -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
      <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">{{ success }}</div>

      <!-- Connection Form -->
      <form @submit.prevent="handleConnect" class="space-y-4 mb-8">
        <div>
          <label class="block text-sm font-medium text-gray-700">Spreadsheet ID</label>
          <input
            v-model="spreadsheetId"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            placeholder="Enter Google Spreadsheet ID"
          />
          <p class="mt-1 text-sm text-gray-500">
            Add service account email (codservice@codservice.iam.gserviceaccount.com) as an editor to your sheet
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Sheet Name</label>
          <input
            v-model="sheetName"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            placeholder="Enter Sheet Name"
          />
        </div>
        <div>
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full"
          >
            {{ loading ? 'Connecting...' : 'Connect to Google Sheets' }}
          </button>
        </div>
      </form>

      <!-- Connected Sheets -->
      <div class="space-y-4">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-medium text-gray-900">Connected Sheets</h2>

          <!-- Filters (Admin Only) -->
          <div v-if="isAdmin" class="flex items-center space-x-4">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
            <select
              v-model="sellerFilter"
              class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="">All Sellers</option>
              <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
                {{ seller.name }}
              </option>
            </select>
            <select
              v-model="statusFilter"
              class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="error">Error</option>
              <option value="syncing">Syncing</option>
            </select>
          </div>
        </div>
        
        <div v-if="loading" class="text-center py-4">
          <p class="text-gray-600">Loading integrations...</p>
        </div>
        
        <div v-else-if="filteredIntegrations.length === 0" class="text-center py-4">
          <p class="text-gray-600">No sheets connected yet</p>
        </div>
        
        <div v-else class="space-y-4">
          <div
            v-for="integration in filteredIntegrations"
            :key="integration.id"
            class="border rounded-lg p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-medium">{{ integration.spreadsheet_name }}</h3>
                  <span v-if="isAdmin" class="text-sm text-gray-500">
                    ({{ integration.user?.name || integration.user?.email }})
                  </span>
                </div>
                <p class="text-sm text-gray-500">Sheet: {{ integration.sheet_name }}</p>
                <p class="text-sm text-gray-500">
                  Last synced: {{ formatDate(integration.last_sync_at) || 'Never' }}
                </p>
                
                <!-- Sync Stats -->
                <div v-if="integration.id === lastSyncedId" class="mt-2 text-sm">
                  <p class="text-gray-600">
                    Total rows: {{ syncStats.total }}<br>
                    New orders: {{ syncStats.new }}<br>
                    Skipped: {{ syncStats.skipped }}
                  </p>
                </div>
              </div>
              <div class="space-y-2">
                <button
                  @click="handleSync(integration)"
                  :disabled="loading"
                  class="btn-secondary text-sm w-full"
                >
                  {{ loading && syncingId === integration.id ? 'Syncing...' : 'Sync Now' }}
                </button>
                <button
                  @click="handleDelete(integration)"
                  :disabled="loading"
                  class="text-red-600 hover:text-red-800 text-sm w-full border border-red-600 rounded-md px-3 py-1"
                >
                  Delete Integration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useIntegrationStore, type Integration } from '../stores/integration'
import { format } from 'date-fns'

const authStore = useAuthStore()
const integrationStore = useIntegrationStore()

const loading = ref(false)
const error = ref('')
const success = ref('')
const syncingId = ref<number | null>(null)
const lastSyncedId = ref<number | null>(null)

const spreadsheetId = ref('')
const sheetName = ref('')

// Admin filters
const searchQuery = ref('')
const sellerFilter = ref('')
const statusFilter = ref('')

const syncStats = ref({
  total: 0,
  new: 0,
  skipped: 0
})

// Computed properties
const isAdmin = computed(() => authStore.user?.role === 1)

const sellers = computed(() => {
  const uniqueSellers = new Map()
  integrationStore.integrations.forEach(integration => {
    if (integration.user && !uniqueSellers.has(integration.user.id)) {
      uniqueSellers.set(integration.user.id, integration.user)
    }
  })
  return Array.from(uniqueSellers.values())
})

const filteredIntegrations = computed(() => {
  let filtered = [...integrationStore.integrations]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(integration => 
      integration.spreadsheet_name.toLowerCase().includes(query) ||
      integration.sheet_name.toLowerCase().includes(query) ||
      integration.user?.name?.toLowerCase().includes(query) ||
      integration.user?.email?.toLowerCase().includes(query)
    )
  }

  // Apply seller filter (admin only)
  if (isAdmin.value && sellerFilter.value) {
    filtered = filtered.filter(integration => 
      integration.user_id.toString() === sellerFilter.value
    )
  }

  // Apply status filter
  if (statusFilter.value) {
    filtered = filtered.filter(integration => {
      switch (statusFilter.value) {
        case 'active':
          return integration.auto_sync
        case 'error':
          return integration.last_sync_at && new Date(integration.last_sync_at).getTime() < Date.now() - 10 * 60 * 1000 // 10 minutes
        case 'syncing':
          return syncingId.value === integration.id
        default:
          return true
      }
    })
  }

  return filtered
})

// Methods
const formatDate = (date: string | null) => {
  if (!date) return null
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
}

const handleConnect = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    
    await integrationStore.connectGoogleSheets({
      spreadsheetId: spreadsheetId.value,
      sheetName: sheetName.value
    })
    
    success.value = 'Successfully connected to Google Sheets!'
    spreadsheetId.value = ''
    sheetName.value = ''
  } catch (err: any) {
    error.value = err.message || 'Failed to connect to Google Sheets'
  } finally {
    loading.value = false
  }
}

const handleDelete = async (integration: Integration) => {
  if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
    return
  }

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    await integrationStore.deleteIntegration(integration.id)
    success.value = 'Integration deleted successfully!'
  } catch (err: any) {
    error.value = err.message || 'Failed to delete integration'
  } finally {
    loading.value = false
  }
}

const handleSync = async (integration: Integration) => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    syncingId.value = integration.id

    const result = await integrationStore.handleSync(integration)
    if (result) {
      lastSyncedId.value = integration.id
      syncStats.value = integrationStore.syncStats
      success.value = `Sync completed! ${syncStats.value.new} new orders imported, ${syncStats.value.skipped} orders skipped.`
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to sync with Google Sheets'
  } finally {
    loading.value = false
    syncingId.value = null
  }
}

// Lifecycle hooks
onMounted(async () => {
  await integrationStore.fetchIntegrations()
})

onUnmounted(() => {
  integrationStore.cleanup()
})
</script>