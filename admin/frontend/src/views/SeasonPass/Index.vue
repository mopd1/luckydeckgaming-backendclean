<template>
  <div>
    <h1 class="text-h4 mb-6">Season Pass Management</h1>
    
    <v-tabs v-model="activeTab" bg-color="primary">
      <v-tab value="seasons">Seasons</v-tab>
      <v-tab value="milestones">Milestones</v-tab>
      <v-tab value="analytics">Analytics</v-tab>
    </v-tabs>
    
    <v-window v-model="activeTab" class="mt-4">
      <v-window-item value="seasons">
        <SeasonsTab />
      </v-window-item>
      
      <v-window-item value="milestones">
        <MilestonesTab />
      </v-window-item>
      
      <v-window-item value="analytics">
        <AnalyticsTab />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SeasonsTab from './SeasonsTab.vue'
import MilestonesTab from './MilestonesTab.vue'
import AnalyticsTab from './AnalyticsTab.vue'

const activeTab = ref('seasons')
</script>
