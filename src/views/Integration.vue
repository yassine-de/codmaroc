<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useIntegrationStore, type Integration } from '../stores/integration'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

const authStore = useAuthStore()
const integrationStore = useIntegrationStore()
const isAdmin = computed(() => authStore.user?.role === 1)

const loading = ref(false)
const error = ref('')
const success = ref('')
const searchQuery = ref('')

// Add Sheet Modal
const showAddModal = ref(false)
const newSheet = ref({
  sellerId: '',
  spreadsheetId: '',
  sheetName: ''
})

// Fetch sellers
const sellers = ref([])
const fetchSellers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 3) // Only fetch sellers
      .order('name')

    if (error) throw error
    sellers.value = data || []
  } catch (error) {
    console.error('Error fetching sellers:', error)
  }
}

// Filter integrations based on search query
const filteredIntegrations = computed(() => {
  if (!searchQuery.value) return integrationStore.integrations

  const query = searchQuery.value.toLowerCase()
  return integrationStore.integrations.filter(integration => 
    integration.spreadsheet_name.toLowerCase().includes(query) ||
    integration.sheet_name.toLowerCase().includes(query) ||
    integration.user?.name?.toLowerCase().includes(query) ||
    integration.user?.email?.toLowerCase().includes(query)
  )
})

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

const handleAddSheet = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    
    if (isAdmin.value && !newSheet.value.sellerId) {
      throw new Error('Please select a seller')
    }

    let userId: number | undefined = undefined;
    if (isAdmin.value) {
      userId = parseInt(newSheet.value.sellerId);
    } else {
      // Hole die numerische ID für den eingeloggten User
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authStore.user?.id)
        .single();
      userId = userData?.id;
    }

    await integrationStore.connectGoogleSheets({
      spreadsheetId: newSheet.value.spreadsheetId,
      sheetName: newSheet.value.sheetName,
      userId
    })
    
    success.value = 'Sheet connected successfully!'
    showAddModal.value = false
    newSheet.value = {
      sellerId: '',
      spreadsheetId: '',
      sheetName: ''
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to connect sheet'
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

    const stats = await integrationStore.handleSync(integration)
    if (stats) {
      let message = `Sync completed!\nnew orders: ${stats.new}\nskipped orders: ${stats.skipped}`
      if (stats.skippedExistingOrders > 0) {
        message += `\n- ${stats.skippedExistingOrders} orders already exist`
      }
      if (stats.skippedSkus && stats.skippedSkus.length > 0) {
        const uniqueSkus = [...new Set(stats.skippedSkus)]
        const skippedDueToMissingProducts = stats.skipped - stats.skippedExistingOrders
        message += `\n- ${skippedDueToMissingProducts} orders skipped due to missing products: ${uniqueSkus.join(', ')}`
      }
      success.value = message
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to sync with Google Sheets'
  } finally {
    loading.value = false
  }
}

