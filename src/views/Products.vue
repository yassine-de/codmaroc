<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useProductStore } from '../stores/products'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import type { Product } from '../stores/products'

const productStore = useProductStore()
const authStore = useAuthStore()
const showAddModal = ref(false)
const editingProduct = ref<Product | null>(null)
const searchQuery = ref('')
const selectedProducts = ref<number[]>([])
const itemsPerPage = ref(10)
const statusFilter = ref('All')
const sortBy = ref('created_at')
const sortOrder = ref('desc')
const success = ref('')
const error = ref('')
const sellers = ref([])
const currentUserId = ref<number | null>(null)
const currentPage = ref(1)

const newProduct = ref({
  name: '',
  description: '',
  price: 0,
  sku: '',
  stock: 0,
  product_link: '',
  video_link: '',
  user_id: null
})

// Computed property für Admin-Check
const isAdmin = computed(() => {
  return authStore.user?.role === 1 // Nur Admin (role 1)
})

// Computed property für Admin/Staff-Check
const isAdminOrStaff = computed(() => {
  const role = authStore.user?.role
  return role === 1 || role === 2 // 1 = Admin, 2 = Staff
})

// Fetch current user's database ID
const fetchCurrentUserId = async () => {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('id')
      .single()

    if (error) throw error
    currentUserId.value = userData.id
  } catch (err) {
    console.error('Error fetching user ID:', err)
  }
}

// Fetch sellers
const fetchSellers = async () => {
  try {
    console.log('Fetching sellers...')
    const { data, error: err } = await supabase
      .from('users')
      .select('id, name, role')
      .in('role', [3]) // Nur Verkäufer (role 3)
      .order('name')
    
    if (err) {
      console.error('Error fetching sellers:', err)
      error.value = 'Error loading sellers'
      return
    }
    
    sellers.value = data || []
    console.log('Fetched sellers:', sellers.value)
  } catch (err) {
    console.error('Error fetching sellers:', err)
    error.value = 'Error loading sellers'
  }
}

// Hilfsfunktion zum Abrufen des Verkäufernamens
const getSellerName = (userId: number) => {
  const seller = sellers.value.find(s => s.id === userId)
  return seller ? seller.name : 'Unknown'
}

// Hilfsfunktion zum Parsen von CSV
function parseCSV(csv: string) {
  const lines = csv.split('\n').filter(Boolean);
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    return {
      sku: values[1],         // Spalte B (SKU)
      remaining: values[5]    // Spalte F (REMAINING)
    };
  });
}

const sheetStockMap = ref<Record<string, string>>({})

async function fetchSheetStock() {
  try {
    const res = await fetch('https://docs.google.com/spreadsheets/d/1hZUPZn6nbekGXRr8hfvhdVTIH21IY3NbjnXIw39LsKU/gviz/tq?tqx=out:csv&sheet=Sheet1');
    const csv = await res.text();
    const rows = parseCSV(csv);
    // Debug: Zeige ein Beispiel
    if (rows.length > 0) {
      console.log('Erste Zeile (bereinigt):', rows[0]);
    }
    // Mapping: SKU -> REMAINING
    const map: Record<string, string> = {};
    rows.forEach(row => {
      if (row.sku && row.remaining) {
        map[row.sku] = row.remaining;
      }
    });
    sheetStockMap.value = map;
  } catch (e) {
    console.error('Fehler beim Laden des Sheets:', e);
  }
}

// Filter and sort products
const allFilteredProducts = computed(() => {
  let filtered = [...productStore.products]
  
  console.log('All products before filtering:', filtered)
  console.log('Current user ID from DB:', currentUserId.value)
  console.log('Is admin or staff:', isAdminOrStaff.value)
  
  // Wenn weder Admin noch Staff, dann nur eigene Produkte anzeigen
  if (!isAdminOrStaff.value) {
    filtered = filtered.filter(product => {
      const isMatch = Number(product.user_id) === Number(currentUserId.value)
      console.log('Comparing product:', {
        product_id: product.id,
        product_user_id: product.user_id,
        current_user_id: currentUserId.value,
        is_match: isMatch
      })
      return isMatch
    })
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    )
  }

  // Apply status filter
  if (statusFilter.value !== 'All') {
    filtered = filtered.filter(product => {
      switch (statusFilter.value) {
        case 'In Stock':
          return product.stock > 0
        case 'Out of Stock':
          return product.stock === 0
        default:
          return true
      }
    })
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0
    switch (sortBy.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'price':
        comparison = a.price - b.price
        break
      case 'stock':
        comparison = a.stock - b.stock
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      default:
        comparison = 0
    }
    return sortOrder.value === 'desc' ? -comparison : comparison
  })

  console.log('Filtered products before pagination:', filtered)
  return filtered
})

