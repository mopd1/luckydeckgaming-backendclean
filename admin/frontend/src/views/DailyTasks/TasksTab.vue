<template>
  <div>
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>Available Tasks (Debug Mode: {{ tasks.length }} tasks loaded)</span>
        <v-btn color="primary" @click="openNewTaskDialog">Add New Task</v-btn>
      </v-card-title>
      
      <div style="background-color: #222; color: #lime; padding: 10px; margin: 10px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; border: 1px solid #444; font-family: monospace;">
        <p style="font-weight: bold; margin-bottom: 5px;">DEBUG: tasks.value content:</p>
        {{ JSON.stringify(tasks, null, 2) }}
      </div>

      <v-data-table
        :headers="simplifiedHeaders"
        :items="tasks"
        :loading="loading"
        class="elevation-1"
        item-key="id"
        style="border: 2px solid red; min-height: 50px;" 
      >
              
        <template v-slot:no-data>
          <v-alert type="info" prominent border="start" class="ma-4">
            <div class="text-h6">No Tasks Available</div>
            <div>There are currently no daily tasks configured. (Custom no-data slot)</div>
          </v-alert>
        </template>

        <template v-slot:loading>
          <div style="padding: 20px; text-align: center;">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p>Loading tasks, please wait... (Custom loading slot)</p>
          </div>
        </template>
      </v-data-table>
      
    </v-card>
    
    <v-dialog v-model="showTaskDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="headline">{{ isEditing ? 'Edit Task' : 'Add New Task' }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="taskDialogForm" @submit.prevent="saveTask">
            <v-text-field
              v-model="taskForm.task_id"
              label="Task ID*"
              :disabled="isEditing"
              required
              :rules="[v => !!v || 'Task ID is required']"
              hint="Unique identifier for the task (e.g., play_10_hands_nlh)"
            ></v-text-field>
            
            <v-text-field
              v-model="taskForm.name"
              label="Task Name*"
              required
              :rules="[v => !!v || 'Task Name is required']"
            ></v-text-field>
            
            <v-text-field
              v-model="taskForm.description"
              label="Description*"
              required
              :rules="[v => !!v || 'Description is required']"
            ></v-text-field>
            
            <v-select
              v-model="taskForm.action_id"
              :items="availableActions"
              item-title="name"
              item-value="action_id"
              label="Action Type*"
              required
              :rules="[v => !!v || 'Action Type is required']"
              hint="Select the action that will trigger task progress"
              persistent-hint
            ></v-select>
            
            <v-text-field
              v-model.number="taskForm.required_repetitions"
              label="Required Repetitions*"
              type="number"
              min="1"
              required
              :rules="[v => (v !== null && v !== undefined && v >= 1) || 'Must be at least 1']"
            ></v-text-field>
            
            <v-select
              v-model="taskForm.reward_type"
              :items="['gems', 'chips', 'action_points']" 
              label="Reward Type*"
              required
              :rules="[v => !!v || 'Reward Type is required']"
            ></v-select>
            
            <v-text-field
              v-model.number="taskForm.reward_amount"
              label="Reward Amount*"
              type="number"
              min="0"
              required
              :rules="[v => (v !== null && v !== undefined && v >= 0) || 'Must be at least 0']"
            ></v-text-field>

             <v-checkbox
              v-model="taskForm.is_active"
              label="Is Active?"
            ></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeTaskDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveTask">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import api from '../../services/api'; 

const tasks = ref([]);
const loading = ref(true);
const showTaskDialog = ref(false);
const isEditing = ref(false);
const taskDialogForm = ref(null); 

const defaultTaskForm = {
  task_id: '',
  name: '',
  description: '',
  action_id: null,
  required_repetitions: 1,
  reward_type: 'gems',
  reward_amount: 100,
  is_active: true,
};
const taskForm = ref({ ...defaultTaskForm });

const availableActions = ref([]);

const simplifiedHeaders = ref([
  { title: 'Task ID', key: 'task_id', sortable: false },
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Description', key: 'description', sortable: false }
]);

function openNewTaskDialog() {
  isEditing.value = false;
  taskForm.value = { ...defaultTaskForm };
  showTaskDialog.value = true;
  nextTick(() => {
    if (taskDialogForm.value) {
      taskDialogForm.value.resetValidation();
    }
  });
}

function closeTaskDialog() {
  showTaskDialog.value = false;
  isEditing.value = false;
  nextTick(() => {
    if (taskDialogForm.value) {
      taskDialogForm.value.resetValidation();
    }
  });
}

