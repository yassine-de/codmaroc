<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' }
]

const selectedLanguage = ref(languages[0])
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
}

const isActive = (path: string) => {
  return route.path === path
}

// Check if user is staff (role === 2)
const isStaff = computed(() => {
  return authStore.user?.role === 2
})

// Check if user is admin (role === 1)
const isAdmin = computed(() => {
  return authStore.user?.role === 1
})
</script>

<template>
  <nav class="bg-white border-b border-gray-200">
    <div class="max-w-full px-4">
      <div class="flex h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center">
          <span class="text-xl font-bold text-red-600 bg-white">CODService</span>
        </RouterLink>

        <!-- Show these links only when user is logged in -->
        <div v-if="authStore.user" class="ml-10 flex items-center space-x-1">
          <RouterLink 
            to="/dashboard" 
            class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
            :class="isActive('/dashboard') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
          >
            <i class="fas fa-home"></i>
            <span>Dashboards</span>
          </RouterLink>

          <RouterLink 
            to="/leads" 
            class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
            :class="isActive('/leads') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
          >
            <i class="fas fa-users"></i>
            <span>Leads</span>
          </RouterLink>

          <RouterLink 
            to="/products" 
            class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
            :class="isActive('/products') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
          >
            <i class="fas fa-box"></i>
            <span>Products</span>
          </RouterLink>

          <!-- Statistics link for admin -->
          <RouterLink 
            v-if="isAdmin"
            to="/statistics" 
            class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
            :class="isActive('/statistics') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
          >
            <i class="fas fa-chart-bar"></i>
            <span>Statistiken</span>
          </RouterLink>

          <!-- Only show these links for non-staff users -->
          <template v-if="!isStaff">
            <RouterLink 
              to="/sourcing" 
              class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
              :class="isActive('/sourcing') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            >
              <i class="fas fa-search"></i>
              <span>Sourcing</span>
            </RouterLink>

            <RouterLink 
              to="/integration" 
              class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
              :class="isActive('/integration') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            >
              <i class="fas fa-plug"></i>
              <span>Integration</span>
            </RouterLink>

            <RouterLink 
              to="/wallet" 
              class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
              :class="isActive('/wallet') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            >
              <i class="fas fa-wallet"></i>
              <span>Wallet</span>
            </RouterLink>
          </template>

          <!-- Add Settings link for admin -->
          <RouterLink 
            v-if="isAdmin"
            to="/settings" 
            class="px-3 py-2 rounded-md text-sm flex items-center space-x-2"
            :class="isActive('/settings') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
          >
            <i class="fas fa-cog"></i>
            <span>Settings</span>
          </RouterLink>
        </div>

        <div class="ml-auto flex items-center space-x-4">
          <!-- Language Selector -->
          <select
            v-model="selectedLanguage"
            class="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6"
          >
            <option v-for="lang in languages" :key="lang.code" :value="lang">
              {{ lang.name }}
            </option>
          </select>

          <!-- Theme Toggle -->
          <button class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-sun"></i>
          </button>

          <!-- Notifications -->
          <button class="text-gray-500 hover:text-gray-700 relative">
            <i class="fas fa-bell"></i>
            <span class="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              2
            </span>
          </button>

          <!-- User Menu -->
          <div class="relative">
            <button class="flex items-center space-x-2 text-gray-700">
              <span>AH</span>
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>

          <!-- Show login/register buttons when user is not logged in -->
          <template v-if="!authStore.user">
            <RouterLink
              to="/login"
              class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Login
            </RouterLink>
            
            <RouterLink
              to="/register"
              class="bg-red-600 text-white hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Register
            </RouterLink>
          </template>

          <!-- Show logout button when user is logged in -->
          <button
            v-else
            @click="handleLogout"
            class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.router-link-active {
  @apply bg-red-600 text-white;
}
</style>