const handleSyncAll = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    let totalNew = 0
    let totalSkipped = 0
    let totalSkippedExisting = 0
    let allSkippedSkus: string[] = []

    for (const integration of integrationStore.integrations) {
      try {
        const stats = await integrationStore.handleSync(integration)
        if (stats) {
          totalNew += stats.new
          totalSkipped += stats.skipped
          totalSkippedExisting += stats.skippedExistingOrders
          if (stats.skippedSkus) {
            allSkippedSkus = [...allSkippedSkus, ...stats.skippedSkus]
          }
        }
      } catch (err) {
        console.error(`Error syncing integration ${integration.id}:`, err)
      }
    }

    let message = `Sync completed!\nnew orders: ${totalNew}\nskipped orders: ${totalSkipped}`
    if (totalSkippedExisting > 0) {
      message += `\n- ${totalSkippedExisting} orders already exist`
    }
    if (allSkippedSkus.length > 0) {
      const uniqueSkus = [...new Set(allSkippedSkus)]
      const skippedDueToMissingProducts = totalSkipped - totalSkippedExisting
      message += `\n- ${skippedDueToMissingProducts} orders skipped due to missing products: ${uniqueSkus.join(', ')}`
    }
    success.value = message
  } catch (err: any) {
    error.value = err.message || 'Failed to sync all sheets'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await integrationStore.fetchIntegrations()
  if (isAdmin.value) {
    await fetchSellers()
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Google Sheets Integration</h1>
        <p class="text-sm text-gray-500">Manage your connected sheets</p>
      </div>
      <div class="flex space-x-4">
        <button
          @click="handleSyncAll"
          :disabled="loading"
          class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
        >
          <i class="fas fa-sync-alt mr-2" :class="{ 'animate-spin': loading }"></i>
          SYNC ALL
        </button>
        <button
          @click="showAddModal = true"
          class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center"
        >
          <i class="fas fa-plus mr-2"></i>
          ADD SHEET
        </button>
        <a
          href="https://docs.google.com/spreadsheets/d/1h58JB7K1ueNqgK_Qt9-9_PPC8GuEi1Ow3M5h8uOucIE/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
        >
          <i class="fas fa-file-excel mr-2"></i>
          TEMPLATE
        </a>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md whitespace-pre-line">{{ success }}</div>
    <div v-if="integrationStore.syncStats && (integrationStore.syncStats.skippedExistingOrders > 0 || integrationStore.syncStats.skippedSkus?.length > 0 || integrationStore.syncStats.invalidData?.length > 0)" class="mb-4 p-4 bg-yellow-50 text-yellow-700 rounded-md">
      <h3 class="font-semibold mb-2">Übersprungene Leads:</h3>
      <ul class="list-disc pl-5">
        <li v-if="integrationStore.syncStats.skippedExistingOrders > 0">
          {{ integrationStore.syncStats.skippedExistingOrders }} Leads wurden übersprungen, da sie bereits existieren
        </li>
        <li v-if="integrationStore.syncStats.skippedSkus?.length > 0">
          {{ integrationStore.syncStats.skippedSkus.length }} Leads wurden übersprungen, da die Produkte nicht gefunden wurden:
          <ul class="list-disc pl-5 mt-1">
            <li v-for="sku in [...new Set(integrationStore.syncStats.skippedSkus)]" :key="sku">
              SKU: {{ sku }}
            </li>
          </ul>
        </li>
        <li v-if="integrationStore.syncStats.invalidData?.length > 0">
          {{ integrationStore.syncStats.invalidData.length }} Leads wurden übersprungen aufgrund fehlerhafter Daten:
          <table class="mt-2 min-w-full border border-yellow-300 text-xs">
            <thead class="bg-yellow-100">
              <tr>
                <th class="border border-yellow-300 px-2 py-1 text-left">Zeile</th>
                <th class="border border-yellow-300 px-2 py-1 text-left">Name</th>
                <th class="border border-yellow-300 px-2 py-1 text-left">Telefon</th>
                <th class="border border-yellow-300 px-2 py-1 text-left">SKU</th>
                <th class="border border-yellow-300 px-2 py-1 text-left">Grund</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in integrationStore.syncStats.invalidData" :key="index">
                <td class="border border-yellow-300 px-2 py-1">{{ item.row }}</td>
                <td class="border border-yellow-300 px-2 py-1">{{ item.data.name }}</td>
                <td class="border border-yellow-300 px-2 py-1">{{ item.data.phone }}</td>
                <td class="border border-yellow-300 px-2 py-1">{{ item.data.sku }}</td>
                <td class="border border-yellow-300 px-2 py-1">{{ item.reason }}</td>
              </tr>
            </tbody>
          </table>
        </li>
      </ul>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search sheets..."
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black pl-10"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i class="fas fa-search text-gray-400"></i>
        </div>
      </div>
    </div>

    <!-- Integrations Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sheet Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Synced</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Sync</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(integration, index) in filteredIntegrations" :key="integration.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ index + 1 }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ integration.spreadsheet_name }}</div>
              <div class="text-sm text-gray-500">Sheet: {{ integration.sheet_name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ integration.user?.name }}</div>
              <div class="text-sm text-gray-500">{{ integration.user?.email }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(integration.created_at) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ integration.last_sync_at ? formatDate(integration.last_sync_at) : 'Never' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'px-2 py-1 text-xs rounded-full',
                  integration.auto_sync ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                ]"
              >
                {{ integration.auto_sync ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                @click="handleSync(integration)"
                class="text-purple-600 hover:text-purple-800"
                title="Sync Now"
              >
                <i class="fas fa-sync-alt"></i>
              </button>
              <button
                @click="handleDelete(integration)"
                class="text-red-600 hover:text-red-800"
                title="Delete Integration"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Sheet Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Add New Sheet</h2>
        <form @submit.prevent="handleAddSheet" class="space-y-4">
          <!-- Seller Selection (Admin Only) -->
          <div v-if="isAdmin">
            <label class="block text-sm font-medium text-gray-700">Select Seller</label>
            <select
              v-model="newSheet.sellerId"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="">Choose a seller</option>
              <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
                {{ seller.name }} ({{ seller.email }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Spreadsheet ID</label>
            <input
              v-model="newSheet.spreadsheetId"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              placeholder="Enter Google Spreadsheet ID"
            />
            <p class="mt-1 text-sm text-gray-500">
              The spreadsheet must be publicly accessible (Anyone with the link can view)
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Sheet Name</label>
            <input
              v-model="newSheet.sheetName"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              placeholder="Enter Sheet Name"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showAddModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              {{ loading ? 'Connecting...' : 'Connect Sheet' }}
            </button>
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