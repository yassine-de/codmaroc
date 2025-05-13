<template>
  <div class="max-w-full mx-auto px-4 py-8">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- Pending -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <i class="fas fa-clock text-xl"></i>
          </div>
          <div class="ml-4">
            <h2 class="text-4xl font-bold text-gray-900">{{ stats.pending.count }}</h2>
            <p class="text-sm text-gray-500">{{ stats.pending.label }}</p>
          </div>
        </div>
      </div>

      <!-- Approved -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <i class="fas fa-check text-xl"></i>
          </div>
          <div class="ml-4">
            <h2 class="text-4xl font-bold text-gray-900">{{ stats.approved.count }}</h2>
            <p class="text-sm text-gray-500">{{ stats.approved.label }}</p>
          </div>
        </div>
      </div>

      <!-- Processing -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600">
            <i class="fas fa-cog text-xl"></i>
          </div>
          <div class="ml-4">
            <h2 class="text-4xl font-bold text-gray-900">{{ stats.processing.count }}</h2>
            <p class="text-sm text-gray-500">{{ stats.processing.label }}</p>
          </div>
        </div>
      </div>

      <!-- Completed -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600">
            <i class="fas fa-check-double text-xl"></i>
          </div>
          <div class="ml-4">
            <h2 class="text-4xl font-bold text-gray-900">{{ stats.completed.count }}</h2>
            <p class="text-sm text-gray-500">{{ stats.completed.label }}</p>
          </div>
        </div>
      </div>
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
      </div>

      <div class="flex items-center space-x-4">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search..."
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
        />
        <button
          @click="showAddModal = true"
          class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center space-x-2"
        >
          <i class="fas fa-plus"></i>
          <span>ADD REQUEST</span>
        </button>
      </div>
    </div>

    <!-- Requests Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in paginatedRequests" :key="request.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{{ request.sourcing_id }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <img src="https://via.placeholder.com/40" alt="" class="h-10 w-10 rounded-full" />
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ request.product_name }}</div>
                  <div class="text-sm text-gray-500">{{ request.product_code }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="space-y-1">
                <a :href="request.product_link" target="_blank" class="text-black hover:text-gray-800 text-sm flex items-center">
                  <i class="fas fa-link mr-1"></i>
                  Product
                </a>
                <a :href="request.video_link" target="_blank" class="text-black hover:text-gray-800 text-sm flex items-center">
                  <i class="fas fa-video mr-1"></i>
                  Video
                </a>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ request.quantity }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="['px-2 py-1 text-xs rounded-full', getStatusColor(request.status)]">
                {{ request.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ request.note }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(request.created_at).toLocaleDateString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button @click="openEditModal(request)" class="text-blue-600 hover:text-blue-800">
                ✏️
              </button>
              <button @click="handleDeleteRequest(request.id)" class="text-red-600 hover:text-red-800">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-700">
          Showing {{ (currentPage - 1) * Number(itemsPerPage) + 1 }} to {{ Math.min(currentPage * Number(itemsPerPage), filteredRequests.value.length) }} of {{ filteredRequests.value.length }} entries
        </div>
        <div class="flex space-x-2">
          <button @click="currentPage--" :disabled="currentPage === 1" class="btn-secondary px-3 py-1 text-sm">Previous</button>
          <button class="bg-black text-white px-3 py-1 rounded text-sm">{{ currentPage }}</button>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="btn-secondary px-3 py-1 text-sm">Next</button>
        </div>
      </div>
    </div>

    <!-- Add Request Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Add New Request</h2>
        <form @submit.prevent="handleAddRequest" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              v-model="newRequest.product_name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Product Code</label>
            <input
              v-model="newRequest.product_code"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Product Link</label>
            <input
              v-model="newRequest.product_link"
              type="url"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Video Link</label>
            <input
              v-model="newRequest.video_link"
              type="url"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              v-model.number="newRequest.quantity"
              type="number"
              min="1"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Note</label>
            <textarea
              v-model="newRequest.note"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            ></textarea>
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
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Add Request
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Request Modal -->
    <div v-if="showEditModal && editingRequest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Edit Request #{{ editingRequest.sourcing_id }}</h2>
        <form @submit.prevent="handleEditRequest" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              v-model="editingRequest.product_name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Product Code</label>
            <input
              v-model="editingRequest.product_code"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Product Link</label>
            <input
              v-model="editingRequest.product_link"
              type="url"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Video Link</label>
            <input
              v-model="editingRequest.video_link"
              type="url"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              v-model.number="editingRequest.quantity"
              type="number"
              min="1"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Status</label>
            <select
              v-model="editingRequest.status"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Note</label>
            <textarea
              v-model="editingRequest.note"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useSourcingStore, type SourcingRequest } from '../stores/sourcing'

