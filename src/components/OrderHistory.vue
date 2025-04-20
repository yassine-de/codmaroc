<template>
  <div class="order-history">
    <div class="history-header">
      <h3>Order History</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="history-timeline">
      <div v-if="loading" class="loading">
        <i class="fas fa-spinner fa-spin mr-2"></i>
        Loading history...
      </div>
      <div v-else-if="error" class="error">
        <i class="fas fa-exclamation-circle mr-2"></i>
        {{ error }}
      </div>
      <div v-else-if="history.length === 0" class="no-history">
        <i class="fas fa-info-circle mr-2"></i>
        No history available for this order.
      </div>
      <div v-else class="timeline">
        <div v-for="entry in history" :key="entry.id" class="timeline-entry">
          <div class="timeline-date">
            {{ formatDate(entry.changed_at) }}
          </div>
          <div class="timeline-content">
            <div class="status-change">
              <span :class="['status', 'old-status', getStatusClass(entry.old_status)]">
                {{ ORDER_STATUS_LABELS[entry.old_status] }}
              </span>
              <span class="arrow">→</span>
              <span :class="['status', 'new-status', getStatusClass(entry.new_status)]">
                {{ ORDER_STATUS_LABELS[entry.new_status] }}
              </span>
            </div>
            <div class="changed-by">
              <i class="fas fa-user mr-1"></i>
              Changed by: {{ entry.changed_by_name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../stores/orders'

const props = defineProps<{
  orderId: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface HistoryEntry {
  id: number
  order_id: number
  old_status: number
  new_status: number
  changed_at: string
  changed_by: { name: string } | null
  changed_by_name: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const history = ref<HistoryEntry[]>([])

const getStatusClass = (status: number) => {
  const statusClassMap: Record<number, string> = {
    [ORDER_STATUS.NEW]: 'status-new',
    [ORDER_STATUS.CONFIRMED]: 'status-confirmed',
    [ORDER_STATUS.DELIVERED]: 'status-delivered',
    [ORDER_STATUS.CANCELED]: 'status-cancelled',
    [ORDER_STATUS.NO_REPLY1]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY2]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY3]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY4]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY5]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY6]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY7]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY8]: 'status-no-reply',
    [ORDER_STATUS.NO_REPLY9]: 'status-no-reply',
    [ORDER_STATUS.REPORTED]: 'status-reported',
    [ORDER_STATUS.DOUBLE]: 'status-double',
    [ORDER_STATUS.WRONG_NUMBER]: 'status-wrong-number',
    [ORDER_STATUS.SHIPPED]: 'status-shipped'
  }
  return statusClassMap[status] || 'status-unknown'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: enUS })
}

const fetchHistory = async () => {
  try {
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('order_history')
      .select(`
        id,
        order_id,
        old_status,
        new_status,
        changed_at,
        changed_by:changed_by (
          name
        )
      `)
      .eq('order_id', props.orderId)
      .order('changed_at', { ascending: false })

    if (err) throw err

    history.value = data.map(entry => ({
      ...entry,
      changed_by_name: entry.changed_by?.name || 'Unknown'
    }))
  } catch (err: any) {
    error.value = err.message
    console.error('Error fetching order history:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.order-history {
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.history-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  color: #6b7280;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #1f2937;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-entry {
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border-left: 4px solid #e5e7eb;
  transition: all 0.2s;
}

.timeline-entry:hover {
  background: #f3f4f6;
  transform: translateX(2px);
}

.timeline-date {
  min-width: 150px;
  color: #6b7280;
  font-size: 0.875rem;
}

.timeline-content {
  flex: 1;
}

.status-change {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.arrow {
  color: #6b7280;
  font-size: 0.875rem;
}

.changed-by {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.notes {
  margin-top: 0.5rem;
  color: #6b7280;
  font-style: italic;
  font-size: 0.875rem;
  background: #f3f4f6;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

/* Status colors */
.status-new { background: #e3f2fd; color: #1976d2; }
.status-confirmed { background: #e8f5e9; color: #2e7d32; }
.status-delivered { background: #f3e5f5; color: #7b1fa2; }
.status-cancelled { background: #ffebee; color: #c62828; }
.status-double { background: #fff3e0; color: #ef6c00; }
.status-no-reply { background: #fff8e1; color: #ffa000; }
.status-reported { background: #fce4ec; color: #c2185b; }
.status-wrong-number { background: #f3e5f5; color: #7b1fa2; }
.status-shipped { background: #e8f5e9; color: #2e7d32; }
.status-unknown { background: #f5f5f5; color: #757575; }

.loading, .error, .no-history {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.error {
  color: #c62828;
}

.loading i {
  margin-right: 0.5rem;
}
</style> 