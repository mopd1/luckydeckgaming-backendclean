<template>
  <div>
    <h1 class="text-h4 mb-6">Daily Tasks Management</h1>
    
    <v-tabs v-model="activeTab" bg-color="primary">
      <v-tab value="tasks">Tasks</v-tab>
      <v-tab value="sets">Task Sets</v-tab>
      <v-tab value="calendar">Calendar</v-tab>
    </v-tabs>
    
    <v-window v-model="activeTab" class="mt-4">
      <v-window-item value="tasks">
        <TasksTab />
      </v-window-item>
      
      <v-window-item value="sets">
        <SetsTab />
      </v-window-item>
      
      <v-window-item value="calendar">
        <CalendarTab />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TasksTab from './TasksTab.vue'
import SetsTab from './SetsTab.vue'
import CalendarTab from './CalendarTab.vue'

const activeTab = ref('tasks')
</script>