async function loadTasks() {
  // loading.value = true; // This is already set when component is created or can be set here
  console.log('[TasksTab] Attempting to load tasks...');
  
  // --- TEMPORARY TEST 1: Verify no-data slot ---
  tasks.value = []; 
  loading.value = false; 
  console.log('[TasksTab] TEST 1 ACTIVE: tasks set to empty, loading false. Check for no-data slot.');
  return; // Stop the function here so it doesn't fetch real data for this test
  // --- END TEMPORARY TEST 1 ---

  // Original code (will be skipped due to the return above for Test 1)
  // try {
  //   const response = await api.get('/daily-tasks/tasks');
  //   console.log('[TasksTab] Raw API response for /tasks:', JSON.parse(JSON.stringify(response)));
    
  //   if (response.data && Array.isArray(response.data.tasks)) {
  //     tasks.value = response.data.tasks;
  //     console.log('[TasksTab] Tasks successfully assigned to tasks.value (length):', tasks.value.length);
  //     if (tasks.value.length > 0) {
  //       console.log('[TasksTab] First task object structure:', JSON.parse(JSON.stringify(tasks.value[0])));
  //     } else {
  //       console.log('[TasksTab] tasks.value is empty after assignment.');
  //     }
  //   } else {
  //     console.error('[TasksTab] Unexpected data structure. response.data:', JSON.parse(JSON.stringify(response.data)));
  //     tasks.value = [];
  //   }
  // } catch (error) {
  //   console.error('Error loading tasks:', error);
  //   tasks.value = [];
  // } finally {
  //   loading.value = false;
  //   console.log('[TasksTab] loadTasks finished. Loading state:', loading.value);
  // }
}

function editTask(item) {
  isEditing.value = true;
  taskForm.value = { 
    ...defaultTaskForm, 
    ...JSON.parse(JSON.stringify(item)), 
    action_id: item.action ? item.action.action_id : (item.action_id || null),
  };
  taskForm.value.required_repetitions = Number(taskForm.value.required_repetitions);
  taskForm.value.reward_amount = Number(taskForm.value.reward_amount);
  taskForm.value.is_active = item.is_active === undefined ? true : !!item.is_active;
  
  showTaskDialog.value = true;
  nextTick(() => {
    if (taskDialogForm.value) {
      taskDialogForm.value.resetValidation();
    }
  });
}

async function loadActions() {
  try {
    const response = await api.get('/daily-tasks/actions');
    availableActions.value = response.data.actions;
  } catch (error) {
    console.error('Error loading actions:', error);
  }
}

async function saveTask() {
  if (taskDialogForm.value) {
    const { valid } = await taskDialogForm.value.validate();
    if (!valid) {
      alert('Please correct the form errors.');
      return;
    }
  }

  try {
    const payload = {
      task_id: taskForm.value.task_id,
      name: taskForm.value.name,
      description: taskForm.value.description,
      action_id: taskForm.value.action_id,
      required_repetitions: parseInt(taskForm.value.required_repetitions, 10) || 1,
      reward_type: taskForm.value.reward_type,
      reward_amount: parseInt(taskForm.value.reward_amount, 10) || 0,
      is_active: taskForm.value.is_active === undefined ? true : !!taskForm.value.is_active
    };

    delete payload.action; 
    delete payload.taskSet; 

    if (isEditing.value) {
      await api.put(`/daily-tasks/tasks/${taskForm.value.id}`, payload);
    } else {
      if (!payload.task_id) {
         alert('Task ID is required for new tasks. Please enter a unique ID.');
         return;
      }
      await api.post('/daily-tasks/tasks', payload);
    }
    
    closeTaskDialog();
    await loadTasks(); // This will now run the TEST 1 logic again after save
                       // If you want to see the updated list after save, you'd comment out TEST 1 lines.
  } catch (error) {
    console.error('Error saving task:', error);
    let errorMessage = 'Failed to save task.';
    if (error.response && error.response.data) {
      if (error.response.data.error) {
        errorMessage += ` Server error: ${error.response.data.error}`;
      }
      if (error.response.data.details) {
        errorMessage += ` Details: ${typeof error.response.data.details === 'string' ? error.response.data.details : JSON.stringify(error.response.data.details)}`;
      }
      if (error.response.data.message && !error.response.data.error) { 
        errorMessage += ` Message: ${error.response.data.message}`;
      }
    }
    alert(errorMessage);
  }
}

onMounted(async () => {
  await loadActions(); 
  await loadTasks(); // This will execute the TEST 1 logic on mount
});

</script>

<style scoped>
/* You can add component-specific styles here if needed */
</style>
