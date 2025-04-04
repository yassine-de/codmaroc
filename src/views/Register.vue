<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const name = ref('')
const email = ref('')
const password = ref('')
const phone = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

const handleRegister = async () => {
  try {
    loading.value = true
    error.value = ''
    await authStore.register(email.value, password.value, name.value, phone.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.message || 'An error occurred during registration'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <div v-if="error" class="rounded-md bg-red-50 p-4 mb-4">
          <div class="text-sm text-red-700">{{ error }}</div>
        </div>

        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="name" class="sr-only">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              v-model="name"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Full name"
            />
          </div>
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              v-model="email"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <div>
            <label for="phone" class="sr-only">Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              v-model="phone"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Phone number"
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
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>