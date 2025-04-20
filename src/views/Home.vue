<template>
  <main>
    <!-- Hero Section -->
    <section class="py-20 px-4 text-center">
      <h1 class="text-5xl font-bold mb-4">Cash on Delivery Made Simple</h1>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Streamline your delivery operations with our comprehensive cash on delivery management system.
      </p>
      <div class="space-x-4">
        <RouterLink to="/login" class="btn-primary">Login</RouterLink>
        <button class="btn-secondary">View Demo</button>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Complete E-commerce Solution</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Shop Integration</h3>
            <p class="text-gray-600">Seamlessly connect your online store</p>
          </div>
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Order Management</h3>
            <p class="text-gray-600">Track and manage orders efficiently</p>
          </div>
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Order Fulfillment</h3>
            <p class="text-gray-600">Streamline your delivery process</p>
          </div>
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Team Management</h3>
            <p class="text-gray-600">Coordinate your delivery team</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us Section -->
    <section class="py-16">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Why Choose Our Platform?</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Global Reach</h3>
            <p class="text-gray-600">Expand your business worldwide</p>
          </div>
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Real-Time Analytics</h3>
            <p class="text-gray-600">Make data-driven decisions</p>
          </div>
          <div class="card">
            <h3 class="text-xl font-semibold mb-2">Secure Platform</h3>
            <p class="text-gray-600">Your data is safe with us</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Ready to streamline your delivery operations?</h2>
        <p class="text-xl text-gray-600 mb-8">Join thousands of businesses using our platform.</p>
        <div class="space-x-4">
          <button class="btn-primary">Get Started Now</button>
          <button class="btn-secondary">Contact Sales</button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>