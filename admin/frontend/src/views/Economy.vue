<!-- frontend/src/views/Economy.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-6">Economy Dashboard</h1>
    
    <v-row>
      <!-- Chips Stats -->
      <v-col cols="12" md="4">
        <v-card color="primary" theme="dark">
          <v-card-text>
            <div class="text-h6">Total Chips in Economy</div>
            <div class="text-h4">{{ economyStats.total_chips.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card color="deep-purple" theme="dark">
          <v-card-text>
            <div class="text-h6">Total Flash in Economy</div>
            <div class="text-h4">{{ economyStats.total_flash.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card color="orange-darken-3" theme="dark">
          <v-card-text>
            <div class="text-h6">Total Users</div>
            <div class="text-h4">{{ economyStats.user_count.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card color="secondary" theme="dark">
          <v-card-text>
            <div class="text-h6">Average Chips per User</div>
            <div class="text-h4">{{ economyStats.avg_chips.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card color="deep-purple-lighten-1" theme="dark">
          <v-card-text>
            <div class="text-h6">Average Flash per User</div>
            <div class="text-h4">{{ economyStats.avg_flash.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card color="success" theme="dark">
          <v-card-text>
            <div class="text-h6">Rake Generated Today</div>
            <div class="text-h4">{{ economyStats.rake_today.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card color="info" theme="dark">
          <v-card-text>
            <div class="text-h6">Blackjack House Profit Today</div>
            <div class="text-h4">{{ economyStats.blackjack_profit_today.toLocaleString() }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const economyStats = ref({
  total_chips: 0,
  total_flash: 0,
  avg_chips: 0,
  avg_flash: 0,
  user_count: 0,
  rake_today: 0,
  blackjack_profit_today: 0
})

onMounted(async () => {
  try {
    const response = await api.get('/economy/stats')
    economyStats.value = response.data.economy
  } catch (error) {
    console.error('Error loading economy data:', error)
  }
})
</script>
