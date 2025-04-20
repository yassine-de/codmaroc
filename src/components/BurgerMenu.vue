<!-- BurgerMenu.vue -->
<script setup lang="ts">
import { useSidebarStore } from '../stores/sidebar'

const sidebarStore = useSidebarStore()
</script>

<template>
  <button
    @click="sidebarStore.toggleSidebar"
    class="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
    aria-label="Toggle menu"
  >
    <div class="w-6 h-5 relative transform transition-all duration-200" :class="{ 'burger-active': sidebarStore.isOpen }">
      <span class="absolute h-0.5 w-6 bg-current transform transition-all duration-200 rotate-0 top-0"></span>
      <span class="absolute h-0.5 w-6 bg-current transform transition-all duration-200 top-2"></span>
      <span class="absolute h-0.5 w-6 bg-current transform transition-all duration-200 rotate-0 top-4"></span>
    </div>
  </button>
</template>

<style scoped>
.burger-active span:first-child {
  @apply rotate-45 translate-y-2;
}

.burger-active span:nth-child(2) {
  @apply opacity-0;
}

.burger-active span:last-child {
  @apply -rotate-45 -translate-y-2;
}
</style> 