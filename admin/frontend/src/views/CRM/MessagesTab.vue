<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">CRM Messages</h2>
      <v-btn color="primary" @click="createMessage">
        <v-icon left>mdi-plus</v-icon>
        New Message
      </v-btn>
    </div>
    
    <!-- Search bar -->
    <v-card class="mb-4">
      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search messages..."
          single-line
          hide-details
          clearable
          @input="searchMessages"
          @click:clear="clearSearch"
        ></v-text-field>
      </v-card-text>
    </v-card>

    <!-- Custom table implementation (proven pattern) -->
    <v-card>
      <div v-if="!loading" class="v-table v-table--density-default v-theme--dark">
        <table>
          <thead>
            <tr style="background: rgba(255,255,255,0.05); height: 52px;">
              <th style="width: 5%; padding: 16px;">ID</th>
              <th style="width: 20%; padding: 16px;">Title</th>
              <th style="width: 15%; padding: 16px;">Sender</th>
              <th style="width: 10%; padding: 16px;">Type</th>
              <th style="width: 10%; padding: 16px;">Trigger</th>
              <th style="width: 8%; padding: 16px;">Status</th>
              <th style="width: 12%; padding: 16px;">Created</th>
              <th style="width: 20%; padding: 16px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="message in filteredMessages" :key="message.id" class="custom-row" style="border-bottom: 1px solid rgba(255,255,255,0.12);">
              <td style="padding: 16px;">{{ message.id }}</td>
              <td style="padding: 16px;">
                <div class="text-truncate" style="max-width: 200px;" :title="message.title">
                  {{ message.title }}
                </div>
              </td>
              <td style="padding: 16px;">{{ message.character?.name || '-' }}</td>
              <td style="padding: 16px;">
                <v-chip :color="getMessageTypeColor(message.message_type)" size="small" dark>
                  {{ message.message_type }}
                </v-chip>
              </td>
              <td style="padding: 16px;">{{ message.trigger_type || '-' }}</td>
              <td style="padding: 16px;">
                <v-chip :color="message.active ? 'success' : 'grey'" size="small" dark>
                  {{ message.active ? 'Active' : 'Inactive' }}
                </v-chip>
              </td>
              <td style="padding: 16px;">{{ formatDate(message.created_at) }}</td>
              <td style="padding: 16px;">
                <v-btn size="small" icon color="primary" @click="editMessage(message)" class="me-1">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn size="small" icon color="success" @click="sendMessage(message)" class="me-1">
                  <v-icon>mdi-send</v-icon>
                </v-btn>
                <v-btn size="small" icon color="error" @click="confirmDelete(message)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="mt-2">Loading messages...</p>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredMessages.length === 0" class="text-center pa-4">
        <v-icon size="64" color="grey">mdi-message-text</v-icon>
        <p class="mt-2 text-grey">{{ search ? 'No messages found matching your search' : 'No messages found' }}</p>
        <v-btn color="primary" class="mt-2" @click="createMessage">
          Create First Message
        </v-btn>
      </div>
    </v-card>
    
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

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
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
      search: '',
      searchTimeout: null,
      confirmDialog: false,
      messageToDelete: null,
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success'
    }
  },
  computed: {
    filteredMessages() {
      if (!this.search) return this.messages;
      
      const searchTerm = this.search.toLowerCase();
      return this.messages.filter(message => 
        message.title.toLowerCase().includes(searchTerm) ||
        message.message_type.toLowerCase().includes(searchTerm) ||
        message.trigger_type?.toLowerCase().includes(searchTerm) ||
        message.character?.name?.toLowerCase().includes(searchTerm)
      );
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
        this.messages = response.data.messages || [];
        console.log('Messages loaded:', this.messages.length);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        this.showSnackbar('Failed to load messages: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.loading = false;
      }
    },
    
    searchMessages() {
      // Debounce search to avoid too many operations
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        // Search is handled by computed property
      }, 300);
    },
    
    clearSearch() {
      this.search = '';
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
        this.showSnackbar('Message deleted successfully', 'success');
        this.fetchMessages();
      } catch (error) {
        console.error('Failed to delete message:', error);
        this.showSnackbar('Failed to delete message: ' + (error.response?.data?.error || error.message), 'error');
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
    },
    
    showSnackbar(text, color = 'success') {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.snackbar = true;
    }
  }
}
</script>

<style scoped>
.custom-row:hover {
  background-color: rgba(255, 255, 255, 0.04) !important;
}

.v-table table {
  width: 100%;
  border-collapse: collapse;
}

.v-table th,
.v-table td {
  text-align: left;
}

.v-table th {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.0892857143em;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
