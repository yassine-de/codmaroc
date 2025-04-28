<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

interface StaffStat {
  staff_id: number
  staff_name: string
  confirmed_count: number
  total_handled: number
  confirmation_rate: number
}

const stats = ref<StaffStat[]>([])
const loading = ref(false)
const error = ref('')

const fetchStaffStats = async () => {
  loading.value = true
  error.value = ''
  try {
    // Hole alle Staff-User
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 2)
    if (userError) throw userError

    // Hole alle relevanten order_history-Einträge
    const { data: history, error: histError } = await supabase
      .from('order_history')
      .select('changed_by, new_status')
      .not('changed_by', 'is', null)
    if (histError) throw histError

    // Aggregiere pro Mitarbeiter
    const staffMap: Record<number, StaffStat> = {}
    users.forEach((user: any) => {
      staffMap[user.id] = {
        staff_id: user.id,
        staff_name: user.name,
        confirmed_count: 0,
        total_handled: 0,
        confirmation_rate: 0
      }
    })
    history.forEach((entry: any) => {
      if (staffMap[entry.changed_by]) {
        staffMap[entry.changed_by].total_handled++
        if (entry.new_status === 11) {
          staffMap[entry.changed_by].confirmed_count++
        }
      }
    })
    Object.values(staffMap).forEach((stat: any) => {
      stat.confirmation_rate = stat.total_handled > 0 ? Math.round((stat.confirmed_count / stat.total_handled) * 100) : 0
    })
    stats.value = Object.values(staffMap)
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Laden der Statistik'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStaffStats()
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Staff Statistik: Confirmation Rate</h1>
    <div v-if="loading" class="mb-4">Lade Daten...</div>
    <div v-if="error" class="mb-4 text-red-600">{{ error }}</div>
    <table v-if="stats.length" class="min-w-full bg-white rounded shadow">
      <thead>
        <tr>
          <th class="px-4 py-2 text-left">Mitarbeiter</th>
          <th class="px-4 py-2 text-right">Bestätigt</th>
          <th class="px-4 py-2 text-right">Bearbeitet</th>
          <th class="px-4 py-2 text-right">Confirmation Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="stat in stats" :key="stat.staff_id">
          <td class="px-4 py-2">{{ stat.staff_name }}</td>
          <td class="px-4 py-2 text-right">{{ stat.confirmed_count }}</td>
          <td class="px-4 py-2 text-right">{{ stat.total_handled }}</td>
          <td class="px-4 py-2 text-right font-bold" :class="stat.confirmation_rate >= 50 ? 'text-green-600' : 'text-red-600'">
            {{ stat.confirmation_rate }} %
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!loading">Keine Daten gefunden.</div>
  </div>
</template> 