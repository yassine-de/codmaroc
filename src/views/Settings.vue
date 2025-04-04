<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: number
  is_active: boolean
  last_seen?: string
  auth_id: string
}

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const searchQuery = ref('')

// New user form
const showAddModal = ref(false)
const newUser = ref({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 3 // Default to seller role
})

const roleLabels = {
  1: 'ADMIN',
  2: 'STAFF',
  3: 'SELLER'
}

const getRoleClass = (role: number) => {
  switch (role) {
    case 1:
      return 'bg-pink-100 text-pink-800'
    case 2:
      return 'bg-green-100 text-green-800'
    case 3:
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = ''

    const { data, error: err } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) throw err
    users.value = data || []
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleAddUser = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.value.email,
      password: newUser.value.password
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Then create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          auth_id: authData.user.id,
          name: newUser.value.name,
          email: newUser.value.email,
          phone: newUser.value.phone,
          role: newUser.value.role
        }
      ])

    if (profileError) throw profileError

    success.value = 'User created successfully'
    showAddModal.value = false
    newUser.value = {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 3
    }
    await fetchUsers()
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const resetPassword = async (userId: string) => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    // Generate a random password
    const newPassword = Math.random().toString(36).slice(-8)

    const { error: err } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (err) throw err

    success.value = `Password reset successfully. New password: ${newPassword}`
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const toggleUserStatus = async (user: User) => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    const { error: err } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (err) throw err

    success.value = `User ${user.is_active ? 'deactivated' : 'activated'} successfully`
    await fetchUsers()
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const deleteUser = async (user: User) => {
  if (!confirm(`Are you sure you want to delete ${user.name}?`)) return

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    // Delete user profile first
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (profileError) throw profileError

    // Then delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(
      user.auth_id
    )

    if (authError) throw authError

    success.value = 'User deleted successfully'
    await fetchUsers()
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Filter users based on search query
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value

  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => 
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    user.phone.includes(query)
  )
})

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Users List</h1>
        <p class="text-sm text-gray-500">Manage all users</p>
      </div>
      <button
        @click="showAddModal = true"
        class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center"
      >
        <i class="fas fa-plus mr-2"></i>
        Add User
      </button>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="success" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">{{ success }}</div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by name, email, or phone..."
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black pl-10"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i class="fas fa-search text-gray-400"></i>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(user, index) in filteredUsers" :key="user.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ index + 1 }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="['px-2 py-1 text-xs rounded-full', getRoleClass(user.role)]">
                {{ roleLabels[user.role] }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ user.last_seen || 'Never' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <button
                  @click="toggleUserStatus(user)"
                  class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200"
                  :class="user.is_active ? 'bg-green-600' : 'bg-gray-200'"
                >
                  <span
                    class="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                    :class="user.is_active ? 'translate-x-5' : 'translate-x-0'"
                  ></span>
                </button>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                @click="resetPassword(user.auth_id)"
                class="text-blue-600 hover:text-blue-800"
                title="Reset Password"
              >
                <i class="fas fa-key"></i>
              </button>
              <button
                @click="deleteUser(user)"
                class="text-red-600 hover:text-red-800"
                title="Delete User"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4">Add New User</h2>
        <form @submit.prevent="handleAddUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newUser.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input
              v-model="newUser.email"
              type="email"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Password</label>
            <input
              v-model="newUser.password"
              type="password"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Phone</label>
            <input
              v-model="newUser.phone"
              type="tel"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Role</label>
            <select
              v-model="newUser.role"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="1">Admin</option>
              <option value="2">Staff</option>
              <option value="3">Seller</option>
            </select>
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
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>