const totalPages = computed(() => Math.ceil(allFilteredProducts.value.length / Number(itemsPerPage.value)))
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * Number(itemsPerPage.value)
  const end = start + Number(itemsPerPage.value)
  return allFilteredProducts.value.slice(start, end).map(product => ({
    ...product,
    currentStock: sheetStockMap.value[product.sku] ?? undefined
  }))
})

// Computed properties for form fields
const productName = computed({
  get: () => editingProduct.value ? editingProduct.value.name : newProduct.value.name,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.name = value
    } else {
      newProduct.value.name = value
    }
  }
})

const productDescription = computed({
  get: () => editingProduct.value ? editingProduct.value.description : newProduct.value.description,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.description = value
    } else {
      newProduct.value.description = value
    }
  }
})

const productPrice = computed({
  get: () => editingProduct.value ? editingProduct.value.price : newProduct.value.price,
  set: (value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (editingProduct.value) {
      editingProduct.value.price = numValue
    } else {
      newProduct.value.price = numValue
    }
  }
})

const productSku = computed({
  get: () => editingProduct.value ? editingProduct.value.sku : newProduct.value.sku,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.sku = value
    } else {
      newProduct.value.sku = value
    }
  }
})

const productStock = computed({
  get: () => editingProduct.value ? editingProduct.value.stock : newProduct.value.stock,
  set: (value) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value
    if (editingProduct.value) {
      editingProduct.value.stock = numValue
    } else {
      newProduct.value.stock = numValue
    }
  }
})

const productLink = computed({
  get: () => editingProduct.value ? editingProduct.value.product_link : newProduct.value.product_link,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.product_link = value
    } else {
      newProduct.value.product_link = value
    }
  }
})

const videoLink = computed({
  get: () => editingProduct.value ? editingProduct.value.video_link : newProduct.value.video_link,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.video_link = value
    } else {
      newProduct.value.video_link = value
    }
  }
})

const productUserId = computed({
  get: () => editingProduct.value ? editingProduct.value.user_id : newProduct.value.user_id,
  set: (value) => {
    if (editingProduct.value) {
      editingProduct.value.user_id = value
    } else {
      newProduct.value.user_id = value
    }
  }
})

onMounted(async () => {
  await fetchCurrentUserId()
  await productStore.fetchProducts()
  await fetchSellers()
  await fetchSheetStock()
})

const handleAddProduct = async () => {
  try {
    // Wenn weder Admin noch Staff, dann nutze die aktuelle user_id
    if (!isAdminOrStaff.value) {
      productUserId.value = currentUserId.value
    } else if (!productUserId.value) {
      error.value = 'Please select a seller'
      return
    }

    const productData = {
      name: productName.value,
      description: productDescription.value,
      price: parseFloat(productPrice.value),
      sku: productSku.value,
      stock: parseInt(productStock.value),
      product_link: productLink.value,
      video_link: videoLink.value,
      user_id: isAdminOrStaff.value ? parseInt(productUserId.value) : currentUserId.value
    }

    console.log('Adding product with data:', productData)
    const result = await productStore.addProduct(productData)

    if (result.error) {
      throw result.error
    }

    success.value = 'Product successfully added'
    showAddModal.value = false
    
    // Reload products after successful addition
    await productStore.fetchProducts()
    
    // Reset form
    newProduct.value = {
      name: '',
      description: '',
      price: 0,
      sku: '',
      stock: 0,
      product_link: '',
      video_link: '',
      user_id: null
    }
    error.value = ''
  } catch (err) {
    console.error('Error adding product:', err)
    error.value = 'Error adding product: ' + (err.message || 'Unknown error')
  }
}

const handleUpdateProduct = async () => {
  if (!editingProduct.value) return

  // currentStock entfernen, bevor das Objekt gespeichert wird
  const { currentStock, ...productData } = editingProduct.value

  try {
    await productStore.updateProduct(editingProduct.value.id, productData)
    editingProduct.value = null
  } catch (error) {
    console.error('Error updating product:', error)
  }
}

const handleDeleteProduct = async (id: string) => {
  if (!confirm('Are you sure you want to delete this product?')) return
  
  try {
    await productStore.deleteProduct(id)
    await productStore.fetchProducts() // Reload products after deletion
  } catch (error) {
    console.error('Error deleting product:', error)
  }
}

