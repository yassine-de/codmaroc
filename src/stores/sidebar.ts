import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const isOpen = ref(true) // Standard: offen
  const isMobile = ref(false)

  const shouldShowSidebar = computed(() => {
    return !isMobile.value || isOpen.value
  })

  const toggleSidebar = () => {
    isOpen.value = !isOpen.value
  }

  const closeSidebar = () => {
    isOpen.value = false
  }

  const setMobile = (value: boolean) => {
    isMobile.value = value
    // Wenn Desktop-Modus, immer öffnen
    if (!value) {
      isOpen.value = true
    }
  }

  return {
    isOpen,
    isMobile,
    shouldShowSidebar,
    toggleSidebar,
    closeSidebar,
    setMobile
  }
}) 