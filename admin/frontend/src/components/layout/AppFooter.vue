<!-- admin/frontend/src/components/layout/AppFooter.vue -->
<template>
  <v-footer app color="primary" class="px-4">
    <span class="text-body-2">Lucky Deck Gaming &copy; {{ currentYear }}</span>
    <v-spacer></v-spacer>
    <span class="text-body-2">Admin Dashboard v1.0</span>
  </v-footer>
</template>

<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>
