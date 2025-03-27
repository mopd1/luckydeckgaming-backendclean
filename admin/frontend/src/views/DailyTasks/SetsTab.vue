<template>
  <div>
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>Task Sets</span>
        <v-btn color="primary" @click="showSetDialog = true">Add New Set</v-btn>
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="taskSets"
        :loading="loading"
        class="elevation-1"
      >
        <template v-slot:item.actions="{ item }">
          <v-btn icon size="small" @click="editSet(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" @click="manageTasks(item)" class="ml-2">
            <v-icon>mdi-format-list-checks</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
    
    <!-- Set Dialog -->
    <v-dialog v-model="showSetDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ isEditing ? 'Edit Task Set' : 'Add New Task Set' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveSet">
            <v-text-field
              v-model="setForm.set_id"
              label="Set ID"
              :disabled="isEditing"
              required
              hint="Use a unique identifier (e.g., weekend-tasks, monday-special)"
            ></v-text-field>
            
            <v-text-field
              v-model="setForm.name"
              label="Set Name"
              required
            ></v-text-field>
            
            <v-textarea
              v-model="setForm.description"
              label="Description"
            ></v-textarea>
            
            <v-switch
              v-model="setForm.is_active"
              label="Active"
            ></v-switch>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showSetDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveSet">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Task Assignment Dialog -->
    <v-dialog v-model="showAssignDialog" max-width="800px">
      <v-card>
        <v-card-title>Manage Tasks for {{ currentSet?.name }}</v-card-title>
        <v-card-text>
          <v-alert
            v-if="availableTasks.length === 0 && currentSetTasks.length === 0" 
            type="info"
          >
            No tasks available. Please create tasks first.
          </v-alert>
          
          <div v-else>
            <div class="d-flex align-center mb-4">
              <v-select
                v-model="selectedTaskId"
                :items="availableTasks"
                item-title="name"
                item-value="task_id"
                label="Add Task"
                class="mr-2"
                :disabled="availableTasks.length === 0"
              ></v-select>
              <v-btn 
                color="primary" 
                @click="addTaskToSet" 
                :disabled="!selectedTaskId"
              >
                Add
              </v-btn>
            </div>
            
            <v-list>
              <v-list-subheader>Tasks in this set</v-list-subheader>
              <v-list-item
                v-for="task in sortedSetTasks"
                :key="task.task_id"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-drag-vertical</v-icon>
                </template>
                
                <v-list-item-title>{{ task.name }}</v-list-item-title>
                
                <template v-slot:append>
                  <v-text-field
                    v-model="task.display_order"
                    type="number"
                    density="compact"
                    style="width: 80px"
                    class="mr-2"
                    @change="updateTaskOrder(task)"
                  ></v-text-field>
                  
                  <v-btn icon size="small" @click="removeTaskFromSet(task)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showAssignDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'

const taskSets = ref([])
const allTasks = ref([])
const currentSetTasks = ref([])
const currentSet = ref(null)
const loading = ref(true)
const showSetDialog = ref(false)
const showAssignDialog = ref(false)
const isEditing = ref(false)
const selectedTaskId = ref(null)

const setForm = ref({
  set_id: '',
  name: '',
  description: '',
  is_active: true
})

const headers = [
  { title: 'Set ID', key: 'set_id' },
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
  { title: 'Tasks', key: 'taskCount' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const availableTasks = computed(() => {
  if (!currentSetTasks.value) return []
  const currentIds = currentSetTasks.value.map(t => t.task_id)
  return allTasks.value.filter(t => !currentIds.includes(t.task_id))
})

const sortedSetTasks = computed(() => {
  return [...currentSetTasks.value].sort((a, b) => a.display_order - b.display_order)
})

onMounted(async () => {
  await Promise.all([
    loadTaskSets(),
    loadAllTasks()
  ])
})

async function loadTaskSets() {
  try {
    loading.value = true
    const response = await api.get('/daily-tasks/sets')
    taskSets.value = response.data.sets.map(set => ({
      ...set,
      taskCount: set.DailyTasks?.length || 0
    }))
  } catch (error) {
    console.error('Error loading task sets:', error)
  } finally {
    loading.value = false
  }
}

async function loadAllTasks() {
  try {
    const response = await api.get('/daily-tasks/tasks')
    allTasks.value = response.data.tasks
  } catch (error) {
    console.error('Error loading tasks:', error)
  }
}

function editSet(item) {
  isEditing.value = true
  setForm.value = { ...item }
  showSetDialog.value = true
}

async function saveSet() {
  try {
    if (isEditing.value) {
      await api.put(`/daily-tasks/sets/${setForm.value.set_id}`, setForm.value)
    } else {
      await api.post('/daily-tasks/sets', setForm.value)
    }
    
    showSetDialog.value = false
    await loadTaskSets()
  } catch (error) {
    console.error('Error saving task set:', error)
    alert('Failed to save task set')
  }
}

async function manageTasks(set) {
  currentSet.value = set
  
  try {
    const response = await api.get(`/daily-tasks/sets/${set.set_id}/tasks`)
    currentSetTasks.value = response.data.tasks
    showAssignDialog.value = true
  } catch (error) {
    console.error('Error loading set tasks:', error)
  }
}

async function addTaskToSet() {
  if (!selectedTaskId.value || !currentSet.value) return
  
  try {
    // Find the task details
    const task = allTasks.value.find(t => t.task_id === selectedTaskId.value)
    if (!task) return
    
    // Calculate next display order
    const nextOrder = currentSetTasks.value.length > 0
      ? Math.max(...currentSetTasks.value.map(t => parseInt(t.display_order))) + 1
      : 0
      
    const response = await api.post(`/daily-tasks/sets/${currentSet.value.set_id}/tasks`, {
      task_id: selectedTaskId.value,
      display_order: nextOrder
    })
    
    // Add to current set tasks
    currentSetTasks.value.push({
      ...task,
      display_order: nextOrder
    })
    
    selectedTaskId.value = null
  } catch (error) {
    console.error('Error adding task to set:', error)
    alert('Failed to add task to set')
  }
}

async function updateTaskOrder(task) {
  try {
    await api.put(`/daily-tasks/sets/${currentSet.value.set_id}/tasks/${task.task_id}`, {
      display_order: parseInt(task.display_order)
    })
  } catch (error) {
    console.error('Error updating task order:', error)
    alert('Failed to update task order')
  }
}

async function removeTaskFromSet(task) {
  try {
    await api.delete(`/daily-tasks/sets/${currentSet.value.set_id}/tasks/${task.task_id}`)
    currentSetTasks.value = currentSetTasks.value.filter(t => t.task_id !== task.task_id)
  } catch (error) {
    console.error('Error removing task from set:', error)
    alert('Failed to remove task')
  }
}
</script>
