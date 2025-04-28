<!-- Sidebar.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useSidebarStore } from '../stores/sidebar'
import { useAuthStore } from '../stores/auth'
import BurgerMenu from './BurgerMenu.vue'

const route = useRoute()
const sidebarStore = useSidebarStore()
const authStore = useAuthStore()

const isStaff = computed(() => authStore.user?.role === 2)
const isAdmin = computed(() => authStore.user?.role === 1)

// Compute if sidebar should be hidden
const shouldHideSidebar = computed(() => {
  return route.path === '/' || route.path === '/login'
})

const isActive = (path: string) => {
  return route.path === path
}

// Handle click outside to close sidebar on mobile
const handleClickOutside = (event: MouseEvent) => {
  const sidebar = document.getElementById('sidebar')
  const burger = document.getElementById('burger-menu')
  
  if (sidebarStore.isMobile && sidebarStore.isOpen && 
      sidebar && !sidebar.contains(event.target as Node) &&
      burger && !burger.contains(event.target as Node)) {
    sidebarStore.closeSidebar()
  }
}

// Handle resize for mobile detection
const handleResize = () => {
  sidebarStore.setMobile(window.innerWidth < 1024)
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div v-if="!shouldHideSidebar">
    <!-- Sidebar -->
    <aside
      id="sidebar"
      class="fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 transform transition-transform duration-300 ease-in-out bg-white border-r border-gray-200"
      :class="[
        sidebarStore.isMobile ? '-translate-x-full' : 'translate-x-0',
        { 'translate-x-0': sidebarStore.isOpen }
      ]"
    >
      <!-- Navigation Links -->
      <nav class="px-4 py-4">
        <template v-if="authStore.user">
          <!-- Dashboard -->
          <RouterLink
            to="/dashboard"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/dashboard') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-home w-5"></i>
            <span class="ml-3">Dashboard</span>
          </RouterLink>

          <!-- Leads -->
          <RouterLink
            to="/leads"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/leads') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-users w-5"></i>
            <span class="ml-3">Leads</span>
          </RouterLink>

          <!-- Products -->
          <RouterLink
            to="/products"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/products') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-box w-5"></i>
            <span class="ml-3">Products</span>
          </RouterLink>

          <!-- Wakilni Status -->
          <RouterLink
            v-if="isAdmin"
            to="/wakilni-status"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/wakilni-status') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-truck w-5"></i>
            <span class="ml-3">Wakilni Status</span>
          </RouterLink>

          <!-- Non-Staff Links -->
          <template v-if="!isStaff">
            <RouterLink
              to="/sourcing"
              class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
              :class="isActive('/sourcing') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
              @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
            >
              <i class="fas fa-search w-5"></i>
              <span class="ml-3">Sourcing</span>
            </RouterLink>

            <RouterLink
              to="/integration"
              class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
              :class="isActive('/integration') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
              @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
            >
              <i class="fas fa-plug w-5"></i>
              <span class="ml-3">Integration</span>
            </RouterLink>

            <RouterLink
              to="/wallet"
              class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
              :class="isActive('/wallet') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
              @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
            >
              <i class="fas fa-wallet w-5"></i>
              <span class="ml-3">Wallet</span>
            </RouterLink>
          </template>

          <!-- Admin Settings -->
          <RouterLink
            v-if="isAdmin"
            to="/settings"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/settings') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-cog w-5"></i>
            <span class="ml-3">Settings</span>
          </RouterLink>

          <!-- Admin Statistics -->
          <RouterLink
            v-if="isAdmin"
            to="/statistics"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors"
            :class="isActive('/statistics') ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-chart-bar w-5"></i>
            <span class="ml-3">Statistiken</span>
          </RouterLink>
        </template>

        <!-- Auth Links (when not logged in) -->
        <template v-else>
          <RouterLink
            to="/login"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-sign-in-alt w-5"></i>
            <span class="ml-3">Login</span>
          </RouterLink>

          <RouterLink
            to="/register"
            class="flex items-center px-2 py-2 mb-1 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
            @click="sidebarStore.isMobile && sidebarStore.closeSidebar()"
          >
            <i class="fas fa-user-plus w-5"></i>
            <span class="ml-3">Register</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User Section at Bottom -->
      <div v-if="authStore.user" class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span class="text-sm font-medium text-gray-600">{{ authStore.user.email?.charAt(0).toUpperCase() }}</span>
            </div>
            <span class="ml-3 text-sm font-medium text-gray-700">{{ authStore.user.email }}</span>
          </div>
          <button
            @click="authStore.logout(); sidebarStore.closeSidebar()"
            class="text-gray-600 hover:text-gray-900"
          >
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div
      v-if="sidebarStore.isMobile && sidebarStore.isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity"
      @click="sidebarStore.closeSidebar"
    ></div>
  </div>
</template> 