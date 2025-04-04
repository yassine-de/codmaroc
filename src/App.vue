<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navigation from './components/Navigation.vue'
import Footer from './components/Footer.vue'
import { useAuthStore } from './stores/auth'

// Initialize auth state after app is mounted
const authStore = useAuthStore()
authStore.checkUser()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navigation />
    <RouterView />
    <Footer />
  </div>
</template>