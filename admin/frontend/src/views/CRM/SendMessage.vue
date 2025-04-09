<template>
  <v-container>
    <h1 class="text-h4 mb-4">Send CRM Message</h1>
    
    <v-card class="mb-4">
      <v-card-title>Message Details</v-card-title>
      <v-card-text v-if="message">
        <v-row>
          <v-col cols="12" md="6">
            <p><strong>Title:</strong> {{ message.title }}</p>
            <p><strong>Sender:</strong> {{ message.character ? message.character.name : 'System' }}</p>
            <p><strong>Type:</strong> {{ message.message_type }}</p>
          </v-col>
          <v-col cols="12" md="6">
            <p v-if="message.message_type === 'TASK' && message.task_id">
              <strong>Task ID:</strong> {{ message.task_id }}
            </p>
            <p v-if="message.message_type === 'REWARD' || 
                    (message.message_type === 'TASK' && message.reward_type)">
              <strong>Reward:</strong> {{ message.reward_amount }} {{ message.reward_type }}
            </p>
          </v-col>
        </v-row>
        
        <div class="mt-3">
          <p><strong>Content:</strong></p>
          <div class="pa-3 bg-grey-lighten-4 rounded">
            {{ message.content }}
          </div>
        </div>
      </v-card-text>
      <v-card-text v-else>
        <v-skeleton-loader type="article"></v-skeleton-loader>
      </v-card-text>
    </v-card>
    
    <v-card>
      <v-card-title>Select Recipients</v-card-title>
      <v-card-text>
        <v-tabs v-model="activeTab">
          <v-tab value="users">Specific Users</v-tab>
          <v-tab value="segment">User Segment</v-tab>
        </v-tabs>
        
        <v-window v-model="activeTab" class="mt-4">
          <v-window-item value="users">
            <v-textarea
              v-model="userIds"
              label="User IDs"
              rows="4"
              placeholder="Enter user IDs separated by commas or new lines"
              hint="Enter specific user IDs who should receive this message"
              persistent-hint
            ></v-textarea>
          </v-window-item>
          
          <v-window-item value="segment">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.min_balance"
                  label="Min Chips"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.max_balance"
                  label="Max Chips"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.min_gems"
                  label="Min Gems"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.max_gems"
                  label="Max Gems"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.min_action_points"
                  label="Min Action Points"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.max_action_points"
                  label="Max Action Points"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="segment.is_active"
                  label="User Status"
                  :items="[
                    { title: 'Any', value: undefined },
                    { title: 'Active Only', value: true },
                    { title: 'Inactive Only', value: false }
                  ]"
                  item-title="title"
                  item-value="value"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="segment.min_account_age_days"
                  label="Min Account Age (days)"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions class="d-flex justify-space-between pa-4">
        <v-btn color="secondary" @click="$router.push({ name: 'crm' })">
          Cancel
        </v-btn>
        <v-btn 
          color="primary" 
          :disabled="sending" 
          :loading="sending"
          @click="sendMessage"
        >
          {{ sending ? 'Sending...' : 'Send Message' }}
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Result Dialog -->
    <v-dialog v-model="resultDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          Message Sent
        </v-card-title>
        <v-card-text>
          <p>Message sent successfully to {{ sendResult.sent_count }} users out of {{ sendResult.total_target_users }} targeted users.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="resultDialog = false; $router.push({ name: 'crm' })">
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import apiService from '@/services/api';

export default {
  name: 'SendMessage',
  data() {
    return {
      message: null,
      activeTab: 'users',
      userIds: '',
      segment: {
        min_balance: null,
        max_balance: null,
        min_gems: null,
        max_gems: null,
        min_action_points: null,
        max_action_points: null,
        is_active: undefined,
        min_account_age_days: null,
        max_account_age_days: null
      },
      sending: false,
      resultDialog: false,
      sendResult: {
        sent_count: 0,
        total_target_users: 0
      }
    }
  },
  created() {
    this.fetchMessage(this.$route.params.id);
  },
  methods: {
    async fetchMessage(id) {
      try {
        const response = await apiService.get(`/crm/admin/messages/${id}`);
        this.message = response.data;
      } catch (error) {
        console.error('Failed to fetch message:', error);
        this.$toast.error('Failed to load message: ' + (error.response?.data?.error || error.message));
        this.$router.push({ name: 'crm' });
      }
    },
    async sendMessage() {
      if (!this.message) return;
      
      this.sending = true;
      
      try {
        let payload = {
          message_id: this.message.id
        };
        
        if (this.activeTab === 'users' && this.userIds.trim()) {
          // Split user IDs by commas, spaces, or new lines
          const userIdArray = this.userIds
            .split(/[\s,]+/)
            .filter(id => id.trim())
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));
          
          if (userIdArray.length === 0) {
            this.$toast.error('Please enter valid user IDs');
            this.sending = false;
            return;
          }
          
          payload.user_ids = userIdArray;
        } else if (this.activeTab === 'segment') {
          // Filter out null/undefined values
          const filteredSegment = Object.fromEntries(
            Object.entries(this.segment)
              .filter(([_, value]) => value !== null && value !== undefined)
          );
          
          if (Object.keys(filteredSegment).length === 0) {
            this.$toast.error('Please specify at least one segment criterion');
            this.sending = false;
            return;
          }
          
          payload.segment = filteredSegment;
        } else {
          this.$toast.error('Please select users or specify segment criteria');
          this.sending = false;
          return;
        }
        
        const response = await apiService.post('/crm/admin/send-message', payload);
        this.sendResult = response.data;
        this.resultDialog = true;
      } catch (error) {
        console.error('Failed to send message:', error);
        this.$toast.error('Failed to send message: ' + (error.response?.data?.error || error.message));
      } finally {
        this.sending = false;
      }
    }
  }
}
</script>
