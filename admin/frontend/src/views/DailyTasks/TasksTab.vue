<template>
  <div>
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>Available Tasks</span>
        <v-btn color="primary" @click="showTaskDialog = true">Add New Task</v-btn>
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="tasks"
        :loading="loading"
        class="elevation-1"
      >
        <template v-slot:item.actions="{ item }">
          <v-btn icon size="small" @click="editTask(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
    
    <!-- Task Dialog -->
    <v-dialog v-model="showTaskDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ isEditing ? 'Edit Task' : 'Add New Task' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveTask">
            <v-text-field
              v-model="taskForm.task_id"
              label="Task ID"
              :disabled="isEditing"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="taskForm.name"
              label="Task Name"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="taskForm.description"
              label="Description"
              required
            ></v-text-field>
            
            <v-select
              v-model="taskForm.action_id"
              :items="availableActions"
              item-title="name"
              item-value="action_id"
              label="Action Type"
              required
              hint="Select the action that will trigger task progress"
              persistent-hint
            ></v-select>
            
            <v-text-field
              v-model="taskForm.required_repetitions"
              label="Required Repetitions"
              type="number"
              min="1"
              required
            ></v-text-field>
            
            <v-select
              v-model="taskForm.reward_type"
              :items="['gems', 'chips', 'action_points']"
              label="Reward Type"
              required
            ></v-select>
            
            <v-text-field
              v-model="taskForm.reward_amount"
              label="Reward Amount"
              type="number"
              min="0"
              required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showTaskDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveTask">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'

const tasks = ref([])
const loading = ref(true)
const showTaskDialog = ref(false)
const isEditing = ref(false)
const taskForm = ref({
  task_id: '',
  name: '',
  description: '',
  action_id: '',
  required_repetitions: 1,
  reward_type: 'gems',
  reward_amount: 100
})

const availableActions = ref([])

const headers = [
  { title: 'Task ID', key: 'task_id' },
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
  { title: 'Required', key: 'required_repetitions' },
  { title: 'Reward', key: 'reward_amount' },
  { title: 'Actions', key: 'actions', sortable: false }
]

onMounted(async () => {
  await Promise.all([
    loadTasks(),
    loadActions()
  ])
})

async function loadTasks() {
  try {
    loading.value = true
    const response = await api.get('/daily-tasks/tasks')
    tasks.value = response.data.tasks
  } catch (error) {
    console.error('Error loading tasks:', error)
  } finally {
    loading.value = false
  }
}

function editTask(item) {
  isEditing.value = true
  taskForm.value = { ...item }
  showTaskDialog.value = true
}

async function loadActions() {
  try {
    const response = await api.get('/daily-tasks/actions')
    availableActions.value = response.data.actions
  } catch (error) {
    console.error('Error loading actions:', error)
  }
}

async function saveTask() {
  try {
    // Convert numeric form values
    const processedForm = {
      ...taskForm.value,
      required_repetitions: parseInt(taskForm.value.required_repetitions),
      reward_amount: parseInt(taskForm.value.reward_amount)
    }
    
    if (isEditing.value) {
      await api.put(`/daily-tasks/tasks/${processedForm.task_id}`, processedForm)
    } else {
      await api.post('/daily-tasks/tasks', processedForm)
    }
    
    showTaskDialog.value = false
    await loadTasks()
  } catch (error) {
    console.error('Error saving task:', error)
    alert('Failed to save task')
  }
}
</script>
