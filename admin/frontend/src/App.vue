<!-- admin/frontend/src/App.vue -->
<template>
  <v-app>
    <app-header v-if="isAuthenticated" />
    
    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>
    
    <app-footer v-if="isAuthenticated" />
  </v-app>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

onMounted(async () => {
  if (authStore.token) {
    await authStore.fetchUserInfo()
  }
})
</script>
