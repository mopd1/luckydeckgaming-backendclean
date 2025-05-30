<template>
  <!-- Use a flex column layout to allow v-window to expand -->
  <div class="d-flex flex-column" style="height: 100%;"> 
    <h1 class="text-h4 mb-6 flex-grow-0 flex-shrink-0">Daily Tasks Management</h1> 
    
    <v-tabs v-model="activeTab" bg-color="primary" class="flex-grow-0 flex-shrink-0">
      <v-tab value="tasks">Tasks</v-tab>
      <v-tab value="sets">Task Sets</v-tab>
      <v-tab value="calendar">Calendar</v-tab>
    </v-tabs>
    
    <!-- Make v-window expand to fill remaining space -->
    <v-window v-model="activeTab" class="mt-4 flex-grow-1" style="overflow-y: auto;"> 
      <v-window-item value="tasks" class="fill-height"> <!-- fill-height for window item -->
        <TasksTab /> 
      </v-window-item>
      
      <v-window-item value="sets" class="fill-height">
        <SetsTab />
      </v-window-item>
      
      <v-window-item value="calendar" class="fill-height">
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

<style scoped>
/* Optional: If the above doesn't make the root div take full height of its container */
/* This assumes the parent of DailyTasks/Index.vue (likely v-container in App.vue) has height */
/*
.d-flex.flex-column {
  min-height: calc(100vh - (height-of-header-and-footer-and-margins)); 
  Adjust this calculation based on your actual header/footer heights if needed 
  or ensure v-main and v-container are correctly giving it 100% of their available height.
}
*/
/* Better to ensure v-main and v-container provide the height context */
</style>
