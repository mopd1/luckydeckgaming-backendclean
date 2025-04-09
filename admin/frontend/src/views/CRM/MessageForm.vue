<template>
  <v-container>
    <h1 class="text-h4 mb-4">
      {{ isNew ? 'Create New Message' : 'Edit Message' }}
    </h1>
    
    <v-form ref="form" v-model="formValid" @submit.prevent="saveMessage">
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
            
            <v-col cols="12" md="6">
              <v-select
                v-model="message.character_id"
                label="Sender Character"
                :items="characters"
                item-title="name"
                item-value="id"
                clearable
                :hint="!characters.length ? 'No characters available' : ''"
                :disabled="!characters.length"
              >
                <template v-slot:selection="{ item }">
                  {{ item.title ? `${item.raw.name} (${item.raw.title})` : item.raw.name }}
                </template>
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template v-slot:title>
                      {{ item.title ? `${item.raw.name} (${item.raw.title})` : item.raw.name }}
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
      
      <!-- Task-specific fields -->
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
                :hint="!tasks.length ? 'No tasks available' : 'Select a task or leave blank for custom task'"
                :disabled="!tasks.length"
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
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      
      <!-- Reward fields (shown for both TASK and REWARD types) -->
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
              <v-text-field
                v-model.number="message.reward_amount"
                label="Reward Amount"
                type="number"
                min="0"
                :disabled="!message.reward_type"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      
      <!-- Trigger fields -->
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
                hint="Optional JSON with trigger configuration (e.g. {&quot;scene&quot;: &quot;BlackjackScene&quot;})"
                persistent-hint
                :error-messages="jsonErrors.triggerData"
              ></v-textarea>
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="segmentDataJson"
                label="Segment Data (JSON)"
                rows="4"
                hint="Optional JSON with user segmentation criteria (e.g. {&quot;min_balance&quot;: 1000})"
                persistent-hint
                :error-messages="jsonErrors.segmentData"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      
      <div class="d-flex justify-space-between">
        <v-btn
          color="secondary"
          @click="$router.push({ name: 'crm' })"
        >
          Cancel
        </v-btn>
        
        <v-btn
          color="primary"
          type="submit"
          :disabled="!formValid || saving"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : 'Save Message' }}
        </v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<script>
import apiService from '@/services/api';

export default {
  name: 'MessageForm',
  data() {
    return {
      isNew: true,
      formValid: false,
      saving: false,
      message: {
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
        active: true
      },
      taskDataJson: '{}',
      triggerDataJson: '{}',
      segmentDataJson: '{}',
      jsonErrors: {
        taskData: [],
        triggerData: [],
        segmentData: []
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
  created() {
    this.isNew = !this.$route.params.id;
    this.fetchCharacters();
    this.fetchTasks();
    
    if (!this.isNew) {
      this.fetchMessage(this.$route.params.id);
    }
  },
  methods: {
    async fetchCharacters() {
      try {
        const response = await apiService.get('/api/crm/admin/characters');
        this.characters = response.data.characters;
      } catch (error) {
        console.error('Failed to fetch characters:', error);
        this.$toast.error('Failed to load characters: ' + (error.response?.data?.error || error.message));
      }
    },
    async fetchTasks() {
      try {
        const response = await apiService.get('/api/daily-tasks/tasks');
        this.tasks = response.data.tasks.map(task => ({
          ...task,
          formatted_name: `${task.name} (${task.task_id})`
        }));
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        this.$toast.error('Failed to load tasks: ' + (error.response?.data?.error || error.message));
      }
    },
    async fetchMessage(id) {
      try {
        const response = await apiService.get(`/api/crm/admin/messages/${id}`);
        this.message = response.data;
        
// Initialize JSON string fields
        this.taskDataJson = this.message.task_data ? JSON.stringify(this.message.task_data, null, 2) : '{}';
        this.triggerDataJson = this.message.trigger_data ? JSON.stringify(this.message.trigger_data, null, 2) : '{}';
        this.segmentDataJson = this.message.segment_data ? JSON.stringify(this.message.segment_data, null, 2) : '{}';
      } catch (error) {
        console.error('Failed to fetch message:', error);
        this.$toast.error('Failed to load message: ' + (error.response?.data?.error || error.message));
        this.$router.push({ name: 'crm' });
      }
    },
    handleTypeChange() {
      // Reset task and reward fields if type changes to INFO
      if (this.message.message_type === 'INFO') {
        this.message.task_id = null;
        this.message.reward_type = null;
        this.message.reward_amount = 0;
      }
    },
    validateJson() {
      // Reset errors
      this.jsonErrors = {
        taskData: [],
        triggerData: [],
        segmentData: []
      };
      
      let isValid = true;
      
      // Validate task data
      if (this.taskDataJson.trim() && this.taskDataJson !== '{}') {
        try {
          JSON.parse(this.taskDataJson);
        } catch (e) {
          this.jsonErrors.taskData = ['Invalid JSON format: ' + e.message];
          isValid = false;
        }
      }
      
      // Validate trigger data
      if (this.triggerDataJson.trim() && this.triggerDataJson !== '{}') {
        try {
          JSON.parse(this.triggerDataJson);
        } catch (e) {
          this.jsonErrors.triggerData = ['Invalid JSON format: ' + e.message];
          isValid = false;
        }
      }
      
      // Validate segment data
      if (this.segmentDataJson.trim() && this.segmentDataJson !== '{}') {
        try {
          JSON.parse(this.segmentDataJson);
        } catch (e) {
          this.jsonErrors.segmentData = ['Invalid JSON format: ' + e.message];
          isValid = false;
        }
      }
      
      return isValid;
    },
    async saveMessage() {
      if (!this.$refs.form.validate() || !this.validateJson()) {
        return;
      }
      
      this.saving = true;
      
      try {
        // Parse the JSON fields
        const payload = {
          ...this.message
        };
        
        // Parse JSON fields if they're not empty
        if (this.taskDataJson.trim() && this.taskDataJson !== '{}') {
          payload.task_data = JSON.parse(this.taskDataJson);
        }
        
        if (this.triggerDataJson.trim() && this.triggerDataJson !== '{}') {
          payload.trigger_data = JSON.parse(this.triggerDataJson);
        }
        
        if (this.segmentDataJson.trim() && this.segmentDataJson !== '{}') {
          payload.segment_data = JSON.parse(this.segmentDataJson);
        }
        
        if (this.isNew) {
          await apiService.post('/crm/admin/messages', payload);
          this.$toast.success('Message created successfully');
        } else {
          await apiService.put(`/crm/admin/messages/${this.message.id}`, payload);
          this.$toast.success('Message updated successfully');
        }
        
        this.$router.push({ name: 'crm' });
      } catch (error) {
        console.error('Failed to save message:', error);
        this.$toast.error('Failed to save message: ' + (error.response?.data?.error || error.message));
      } finally {
        this.saving = false;
      }
    }
  }
}
</script>
