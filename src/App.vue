<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useSidebarStore } from './stores/sidebar'
import Sidebar from './components/Sidebar.vue'
import Footer from './components/Footer.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Initialize auth state after app is mounted
const authStore = useAuthStore()
const sidebarStore = useSidebarStore()
const route = useRoute()

// Hide sidebar on home and login pages
const hideSidebar = computed(() => {
  return route.path === '/' || route.path === '/login'
})

authStore.checkUser()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sticky Header -->
    <header v-if="!hideSidebar" class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div class="flex items-center justify-between h-full px-4">
        <!-- Burger Menu -->
        <div class="lg:hidden">
          <BurgerMenu />
        </div>
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center">
          <span class="text-xl font-bold text-red-600">CODSERVICE</span>
        </RouterLink>
        <!-- Placeholder for right side balance -->
        <div class="w-10"></div>
      </div>
    </header>

    <Sidebar v-if="!hideSidebar" />
    <div
      class="transition-all duration-300"
      :class="[
        !hideSidebar ? 'lg:ml-64' : '',
        { 'ml-0': !sidebarStore.isOpen || sidebarStore.isMobile }
      ]"
    >
      <!-- Add padding-top to account for sticky header -->
      <div :class="{ 'pt-16': !hideSidebar }">
        <RouterView />
        <Footer />
      </div>
    </div>
  </div>
</template>