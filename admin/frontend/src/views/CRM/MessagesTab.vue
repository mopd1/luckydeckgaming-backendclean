<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">CRM Messages</h2>
      <v-btn color="primary" @click="createMessage">
        New Message
      </v-btn>
    </div>
    
    <v-data-table
      :headers="headers"
      :items="messages"
      :loading="loading"
      :items-per-page="10"
      class="elevation-1"
    >
      <template v-slot:item.message_type="{ item }">
        <v-chip
          :color="getMessageTypeColor(item.message_type)"
          text-color="white"
          size="small"
        >
          {{ item.message_type }}
        </v-chip>
      </template>
      
      <template v-slot:item.active="{ item }">
        <v-chip
          :color="item.active ? 'success' : 'grey'"
          text-color="white"
          size="small"
        >
          {{ item.active ? 'Active' : 'Inactive' }}
        </v-chip>
      </template>
      
      <template v-slot:item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
      
      <template v-slot:item.actions="{ item }">
        <v-btn icon size="small" color="primary" @click="editMessage(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" color="success" class="ml-2" @click="sendMessage(item)">
          <v-icon>mdi-send</v-icon>
        </v-btn>
        <v-btn icon size="small" color="error" class="ml-2" @click="confirmDelete(item)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>
    
    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">
          Confirm Deletion
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the message "{{ messageToDelete?.title }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="confirmDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="text" @click="deleteMessage">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import apiService from '@/services/api';

export default {
  name: 'MessagesTab',
  data() {
    return {
      messages: [],
      loading: true,
      headers: [
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Title', key: 'title', sortable: true },
        { title: 'Sender', key: 'character.name', sortable: true },
        { title: 'Type', key: 'message_type', sortable: true },
        { title: 'Trigger', key: 'trigger_type', sortable: true },
        { title: 'Active', key: 'active', sortable: true },
        { title: 'Created', key: 'created_at', sortable: true },
        { title: 'Actions', key: 'actions', sortable: false }
      ],
      confirmDialog: false,
      messageToDelete: null
    }
  },
  mounted() {
    this.fetchMessages();
  },
  methods: {
    async fetchMessages() {
      this.loading = true;
      try {
        const response = await apiService.get('/crm/admin/messages');
        this.messages = response.data.messages;
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        this.$toast.error('Failed to load messages: ' + (error.response?.data?.error || error.message));
      } finally {
        this.loading = false;
      }
    },
    createMessage() {
      this.$router.push({ name: 'crm-message-create' });
    },
    editMessage(message) {
      this.$router.push({ 
        name: 'crm-message-edit', 
        params: { id: message.id } 
      });
    },
    sendMessage(message) {
      this.$router.push({ 
        name: 'crm-message-send', 
        params: { id: message.id } 
      });
    },
    confirmDelete(message) {
      this.messageToDelete = message;
      this.confirmDialog = true;
    },
    async deleteMessage() {
      if (!this.messageToDelete) return;
      
      try {
        await apiService.delete(`/crm/admin/messages/${this.messageToDelete.id}`);
        this.$toast.success('Message deleted successfully');
        this.fetchMessages();
      } catch (error) {
        console.error('Failed to delete message:', error);
        this.$toast.error('Failed to delete message: ' + (error.response?.data?.error || error.message));
      } finally {
        this.confirmDialog = false;
        this.messageToDelete = null;
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    },
    getMessageTypeColor(type) {
      switch (type) {
        case 'INFO': return 'info';
        case 'TASK': return 'warning';
        case 'REWARD': return 'success';
        default: return 'grey';
      }
    }
  }
}
</script>
