<template>
  <v-container>
    <h1 class="text-h4 mb-4">
      {{ isNew ? 'Create New Message' : 'Edit Message' }}
    </h1>

    <v-form ref="form" v-model="formValid" @submit.prevent="saveMessage">
      <!-- Basic Info Card -->
      <v-card class="mb-4">
        <v-card-title>Basic Information</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="message.title"
                label="Title *"
                required
                :rules="[v => !!v || 'Title is required']"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="message.message_type"
                label="Message Type *"
                :items="messageTypes"
                required
                :rules="[v => !!v || 'Message Type is required']"
                @update:model-value="handleTypeChange"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="message.content"
                label="Message Content *"
                required
                :rules="[v => !!v || 'Content is required']"
                rows="5"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="message.image_url"
                label="Image URL"
                hint="Path to an image file (e.g., res://assets/CRM_characters/image.png)"
                persistent-hint
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="message.character_id"
                label="Sender Character"
                :items="characters"
                item-title="name"
                item-value="id"
                clearable
                :loading="loadingCharacters"
                :hint="!loadingCharacters && !characters.length ? 'No characters available. Create one first.' : ''"
                :disabled="loadingCharacters || !characters.length"
                persistent-hint
              >
                <template v-slot:selection="{ item }">
                  {{ item.raw.title ? `${item.raw.name} (${item.raw.title})` : item.raw.name }}
                </template>
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template v-slot:title>
                       {{ item.raw.title ? `${item.raw.name} (${item.raw.title})` : item.raw.name }}
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="message.active"
                label="Active"
                color="success"
                hide-details
              ></v-switch>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Task Card -->
      <v-card v-if="message.message_type === 'TASK'" class="mb-4">
        <v-card-title>Task Configuration</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="message.task_id"
                label="Task"
                :items="tasks"
                item-title="formatted_name"
                item-value="task_id"
                clearable
                :loading="loadingTasks"
                :hint="!loadingTasks && !tasks.length ? 'No tasks available' : 'Select a task or leave blank for custom task'"
                :disabled="loadingTasks || !tasks.length"
                persistent-hint
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="taskDataJson"
                label="Task Data (JSON)"
                rows="4"
                hint="Optional JSON with additional task configuration"
                persistent-hint
                :error-messages="jsonErrors.taskData"
                @input="validateJson('taskData')"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Reward Card -->
      <v-card v-if="message.message_type === 'TASK' || message.message_type === 'REWARD'" class="mb-4">
        <v-card-title>Reward Configuration</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="message.reward_type"
                label="Reward Type"
                :items="[
                  { title: 'No Reward', value: null },
                  { title: 'Chips', value: 'chips' },
                  { title: 'Gems', value: 'gems' },
                  { title: 'Action Points', value: 'action_points' }
                ]"
                item-title="title"
                item-value="value"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <!-- FIX: Moved comment outside the tag -->
              <!-- Bind rules to computed property -->
              <v-text-field
                v-model.number="message.reward_amount"
                label="Reward Amount"
                type="number"
                min="0"
                :disabled="!message.reward_type"
                :rules="rewardAmountRules"
                validate-on="input"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Trigger Card -->
      <v-card class="mb-4">
        <v-card-title>Trigger Configuration</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="message.trigger_type"
                label="Trigger Type"
                :items="triggerTypes"
                clearable
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="triggerDataJson"
                label="Trigger Data (JSON)"
                rows="4"
                hint="Optional JSON with trigger configuration. Ex: { scene: 'BlackjackScene' }"
                persistent-hint
                :error-messages="jsonErrors.triggerData"
                @input="validateJson('triggerData')"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="segmentDataJson"
                label="Segment Data (JSON)"
                rows="4"
                hint="Optional JSON with user segmentation criteria. Ex: { min_balance: 1000 }"
                persistent-hint
                :error-messages="jsonErrors.segmentData"
                @input="validateJson('segmentData')"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Actions -->
      <div class="d-flex justify-space-between pa-4">
        <v-btn
          color="secondary"
          @click="$router.push({ name: 'crm' })"
          :disabled="saving"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          type="submit"
          :disabled="!formValid || saving || hasJsonErrors"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : 'Save Message' }}
        </v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<script>
