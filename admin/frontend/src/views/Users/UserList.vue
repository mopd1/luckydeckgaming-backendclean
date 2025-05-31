<template>
  <v-container>
    <v-card>
      <v-card-title>
        User Management
        <v-spacer></v-spacer>
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search users..."
          single-line
          hide-details
          clearable
          @input="searchUsers"
          @click:clear="clearSearch"
        ></v-text-field>
      </v-card-title>
      
      <!-- Custom table implementation (proven pattern from Daily Tasks/Packages) -->
      <div v-if="!loading" class="v-table v-table--density-default v-theme--dark">
        <table>
          <thead>
            <tr style="background: rgba(255,255,255,0.05); height: 52px;">
              <th style="width: 5%; padding: 16px;">ID</th>
              <th style="width: 15%; padding: 16px;">Username</th>
              <th style="width: 20%; padding: 16px;">Email</th>
              <th style="width: 15%; padding: 16px;">Display Name</th>
              <th style="width: 10%; padding: 16px;">Balance</th>
              <th style="width: 8%; padding: 16px;">Status</th>
              <th style="width: 8%; padding: 16px;">Locked</th>
              <th style="width: 10%; padding: 16px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="custom-row" style="border-bottom: 1px solid rgba(255,255,255,0.12);">
              <td style="padding: 16px;">{{ user.id }}</td>
              <td style="padding: 16px;">{{ user.username }}</td>
              <td style="padding: 16px;">{{ user.email || '-' }}</td>
              <td style="padding: 16px;">{{ user.display_name || '-' }}</td>
              <td style="padding: 16px;">{{ formatNumber(user.balance) }}</td>
              <td style="padding: 16px;">
                <v-chip :color="user.is_active ? 'green' : 'red'" size="small" dark>
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </td>
              <td style="padding: 16px;">
                <v-chip v-if="user.account_locked" color="red" size="small" dark>Locked</v-chip>
                <span v-else>-</span>
              </td>
              <td style="padding: 16px;">
                <v-btn size="small" icon color="primary" @click="viewUser(user)" class="me-1">
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
                <v-btn size="small" icon color="success" @click="editBalance(user)">
                  <v-icon>mdi-currency-usd</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="mt-2">Loading users...</p>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && users.length === 0" class="text-center pa-4">
        <v-icon size="64" color="grey">mdi-account-search</v-icon>
        <p class="mt-2 text-grey">{{ search ? 'No users found matching your search' : 'No users found' }}</p>
      </div>

      <!-- Pagination -->
      <v-card-actions v-if="!loading && total > 0">
        <v-spacer></v-spacer>
        <span class="text-caption me-4">{{ paginationText }}</span>
        <v-btn :disabled="page <= 1" @click="previousPage" icon size="small">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <span class="mx-2 text-caption">{{ page }} / {{ totalPages }}</span>
        <v-btn :disabled="page >= totalPages" @click="nextPage" icon size="small">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Balance Edit Dialog -->
    <v-dialog v-model="balanceDialog" max-width="500px">
      <v-card>
        <v-card-title>Edit User Balance</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <p><strong>Username:</strong> {{ selectedUser.username }}</p>
                <p><strong>Current Balance:</strong> {{ formatNumber(selectedUser.balance) }}</p>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="balanceOperation"
                  label="Operation"
                  :items="operations"
                  outlined
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model.number="balanceAmount"
                  label="Amount"
                  type="number"
                  outlined
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="balanceDialog = false">Cancel</v-btn>
          <v-btn color="primary" text @click="updateBalance">Update Balance</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'UserList',
  data() {
    return {
      users: [],
      loading: false,
      total: 0,
      page: 1,
      itemsPerPage: 10,
      search: '',
      searchTimeout: null,
      balanceDialog: false,
      selectedUser: {},
      balanceOperation: 'add',
      balanceAmount: 0,
      operations: [
        { text: 'Add Chips', value: 'add' },
        { text: 'Subtract Chips', value: 'subtract' },
        { text: 'Set Chips', value: 'set' }
      ],
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success'
    };
  },
  
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.itemsPerPage);
    },
    paginationText() {
      const start = (this.page - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.page * this.itemsPerPage, this.total);
      return `${start}-${end} of ${this.total}`;
    }
  },
  
  mounted() {
    this.getUsers();
  },
  
  methods: {
    async getUsers() {
      this.loading = true;
      try {
        const response = await api.get('/users', {
          params: {
            page: this.page,
            limit: this.itemsPerPage,
            search: this.search
          }
        });
        
        console.log('Users API response:', response.data);
        this.users = response.data.users || [];
        this.total = response.data.total || 0;
      } catch (error) {
        console.error('Error fetching users:', error);
        this.showSnackbar('Error fetching users', 'error');
      } finally {
        this.loading = false;
      }
    },
    
    searchUsers() {
      // Debounce search to avoid too many API calls
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.page = 1; // Reset to first page on new search
        this.getUsers();
      }, 500);
    },
    
    clearSearch() {
      this.search = '';
      this.page = 1;
      this.getUsers();
    },
    
    nextPage() {
      if (this.page < this.totalPages) {
        this.page++;
        this.getUsers();
      }
    },
    
    previousPage() {
      if (this.page > 1) {
        this.page--;
        this.getUsers();
      }
    },
    
    viewUser(user) {
      this.$router.push({ name: 'UserDetail', params: { id: user.id } });
    },
    
    editBalance(user) {
      this.selectedUser = user;
      this.balanceOperation = 'add';
      this.balanceAmount = 0;
      this.balanceDialog = true;
    },
    
    async updateBalance() {
      try {
        const response = await api.put(`/users/${this.selectedUser.id}/balance`, {
          operation: this.balanceOperation,
          amount: this.balanceAmount
        });
        
        // Update the user in the list
        const index = this.users.findIndex(u => u.id === this.selectedUser.id);
        if (index !== -1) {
          this.users[index].balance = response.data.currentBalance;
        }
        
        this.balanceDialog = false;
        this.showSnackbar('User balance updated successfully', 'success');
      } catch (error) {
        console.error('Error updating balance:', error);
        this.showSnackbar('Error updating balance', 'error');
      }
    },
    
    formatNumber(num) {
      return new Intl.NumberFormat().format(num || 0);
    },
    
    showSnackbar(text, color = 'success') {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.snackbar = true;
    }
  }
};
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
</style>
