import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Products from '../views/Products.vue'
import Orders from '../views/Orders.vue'
import Sourcing from '../views/Sourcing.vue'
import Integration from '../views/Integration.vue'
import Wallet from '../views/Wallet.vue'
import Settings from '../views/Settings.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/products',
      name: 'products',
      component: Products,
      meta: { requiresAuth: true }
    },
    {
      path: '/leads',
      name: 'leads',
      component: Orders,
      meta: { requiresAuth: true }
    },
    {
      path: '/sourcing',
      name: 'sourcing',
      component: Sourcing,
      meta: { requiresAuth: true, noStaff: true }
    },
    {
      path: '/integration',
      name: 'integration',
      component: Integration,
      meta: { requiresAuth: true, noStaff: true }
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: Wallet,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
      meta: { requiresAuth: true, adminOnly: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else if (to.meta.noStaff && authStore.user?.role === 2) {
    // Redirect staff users from restricted pages
    next('/dashboard')
  } else if (to.meta.adminOnly && authStore.user?.role !== 1) {
    // Redirect non-admin users from admin-only pages
    next('/dashboard')
  } else {
    next()
  }
})

export default router