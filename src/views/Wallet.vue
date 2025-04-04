<template>
  <div class="max-w-full mx-auto px-4 py-8">
    <!-- Error/Success Messages -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md whitespace-pre-line">{{ success }}</div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-6 gap-4 mb-8">
      <div class="bg-yellow-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-file-invoice text-yellow-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-yellow-600">Total Invoices</p>
            <p class="text-lg font-semibold text-yellow-700">${{ totalInvoices }}</p>
          </div>
        </div>
      </div>

      <div class="bg-green-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-check-circle text-green-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-green-600">Paid</p>
            <p class="text-lg font-semibold text-green-700">${{ paidInvoices }}</p>
          </div>
        </div>
      </div>

      <div class="bg-red-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-times-circle text-red-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-red-600">Unpaid</p>
            <p class="text-lg font-semibold text-red-700">${{ unpaidInvoices }}</p>
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="bg-orange-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-money-bill text-orange-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-orange-600">Total Fees</p>
            <p class="text-lg font-semibold text-orange-700">${{ totalFees }}</p>
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="bg-purple-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-percentage text-purple-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-purple-600">COD Fees</p>
            <p class="text-lg font-semibold text-purple-700">${{ codFees }}</p>
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="bg-blue-50 p-4 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-truck text-blue-600 text-xl mr-2"></i>
          <div>
            <p class="text-sm text-blue-600">Shipping Fees</p>
            <p class="text-lg font-semibold text-blue-700">${{ shippingFees }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Actions -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-4">
        <!-- Date Filter -->
        <select
          v-model="dateFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="all">All Time</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>

        <!-- Seller Filter (Admin Only) -->
        <select
          v-if="isAdmin"
          v-model="sellerFilter"
          class="rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
        >
          <option value="">All Sellers</option>
          <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
            {{ seller.name }}
          </option>
        </select>
      </div>

      <div class="flex items-center space-x-4">
        <!-- Delete Selected Button -->
        <button
          v-if="selectedInvoices.length > 0"
          @click="handleDeleteSelected"
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
        >
          <i class="fas fa-trash mr-2"></i>
          Delete Selected ({{ selectedInvoices.length }})
        </button>

        <!-- Create Invoice Button (Admin Only) -->
        <button
          v-if="isAdmin"
          @click="createInvoice"
          class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Create Invoice
        </button>
      </div>
    </div>

    <!-- Invoice Details -->
    <div v-if="invoiceDetails" class="mb-6 p-4 bg-gray-50 rounded-md whitespace-pre-line">
      {{ invoiceDetails }}
    </div>

    <!-- Debug Info -->
    <div v-if="success" class="mb-6 p-4 bg-green-50 text-green-700 rounded-md whitespace-pre-line">{{ success }}</div>

    <!-- Invoices Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                :checked="selectedInvoices.length === paginatedInvoices.length && paginatedInvoices.length > 0"
                :indeterminate="selectedInvoices.length > 0 && selectedInvoices.length < paginatedInvoices.length"
                @change="e => {
                  const checked = e.target.checked
                  selectedInvoices = checked ? paginatedInvoices.map(i => i.id) : []
                }"
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              >
            </th>
            <th v-if="isAdmin" scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="invoice in paginatedInvoices" :key="invoice.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                v-model="selectedInvoices"
                :value="invoice.id"
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              >
            </td>
            <td v-if="isAdmin" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ invoice.user?.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(invoice.created_at) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ invoice.orders?.length || 0 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${{ formatPrice(invoice.total_amount) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'px-2 py-1 text-xs rounded-full',
                  invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]"
              >
                {{ invoice.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <!-- PDF Download -->
              <button
                @click="downloadPDF(invoice)"
                class="text-blue-600 hover:text-blue-800"
                title="Export to PDF"
              >
                <i class="fas fa-file-pdf"></i>
              </button>

              <!-- Excel Download -->
              <button
                @click="downloadExcel(invoice)"
                class="text-green-600 hover:text-green-800"
                title="Export to Excel"
              >
                <i class="fas fa-file-excel"></i>
              </button>

              <!-- Additional Fees -->
              <button
                v-if="isAdmin"
                @click="() => { editingInvoice = invoice; showAddFeeModal = true }"
                class="text-blue-600 hover:text-blue-800"
                title="Add Additional Fees"
              >
                <i class="fas fa-plus-circle"></i>
              </button>

              <!-- Toggle Status (Admin Only) -->
              <button
                v-if="isAdmin"
                @click="toggleStatus(invoice)"
                :class="[
                  invoice.status === 'Paid' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                ]"
                title="Toggle Payment Status"
              >
                <i class="fas fa-check"></i>
              </button>

              <!-- Delete -->
              <button
                v-if="isAdmin"
                @click="() => handleDeleteInvoice(invoice.id)"
                class="text-red-600 hover:text-red-800"
                title="Delete Invoice"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-700">
          Showing {{ paginationStart + 1 }} to {{ paginationEnd }} of {{ filteredInvoices.length }} entries
        </div>
        <div class="flex space-x-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="btn-secondary px-3 py-1 text-sm"
          >
            Previous
          </button>
          <button
            class="bg-black text-white px-3 py-1 rounded text-sm"
          >
            {{ currentPage }}
          </button>
          <button
            @click="currentPage++"
            :disabled="paginationEnd >= filteredInvoices.length"
            class="btn-secondary px-3 py-1 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Update Fees Modal -->
    <div v-if="showFeesModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Update Factorisation Fees</h2>
        <div class="space-y-4">
          <div v-for="(fee, index) in editingFees" :key="index" class="flex items-center space-x-2">
            <input
              v-model="fee.name"
              type="text"
              placeholder="Fee Name"
              class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
            <input
              v-model.number="fee.amount"
              type="number"
              step="0.01"
              placeholder="Amount"
              class="w-32 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
            <button
              @click="removeFee(index)"
              class="text-red-600 hover:text-red-800"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <button
            @click="addFee"
            class="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <i class="fas fa-plus mr-2"></i>
            Add Fee
          </button>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="showFeesModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="updateFees"
              :disabled="loading"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              {{ loading ? 'Updating...' : 'Update Fees' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Proof Modal -->
    <div v-if="showProofModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Upload Payment Proof</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Select Image</label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              class="mt-1 block w-full"
            />
          </div>

          <div class="flex justify-end space-x-3">
            <button
              @click="showProofModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="uploadProof"
              :disabled="!selectedFile || loading"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              {{ loading ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Fee Modal -->
    <div v-if="showAddFeeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Zusätzliche Gebühr hinzufügen</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Beschreibung</label>
            <input
              v-model="newFee.description"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Betrag</label>
            <input
              v-model="newFee.amount"
              type="number"
              step="0.01"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              @click="showAddFeeModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              @click="handleAddFee(editingInvoice?.id)"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInvoiceStore, type Invoice, type InvoiceFee } from '../stores/invoices'
import { format } from 'date-fns'
import { exportToExcel } from '../lib/export'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'

const invoiceStore = useInvoiceStore()
const isAdmin = computed(() => invoiceStore.isAdmin)

// State
const loading = ref(false)
const error = ref('')
const success = ref('')
const invoiceDetails = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')
const dateFilter = ref('all')
const statusFilter = ref('all')
const sellerFilter = ref('')
const selectedSellerId = ref('')
const showCreateInvoiceModal = ref(false)
const showFeesModal = ref(false)
const showProofModal = ref(false)
const selectedFile = ref<File | null>(null)
const editingInvoice = ref<Invoice | null>(null)
const editingFees = ref<InvoiceFee[]>([])
const selectedInvoices = ref<number[]>([])
const showAddFeeModal = ref(false)
const newFee = ref({
  description: '',
  amount: 0
})

// Computed
const stats = computed(() => invoiceStore.stats)

const formatPrice = (price: number) => {
  return price.toFixed(2)
}

// Computed Properties für Statistiken
const totalInvoices = computed(() => {
  return formatPrice(stats.value.total.amount)
})

const paidInvoices = computed(() => {
  return formatPrice(stats.value.paid.amount)
})

const unpaidInvoices = computed(() => {
  return formatPrice(stats.value.unpaid.amount)
})

const totalFees = computed(() => {
  return formatPrice(stats.value.fees.total)
})

const codFees = computed(() => {
  return formatPrice(stats.value.fees.cod)
})

const shippingFees = computed(() => {
  return formatPrice(stats.value.fees.shipping)
})

const sellers = computed(() => {
  const uniqueSellers = new Map()
  invoiceStore.invoices.forEach(invoice => {
    if (invoice.user && !uniqueSellers.has(invoice.user.id)) {
      uniqueSellers.set(invoice.user.id, invoice.user)
    }
  })
  return Array.from(uniqueSellers.values())
})

const filteredInvoices = computed(() => {
  let filtered = [...invoiceStore.invoices]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(invoice => 
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.user?.name?.toLowerCase().includes(query) ||
      invoice.orders?.some(order => order.id.toString().includes(query))
    )
  }

  // Apply date filter
  if (dateFilter.value !== 'all') {
    const now = new Date()
    let startDate = new Date()

    switch (dateFilter.value) {
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    filtered = filtered.filter(invoice => 
      new Date(invoice.created_at) >= startDate
    )
  }

  // Apply status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(invoice => 
      invoice.status.toLowerCase() === statusFilter.value
    )
  }

  // Apply seller filter (admin only)
  if (isAdmin.value && sellerFilter.value) {
    filtered = filtered.filter(invoice => 
      invoice.user_id.toString() === sellerFilter.value
    )
  }

  return filtered
})

// Pagination
const paginationStart = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const paginationEnd = computed(() => Math.min(paginationStart.value + itemsPerPage.value, filteredInvoices.value.length))

const paginatedInvoices = computed(() => 
  filteredInvoices.value.slice(paginationStart.value, paginationEnd.value)
)

// Methods
const formatDate = (date: string) => {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss')
}

const createInvoice = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    invoiceDetails.value = ''

    // Call the create_seller_invoices function
    const { data, error: rpcError } = await supabase.rpc('create_seller_invoices')
    
    if (rpcError) throw rpcError

    // Refresh invoices list
    await invoiceStore.fetchInvoices()

    // Show detailed invoice info
    if (data && data.length > 0) {
      const invoice = invoiceStore.invoices[0] // Get the most recent invoice
      invoiceDetails.value = `Created invoice:\n` +
        `Orders: ${invoice.orders?.length || 0}\n` +
        `Order amounts: ${invoice.orders?.map(o => o.total_amount).join(', ') || 'none'}\n` +
        `Total amount: ${invoice.total_amount}$\n` +
        `Shipping fees: ${invoice.shipping_fees}$\n` +
        `COD fees: ${invoice.cod_fees}$\n` +
        `Net payment: ${invoice.net_payment}$`
    }

  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (invoice: Invoice) => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid'
    await invoiceStore.updateInvoiceStatus(invoice.id, newStatus)
    
    success.value = newStatus === 'Paid'
      ? 'Invoice marked as paid. All related orders have been updated.'
      : 'Invoice marked as unpaid.'
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const showUpdateFeesModal = (invoice: Invoice) => {
  editingInvoice.value = invoice
  editingFees.value = [...invoice.factorisation_fees]
  showFeesModal.value = true
}

const addFee = () => {
  editingFees.value.push({ name: '', amount: 0 })
}

const removeFee = (index: number) => {
  editingFees.value.splice(index, 1)
}

const updateFees = async () => {
  if (!editingInvoice.value) return

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    await invoiceStore.updateFactorisationFees(editingInvoice.value.id, editingFees.value)
    success.value = 'Factorisation fees updated successfully.'
    showFeesModal.value = false
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const showUploadProofModal = (invoice: Invoice) => {
  editingInvoice.value = invoice
  selectedFile.value = null
  showProofModal.value = true
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    selectedFile.value = input.files[0]
  }
}

const uploadProof = async () => {
  if (!editingInvoice.value || !selectedFile.value) return

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    await invoiceStore.uploadPaymentProof(editingInvoice.value.id, selectedFile.value)
    success.value = 'Payment proof uploaded successfully.'
    showProofModal.value = false
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const downloadPDF = (invoice: Invoice) => {
  const doc = new jsPDF()

  // Lade die arabische Schriftart
  doc.addFont('https://fonts.gstatic.com/ea/notokufiarabic/v2/NotoKufiArabic-Regular.ttf', 'NotoKufiArabic', 'normal')
  doc.addFont('https://fonts.gstatic.com/ea/notokufiarabic/v2/NotoKufiArabic-Bold.ttf', 'NotoKufiArabic', 'bold')
  
  autoTable(doc, {}) // Initialize autoTable

  // Add company logo/name
  doc.setFontSize(28)
  doc.setTextColor(220, 38, 38) // Red color for logo
  doc.text('CODService', 20, 25)
  
  // Add invoice number with better styling
  doc.setFontSize(12)
  doc.setTextColor(75, 85, 99) // Gray color for secondary text
  doc.text(`# ${invoice.invoice_number}`, 20, 35)

  // Add horizontal line
  doc.setDrawColor(229, 231, 235) // Light gray for lines
  doc.line(20, 40, 190, 40)

  // Add invoice details section
  doc.setFontSize(11)
  doc.setTextColor(31, 41, 55) // Dark gray for main text
  doc.text('Invoice To:', 20, 55)
  
  // Seller info box with subtle border and background
  doc.setFillColor(249, 250, 251) // Very light gray background
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(20, 60, 85, 45, 3, 3, 'FD')
  
  doc.setFontSize(10)
  const sellerInfo = [
    `Seller Fullname: ${invoice.user?.name || ''}`,
    `Country: ${invoice.user?.country || ''}`,
    `Date Payment: [${formatDate(invoice.created_at)}]`,
    `NB Orders: ${invoice.orders?.length || 0}`
  ]
  doc.text(sellerInfo, 25, 70)

  // Add orders section title with background
  doc.setFillColor(249, 250, 251)
  doc.rect(20, 115, 170, 10, 'F')
  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  doc.text('Orders', 105, 122, { align: 'center' }) // Centered Orders title

  // Add orders table with improved styling and Arabic support
  const headers = [['#', 'Order ID', 'Product Name', 'Quantity', 'CRBT', 'Shipping Fees', 'COD Fees', 'Payment']]
  const data = invoice.orders?.map((order, index) => {
    const crbt = order.total_amount || 0
    const shippingFees = 9
    const codFees = crbt * 0.05
    const payment = crbt - shippingFees - codFees

    return [
      index + 1,
    order.id,
      { content: order.product?.name || '', styles: { font: 'NotoKufiArabic', halign: 'right' } },
    order.quantity,
      `${formatPrice(crbt)}$`,
      `${formatPrice(shippingFees)}$`,
      `${formatPrice(codFees)}$`,
      `${formatPrice(payment)}$`
    ]
  }) || []

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 130,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
      textColor: [31, 41, 55],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [31, 41, 55],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, font: 'NotoKufiArabic' }, // Arabische Schriftart für Produktnamen
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    didDrawCell: (data) => {
      // Für arabische Texte RTL-Ausrichtung aktivieren
      if (data.column.index === 2 && data.cell.text) {
        const text = data.cell.text[0]
        if (/[\u0600-\u06FF]/.test(text)) { // Test auf arabische Zeichen
          data.cell.styles.halign = 'right'
        }
      }
    }
  })

  // Calculate totals
  const totalCRBT = invoice.orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
  const totalShippingFees = (invoice.orders?.length || 0) * 9
  const totalCODFees = totalCRBT * 0.05
  const netPayment = totalCRBT - totalShippingFees - totalCODFees

  // Add totals section with improved styling
  const finalY = doc.lastAutoTable.finalY + 15
  const totalsX = 115
  const totalsWidth = 75
  const lineHeight = 8 // Definiere einen konstanten Zeilenabstand

  // Draw totals box with subtle styling
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(totalsX, finalY - 5, totalsWidth, invoice.factorisation_fees?.length ? 45 : 35, 3, 3, 'FD')

  // Add total lines with improved alignment and styling
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)
  
  // Helper function for adding total lines with right alignment
  const addTotalLine = (label: string, amount: number, y: number, isFinal = false) => {
    const labelX = totalsX + 5 // Label links ausgerichtet
    const amountX = totalsX + totalsWidth - 5 // Betrag rechts ausgerichtet

    if (isFinal) {
      doc.setFont('helvetica', 'bold')
    } else {
      doc.setFont('helvetica', 'normal')
    }

    // Label links ausgerichtet
    doc.text(label, labelX, y)
    // Betrag rechts ausgerichtet
    doc.text(`${formatPrice(amount)}$`, amountX, y, { align: 'right' })
  }

  // Füge die Zeilen mit konstantem Abstand hinzu
  addTotalLine('Total Revenue:', totalCRBT, finalY)
  addTotalLine('Total Fees:', totalShippingFees + totalCODFees, finalY + lineHeight)
  
  if (invoice.factorisation_fees?.length) {
    const affiliateFees = invoice.factorisation_fees.reduce((sum, fee) => sum + fee.amount, 0)
    addTotalLine('Affiliate Product Fees:', affiliateFees, finalY + (lineHeight * 2))
    addTotalLine('Net Payment:', netPayment - affiliateFees, finalY + (lineHeight * 3), true)
  } else {
    addTotalLine('Net Payment:', netPayment, finalY + (lineHeight * 2), true)
  }

  // Add footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175) // Light gray for footer
  doc.text('Thank you for your business!', 105, pageHeight - 15, { align: 'center' })

  // Save the PDF
  doc.save(`invoice-${invoice.invoice_number}.pdf`)
}

const downloadExcel = (invoice: Invoice) => {
  const data = invoice.orders?.map(order => {
    const crbt = order.total_amount || 0
    const shippingFees = 9
    const codFees = crbt * 0.05
    const payment = crbt - shippingFees - codFees

    return {
    'Order ID': order.id,
    'Product': order.product?.name || '',
    'Quantity': order.quantity,
      'CRBT': crbt,
      'Shipping Fees': shippingFees,
      'COD Fees': codFees,
      'Payment': payment
    }
  }) || []

  exportToExcel(data, `invoice-${invoice.invoice_number}`)
}

const handleDeleteInvoice = async (invoiceId: string) => {
  if (!confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) return

  try {
    loading.value = true
    await invoiceStore.deleteInvoice(invoiceId)
    await invoiceStore.fetchInvoices() // Refresh the invoices list after deletion
    success.value = 'Rechnung erfolgreich gelöscht'
  } catch (err) {
    error.value = 'Fehler beim Löschen der Rechnung'
    console.error('Error deleting invoice:', err)
  } finally {
    loading.value = false
    setTimeout(() => {
      success.value = ''
      error.value = ''
    }, 3000)
  }
}

const handleDeleteSelected = async () => {
  if (!selectedInvoices.value.length) return
  
  if (!confirm(`Sind Sie sicher, dass Sie ${selectedInvoices.value.length} ausgewählte Rechnungen löschen möchten?`)) {
    return
  }

  try {
    loading.value = true
    for (const invoiceId of selectedInvoices.value) {
      await invoiceStore.deleteInvoice(invoiceId.toString())
    }
    selectedInvoices.value = []
    success.value = 'Ausgewählte Rechnungen wurden erfolgreich gelöscht'
  } catch (err) {
    error.value = 'Fehler beim Löschen der Rechnungen'
    console.error('Error deleting invoices:', err)
  } finally {
    loading.value = false
    setTimeout(() => {
      success.value = ''
      error.value = ''
    }, 3000)
  }
}

const handleExportToExcel = () => {
  const dataToExport = filteredInvoices.value.map(invoice => ({
    'Invoice Number': invoice.invoice_number,
    'Status': invoice.status,
    'Amount': invoice.total_amount,
    'Seller': invoice.user?.name || '',
    'Created': format(new Date(invoice.created_at), 'dd.MM.yyyy'),
    'COD Fee': invoice.cod_fee || 0,
    'Shipping Fee': invoice.shipping_fee || 0,
    'Additional Fees': invoice.additional_fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0,
    'Total': invoice.total_amount
  }))

  exportToExcel(dataToExport, `invoices-${format(new Date(), 'yyyy-MM-dd')}`)
}

const handleAddFee = async (invoiceId: number) => {
  if (!newFee.value.description || !newFee.value.amount) {
    error.value = 'Bitte füllen Sie alle Felder aus'
    return
  }

  try {
    loading.value = true
    await invoiceStore.addFee(invoiceId, {
      description: newFee.value.description,
      amount: parseFloat(newFee.value.amount.toString())
    })
    await invoiceStore.fetchInvoices()
    showAddFeeModal.value = false
    newFee.value = { description: '', amount: 0 }
    success.value = 'Gebühr erfolgreich hinzugefügt'
  } catch (err) {
    error.value = 'Fehler beim Hinzufügen der Gebühr'
  } finally {
    loading.value = false
    setTimeout(() => {
      success.value = ''
      error.value = ''
    }, 3000)
  }
}

onMounted(async () => {
  await invoiceStore.fetchInvoices()
})
</script>