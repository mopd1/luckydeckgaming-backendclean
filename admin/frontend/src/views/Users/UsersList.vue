<template>
  <v-container>
    <v-card>
      <v-card-title>
        User Management
        <v-spacer></v-spacer>
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          @keyup.enter="getUsers"
        ></v-text-field>
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="users"
        :loading="loading"
        :server-items-length="total"
        :items-per-page="itemsPerPage"
        :page.sync="page"
        @update:items-per-page="changeItemsPerPage"
        class="elevation-1"
      >
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'green' : 'red'" dark>
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>
        
        <template v-slot:item.account_locked="{ item }">
          <v-chip v-if="item.account_locked" color="red" dark>Locked</v-chip>
          <span v-else>-</span>
        </template>
        
        <template v-slot:item.balance="{ item }">
          {{ formatNumber(item.balance) }}
        </template>
        
        <template v-slot:item.actions="{ item }">
          <v-btn
            small
            icon
            color="primary"
            @click="viewUser(item)"
          >
            <v-icon>mdi-eye</v-icon>
          </v-btn>
          <v-btn
            small
            icon
            color="success"
            @click="editBalance(item)"
          >
            <v-icon>mdi-currency-usd</v-icon>
          </v-btn>
        </template>
      </v-data-table>
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
  </v-container>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'UsersList',
  data() {
    return {
      users: [],
      loading: false,
      total: 0,
      page: 1,
      itemsPerPage: 10,
      search: '',
      headers: [
        { text: 'ID', value: 'id', width: '5%' },
        { text: 'Username', value: 'username', width: '15%' },
        { text: 'Email', value: 'email', width: '20%' },
        { text: 'Display Name', value: 'display_name', width: '15%' },
        { text: 'Balance', value: 'balance', width: '10%' },
        { text: 'Status', value: 'is_active', width: '8%' },
        { text: 'Locked', value: 'account_locked', width: '8%' },
        { text: 'Actions', value: 'actions', sortable: false, width: '10%' }
      ],
      balanceDialog: false,
      selectedUser: {},
      balanceOperation: 'add',
      balanceAmount: 0,
      operations: [
        { text: 'Add Chips', value: 'add' },
        { text: 'Subtract Chips', value: 'subtract' },
        { text: 'Set Chips', value: 'set' }
      ]
    };
  },
  
  mounted() {
    this.getUsers();
  },
  
  watch: {
    page() {
      this.getUsers();
    }
  },
  
  methods: {
    async getUsers() {
      this.loading = true;
      try {
        const response = await api.get('/api/users', {
          params: {
            page: this.page,
            limit: this.itemsPerPage,
            search: this.search
          }
        });
        
        this.users = response.data.users;
        this.total = response.data.total;
      } catch (error) {
        console.error('Error fetching users:', error);
        // Show error notification
      } finally {
        this.loading = false;
      }
    },
    
    changeItemsPerPage(value) {
      this.itemsPerPage = value;
      this.getUsers();
    },
    
    viewUser(user) {
      this.$router.push({ name: 'UserDetails', params: { id: user.id } });
    },
    
    editBalance(user) {
      this.selectedUser = user;
      this.balanceOperation = 'add';
      this.balanceAmount = 0;
      this.balanceDialog = true;
    },
    
    async updateBalance() {
      try {
        const response = await api.put(`/api/users/${this.selectedUser.id}/balance`, {
          operation: this.balanceOperation,
          amount: this.balanceAmount
        });
        
        // Update the user in the list
        const index = this.users.findIndex(u => u.id === this.selectedUser.id);
        if (index !== -1) {
          this.users[index].balance = response.data.currentBalance;
        }
        
        this.balanceDialog = false;
        // Show success notification
      } catch (error) {
        console.error('Error updating balance:', error);
        // Show error notification
      }
    },
    
    formatNumber(num) {
      return new Intl.NumberFormat().format(num || 0);
    }
  }
};
</script>
