<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const authStore = useAuthStore()

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
    await authStore.login(email.value, password.value)
  } catch (e) {
    error.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}

const testUsers = [
  { role: 'Admin', email: 'admin@codservice.com', password: 'start123' },
  { role: 'Staff', email: 'staff@codservice.com', password: 'start123' },
  { role: 'Seller', email: 'seller@codservice.com', password: 'start123' }
]

const fillCredentials = (testUser: typeof testUsers[0]) => {
  email.value = testUser.email
  password.value = testUser.password
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div v-if="error" class="rounded-md bg-red-50 p-4 mb-4">
          <div class="text-sm text-red-700">{{ error }}</div>
        </div>
        
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              v-model="email"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              v-model="password"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>

      <!-- Test Users Section -->
      <!-- <div class="mt-8">
        <h3 class="text-center text-sm font-medium text-gray-500 mb-4">Test Accounts</h3>
        <div class="space-y-2">
          <div
            v-for="testUser in testUsers"
            :key="testUser.email"
            @click="fillCredentials(testUser)"
            class="p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div class="flex justify-between items-center">
              <span class="font-medium">{{ testUser.role }}</span>
              <span class="text-sm text-gray-500">Click to fill</span>
            </div>
            <div class="text-sm text-gray-500">{{ testUser.email }}</div>
          </div>
        </div>
      </div> -->
    </div>
  </div>
</template>