import apiService from '@/services/api'; // Ensure path is correct

export default {
  name: 'MessageForm',
  data() {
    return {
      isNew: true,
      formValid: false,
      saving: false,
      loadingCharacters: false,
      loadingTasks: false,
      message: {
        id: null,
        title: '',
        content: '',
        character_id: null,
        message_type: 'INFO',
        task_id: null,
        task_data: null,
        reward_type: null,
        reward_amount: 0,
        trigger_type: null,
        trigger_data: null,
        segment_data: null,
        active: true,
        image_url: ''
      },
      taskDataJson: '{}',
      triggerDataJson: '{}',
      segmentDataJson: '{}',
      jsonErrors: {
        taskData: '',
        triggerData: '',
        segmentData: ''
      },
      characters: [],
      tasks: [],
      messageTypes: [
        { title: 'Information', value: 'INFO' },
        { title: 'Task', value: 'TASK' },
        { title: 'Reward', value: 'REWARD' }
      ],
      triggerTypes: [
        { title: 'Manual Send Only', value: null },
        { title: 'Scene Visit', value: 'scene_visit' },
        { title: 'Game Completed', value: 'game_completed' },
        { title: 'Level Up', value: 'level_up' },
        { title: 'Balance Threshold', value: 'balance_threshold' },
        { title: 'Login', value: 'login' },
        { title: 'Custom', value: 'custom' }
      ]
    }
  },
  computed: {
    hasJsonErrors() {
      return !!this.jsonErrors.taskData || !!this.jsonErrors.triggerData || !!this.jsonErrors.segmentData;
    },
    rewardAmountRules() {
      if (!this.message.reward_type) {
        return [];
      }
      return [
        v => v !== null && v !== '' || 'Amount is required when Reward Type is set',
        v => v >= 0 || 'Amount must be 0 or more',
        v => Number.isInteger(parseFloat(v)) || 'Amount must be a whole number'
      ];
    }
  },
  created() {
    this.isNew = !this.$route.params.id;
    this.fetchCharacters();
    this.fetchTasks();

    if (!this.isNew) {
      this.fetchMessage(this.$route.params.id);
    }
  },
  methods: {
    // ---- Data Fetching Methods ----
    async fetchCharacters() {
      this.loadingCharacters = true;
      try {
        const response = await apiService.get('/crm/admin/characters');
        if (response && response.data && response.data.success && Array.isArray(response.data.characters)) {
           this.characters = response.data.characters;
           console.log('Characters fetched:', this.characters.length); // Log count
        } else {
            console.warn('Received unexpected character data structure:', response?.data);
            this.characters = [];
            throw new Error(response?.data?.error || 'Invalid response structure for characters.');
        }
      } catch (error) {
        console.error('Failed to fetch characters:', error);
        this.handleApiError(error, 'load characters');
        this.characters = [];
      } finally {
        this.loadingCharacters = false;
      }
    },

    async fetchTasks() {
      this.loadingTasks = true;
      try {
        const response = await apiService.get('/daily-tasks/tasks');
        // **** LOOK AT THE LOGS - The API MIGHT NOT WRAP tasks in { success: true, tasks: [...] } ****
        // Let's check the structure more flexibly based on logs
        console.log('Raw tasks response data:', response?.data); // Log what the API actually returns

        // Adjust this check based on the actual API response structure for tasks
        // Possibility 1: It returns { success: true, tasks: [...] }
        if (response?.data?.success && Array.isArray(response.data.tasks)) {
             this.tasks = response.data.tasks.map(task => ({
                ...task,
                formatted_name: `${task.name} (${task.task_id})`
             }));
             console.log('Tasks fetched (Structure 1):', this.tasks.length);
        // Possibility 2: It returns the array directly: [...]
        } else if (Array.isArray(response?.data)) {
             this.tasks = response.data.map(task => ({
                ...task,
                formatted_name: `${task.name} (${task.task_id})`
             }));
             console.log('Tasks fetched (Structure 2):', this.tasks.length);
        // Possibility 3: It returns { tasks: [...] } without success flag
        } else if (response?.data && Array.isArray(response.data.tasks)) {
             this.tasks = response.data.tasks.map(task => ({
                ...task,
                formatted_name: `${task.name} (${task.task_id})`
             }));
             console.log('Tasks fetched (Structure 3):', this.tasks.length);
        }
         else {
            // If none of the above match, treat as error
            console.warn('Received unexpected task data structure:', response?.data);
            this.tasks = [];
            // Use the error from the response if available, otherwise generic message
            const errorMessage = response?.data?.error || response?.data?.message || 'Invalid response structure for tasks.';
            throw new Error(errorMessage);
        }
      } catch (error) {
        // Error might have been thrown from the structure check above or be an Axios error
        console.error('Failed to fetch tasks:', error);
        // Pass the error message directly to handler if it's already extracted
        this.handleApiError(error, 'load tasks', error.message);
        this.tasks = [];
      } finally {
        this.loadingTasks = false;
      }
    },

    async fetchMessage(id) {
      this.saving = true;
      try {
        const response = await apiService.get(`/crm/admin/messages/${id}`);
         if (response && response.data && response.data.success && response.data.message) {
            this.message = response.data.message;
            console.log('Message fetched:', this.message);

            this.taskDataJson = this.message.task_data ? JSON.stringify(this.message.task_data, null, 2) : '{}';
            this.triggerDataJson = this.message.trigger_data ? JSON.stringify(this.message.trigger_data, null, 2) : '{}';
            this.segmentDataJson = this.message.segment_data ? JSON.stringify(this.message.segment_data, null, 2) : '{}';

            this.$nextTick(() => {
                if (this.$refs.form) this.$refs.form.validate();
            });
         } else {
             console.warn('Received unexpected message data structure:', response?.data);
             throw new Error(response?.data?.error || 'Invalid response structure for message.');
         }
      } catch (error) {
        console.error('Failed to fetch message:', error);
        this.handleApiError(error, 'load message', error.message);
        this.$router.push({ name: 'crm' });
      } finally {
        this.saving = false;
      }
    },

    // ---- Form Logic Methods ----
    handleTypeChange() {
      if (this.message.message_type === 'INFO') {
        this.message.task_id = null;
        this.message.reward_type = null;
        this.message.reward_amount = 0;
        this.taskDataJson = '{}';
        this.jsonErrors.taskData = '';
      }
       if (this.message.message_type === 'REWARD') {
          this.message.task_id = null;
          this.taskDataJson = '{}';
          this.jsonErrors.taskData = '';
       }
       this.$nextTick(() => {
            if (this.$refs.form) this.$refs.form.validate();
       });
    },

    validateJson(fieldKey) {
      const jsonString = this[`${fieldKey}Json`];
      this.jsonErrors[fieldKey] = '';
      let isValid = true;

      if (jsonString && jsonString.trim() && jsonString.trim() !== '{}') {
        try {
          JSON.parse(jsonString);
        } catch (e) {
          this.jsonErrors[fieldKey] = 'Invalid JSON: ' + e.message;
          isValid = false;
        }
      }
       this.$nextTick(() => {
            if (this.$refs.form) this.$refs.form.validate();
       });
      return isValid;
    },

    validateAllJson() {
        const taskValid = this.validateJson('taskData');
        const triggerValid = this.validateJson('triggerData');
        const segmentValid = this.validateJson('segmentData');
        return taskValid && triggerValid && segmentValid;
    },

    // ---- Save Method ----
    async saveMessage() {
      const formIsValid = await this.$refs.form.validate();
      const jsonIsValid = this.validateAllJson();

      if (!formIsValid || !jsonIsValid) {
        console.warn('Validation failed. Form valid:', formIsValid, 'JSON valid:', jsonIsValid);
         this.showToast('warning', 'Please correct the errors before saving.');
        return;
      }

      this.saving = true;

      try {
        const payload = JSON.parse(JSON.stringify(this.message));

        if (this.taskDataJson && this.taskDataJson.trim() !== '{}' && !this.jsonErrors.taskData) {
          payload.task_data = JSON.parse(this.taskDataJson);
        } else {
          payload.task_data = null;
        }

        if (this.triggerDataJson && this.triggerDataJson.trim() !== '{}' && !this.jsonErrors.triggerData) {
          payload.trigger_data = JSON.parse(this.triggerDataJson);
        } else {
           payload.trigger_data = null;
        }

        if (this.segmentDataJson && this.segmentDataJson.trim() !== '{}' && !this.jsonErrors.segmentData) {
          payload.segment_data = JSON.parse(this.segmentDataJson);
        } else {
           payload.segment_data = null;
        }

        payload.reward_amount = Number(payload.reward_amount) || 0;

        if (!payload.character_id) payload.character_id = null;
        if (!payload.task_id) payload.task_id = null;
        if (!payload.reward_type) {
            payload.reward_type = null;
            payload.reward_amount = 0;
        }
        if (!payload.trigger_type) payload.trigger_type = null;

        console.log('Saving message. Is New:', this.isNew, 'Payload:', JSON.stringify(payload));

        let response;

        if (this.isNew) {
          response = await apiService.post('/crm/admin/messages', payload);
        } else {
          response = await apiService.put(`/crm/admin/messages/${this.message.id}`, payload);
        }

        console.log('Save Message Raw Response:', response);

        if (response && response.data && response.data.success === true) {
          const successMessage = this.isNew ? 'Message created successfully' : 'Message updated successfully';
          console.log(successMessage, 'API Data:', response.data);
           this.showToast('success', successMessage);
          this.$router.push({ name: 'crm' });
        } else {
          const errorMessage = response?.data?.error || 'API did not indicate success.';
          console.error('Failed to save message (API logic error):', errorMessage, 'Full response data:', response?.data);
          this.showToast('error', `Failed to save message: ${errorMessage}`);
        }

      } catch (error) {
         console.error('Failed to save message (Request/Network Error):', error);
         this.handleApiError(error, 'save message');
      } finally {
        this.saving = false;
      }
    },

     // ---- Utility Methods ----
     showToast(type, message) {
         if (this.$toast && typeof this.$toast[type] === 'function') {
             this.$toast[type](message);
         } else {
             console.warn(`Toast notification system not available. Message (${type}): ${message}`);
             alert(`${type.toUpperCase()}: ${message}`);
         }
     },

     // Updated error handler to accept an optional pre-extracted message
     handleApiError(error, action = 'perform action', specificMessage = null) {
         let errorMessage = specificMessage || `Failed to ${action}. An unknown error occurred.`; // Use specific message if provided

         // If no specific message, try to extract from Axios error object
         if (!specificMessage) {
             if (error.response) {
                console.error(`Error Response Data (${action}):`, error.response.data);
                errorMessage = error.response.data?.error ||
                               error.response.data?.message ||
                               (typeof error.response.data === 'string' && error.response.data.length < 100 ? error.response.data : null) ||
                               `Server responded with status ${error.response.status}`;
             } else if (error.request) {
                 errorMessage = `Failed to ${action}. Network error or no response from server.`;
             } else if (error.message) {
                  errorMessage = `Failed to ${action}. ${error.message}`;
             }
         }
         this.showToast('error', errorMessage);
     }
  }
}
</script>