const handleDeleteSelected = async () => {
  if (!selectedProducts.value.length) return
  
  if (!confirm(`Are you sure you want to delete ${selectedProducts.value.length} selected products?`)) {
    return
  }

  try {
    for (const productId of selectedProducts.value) {
      await productStore.deleteProduct(productId)
    }
    await productStore.fetchProducts() // Reload products after deletion
    selectedProducts.value = []
    success.value = 'Selected products were successfully deleted'
  } catch (error) {
    console.error('Error deleting products:', error)
    error.value = 'Error deleting products'
  }
}

const formatPrice = (price: number) => {
  return `${price.toFixed(2)} $`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

watch([searchQuery, statusFilter, sortBy, sortOrder, itemsPerPage], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Success/Error Messages -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">{{ success }}</div>

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
          <option>All</option>
          <option>In Stock</option>
          <option>Out of Stock</option>
        </select>

        <select
          v-model="sortBy"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="created_at">Created Date</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>

        <button
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          class="p-2 rounded-md hover:bg-gray-100"
        >
          <i :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
        </button>
      </div>

      <div class="flex items-center space-x-4">
        <!-- Delete Selected Button -->
        <button
          v-if="selectedProducts.length > 0"
          @click="handleDeleteSelected"
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
        >
          <i class="fas fa-trash mr-2"></i>
          Delete Selected ({{ selectedProducts.length }})
        </button>

        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search products..."
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
        />

        <button
          @click="showAddModal = true"
          class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center"
        >
          <i class="fas fa-plus mr-2"></i>
          ADD PRODUCT
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="productStore.loading" class="text-center py-12">
      <p class="text-gray-600">Loading products...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="productStore.error" class="bg-red-50 p-4 rounded-md">
      <p class="text-red-700">{{ productStore.error }}</p>
    </div>

    <!-- Products Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto w-full">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  :checked="selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0"
                  :indeterminate="selectedProducts.length > 0 && selectedProducts.length < paginatedProducts.length"
                  @change="e => {
                    const checked = e.target.checked
                    selectedProducts = checked ? paginatedProducts.map(p => p.id) : []
                  }"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th v-if="authStore.user?.role === 1" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Page</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Video</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in paginatedProducts" :key="product.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  v-model="selectedProducts"
                  :value="product.id"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ product.sku }}</td>
              <td v-if="authStore.user?.role === 1" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ getSellerName(Number(product.user_id)) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                <div class="text-sm text-gray-500">{{ product.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatPrice(product.price) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.stock }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.currentStock !== undefined ? product.currentStock : '-' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <a 
                  v-if="product.product_link"
                  :href="product.product_link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800"
                  title="Open Product Page"
                >
                  <i class="fas fa-external-link-alt"></i>
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <a 
                  v-if="product.video_link"
                  :href="product.video_link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800"
                  title="Open Product Video"
                >
                  <i class="fas fa-video"></i>
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.delivered || 0 }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(product.created_at) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button @click="editingProduct = { ...product }" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="handleDeleteProduct(product.id)" class="text-red-600 hover:text-red-800">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="text-sm text-gray-700">
          Showing {{ (currentPage - 1) * Number(itemsPerPage) + 1 }} to {{ Math.min(currentPage * Number(itemsPerPage), allFilteredProducts.length) }} of {{ allFilteredProducts.length }} entries
        </div>
        <div class="flex space-x-2">
          <button @click="currentPage--" :disabled="currentPage === 1" class="btn-secondary px-3 py-1 text-sm">Previous</button>
          <button class="bg-red-600 text-white px-3 py-1 rounded text-sm">{{ currentPage }}</button>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="btn-secondary px-3 py-1 text-sm">Next</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Product Modal -->
    <div v-if="showAddModal || editingProduct" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">
          {{ editingProduct ? 'Edit Product' : 'Add New Product' }}
        </h2>
        <form @submit.prevent="editingProduct ? handleUpdateProduct() : handleAddProduct()" class="space-y-4">
          <div v-if="isAdmin">
            <label class="block text-sm font-medium text-gray-700">Seller</label>
            <select
              v-model="productUserId"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="">Select a seller</option>
              <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
                {{ seller.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="productName"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="productDescription"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Price</label>
            <input
              v-model.number="productPrice"
              type="number"
              step="0.01"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">SKU</label>
            <input
              v-model="productSku"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Product Link</label>
            <input
              v-model="productLink"
              type="url"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Video Link</label>
            <input
              v-model="videoLink"
              type="url"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Stock</label>
            <input
              v-model.number="productStock"
              type="number"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="editingProduct ? (editingProduct = null) : (showAddModal = false)"
              class="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
            >
              {{ editingProduct ? 'Save Changes' : 'Add Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>