const sourcingStore = useSourcingStore()
const searchQuery = ref('')
const itemsPerPage = ref(10)
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(filteredRequests.value.length / Number(itemsPerPage.value)))
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingRequest = ref<SourcingRequest | null>(null)

const stats = ref({
  pending: {
    count: 0,
    label: 'Pending Requests'
  },
  approved: {
    count: 0,
    label: 'Approved Requests'
  },
  processing: {
    count: 0,
    label: 'Processing Requests'
  },
  completed: {
    count: 0,
    label: 'Completed Requests'
  }
})

// New request form data
const newRequest = ref({
  product_name: '',
  product_code: '',
  product_link: '',
  video_link: '',
  quantity: 100,
  note: '',
  status: 'Pending' as SourcingRequest['status']
})

const filteredRequests = computed(() => {
  let filtered = sourcingStore.requests
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r =>
      r.product_name.toLowerCase().includes(query) ||
      r.product_code?.toLowerCase().includes(query) ||
      r.note?.toLowerCase().includes(query)
    )
  }
  return filtered
})
const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * Number(itemsPerPage.value)
  const end = start + Number(itemsPerPage.value)
  return filteredRequests.value.slice(start, end)
})

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-blue-100 text-blue-800'
    case 'processing':
      return 'bg-purple-100 text-purple-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'canceled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Handle form submission
const handleAddRequest = async () => {
  try {
    await sourcingStore.addRequest({
      product_name: newRequest.value.product_name,
      product_code: newRequest.value.product_code,
      product_link: newRequest.value.product_link,
      video_link: newRequest.value.video_link,
      quantity: newRequest.value.quantity,
      status: newRequest.value.status,
      note: newRequest.value.note
    })

    // Reset form and close modal
    newRequest.value = {
      product_name: '',
      product_code: '',
      product_link: '',
      video_link: '',
      quantity: 100,
      note: '',
      status: 'Pending'
    }
    showAddModal.value = false
  } catch (error) {
    console.error('Error adding request:', error)
  }
}

const handleEditRequest = async () => {
  if (!editingRequest.value) return

  try {
    await sourcingStore.updateRequest(editingRequest.value.id, {
      product_name: editingRequest.value.product_name,
      product_code: editingRequest.value.product_code,
      product_link: editingRequest.value.product_link,
      video_link: editingRequest.value.video_link,
      quantity: editingRequest.value.quantity,
      status: editingRequest.value.status,
      note: editingRequest.value.note
    })

    showEditModal.value = false
    editingRequest.value = null
  } catch (error) {
    console.error('Error updating request:', error)
  }
}

const handleDeleteRequest = async (id: string) => {
  if (confirm('Are you sure you want to delete this request?')) {
    try {
      await sourcingStore.deleteRequest(id)
    } catch (error) {
      console.error('Error deleting request:', error)
    }
  }
}

const openEditModal = (request: SourcingRequest) => {
  editingRequest.value = { ...request }
  showEditModal.value = true
}

watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

onMounted(async () => {
  await sourcingStore.fetchRequests()
})
</script>