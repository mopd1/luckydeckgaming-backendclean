<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-btn color="primary" text @click="$router.go(-1)">
          <v-icon left>mdi-arrow-left</v-icon> Back to Users
        </v-btn>
      </v-col>
    </v-row>
    
    <v-card v-if="user" class="mt-4">
      <v-card-title>
        User Details
        <v-spacer></v-spacer>
        <v-btn v-if="editMode" color="primary" @click="saveUser">
          <v-icon left>mdi-content-save</v-icon>
          Save
        </v-btn>
        <v-btn v-else color="primary" @click="editMode = true">
          <v-icon left>mdi-pencil</v-icon>
          Edit
        </v-btn>
      </v-card-title>
      
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-title>Basic Information</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Username"
                      v-model="user.username"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Email"
                      v-model="user.email"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Display Name"
                      v-model="user.display_name"
                      :readonly="!editMode"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="First Name"
                      v-model="user.first_name"
                      :readonly="!editMode"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Surname"
                      v-model="user.surname"
                      :readonly="!editMode"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Nickname"
                      v-model="user.nickname"
                      :readonly="!editMode"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-title>Account Status</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-switch
                      v-model="user.is_active"
                      label="Account Active"
                      :disabled="!editMode"
                      color="success"
                    ></v-switch>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-switch
                      v-model="user.account_locked"
                      label="Account Locked"
                      :disabled="!editMode"
                      color="error"
                    ></v-switch>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Failed Login Attempts"
                      v-model="user.failed_login_attempts"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Last Login"
                      :value="formatDate(user.last_login)"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
            
            <v-card outlined class="mt-4">
              <v-card-title>
                Currency
                <v-spacer></v-spacer>
                <v-btn small color="success" @click="showBalanceDialog = true">
                  <v-icon left>mdi-currency-usd</v-icon>
                  Edit Balance
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Chips Balance"
                      :value="formatNumber(user.balance)"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      label="Gems"
                      :value="formatNumber(user.gems)"
                      readonly
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
    
    <v-skeleton-loader
      v-else
      type="card, list-item-three-line, actions"
      class="mt-4"
    ></v-skeleton-loader>
    
    <!-- Balance Edit Dialog -->
    <v-dialog v-model="showBalanceDialog" max-width="500px">
      <v-card>
        <v-card-title>Edit User Balance</v-card-title>
        <v-card-text>
          <v-tabs v-model="balanceTab">
            <v-tab>Chips</v-tab>
            <v-tab>Gems</v-tab>
          </v-tabs>
          <v-tabs-items v-model="balanceTab">
            <v-tab-item>
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <p><strong>Current Chips:</strong> {{ formatNumber(user.balance) }}</p>
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
            </v-tab-item>
            <v-tab-item>
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <p><strong>Current Gems:</strong> {{ formatNumber(user.gems) }}</p>
                  </v-col>
                  <v-col cols="12">
                    <v-select
                      v-model="gemsOperation"
                      label="Operation"
                      :items="operations"
                      outlined
                    ></v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model.number="gemsAmount"
                      label="Amount"
                      type="number"
                      outlined
                      min="0"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-tab-item>
          </v-tabs-items>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showBalanceDialog = false">Cancel</v-btn>
          <v-btn color="primary" text @click="updateCurrency">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'UserDetails',
  data() {
    return {
      user: null,
      editMode: false,
      loading: false,
      showBalanceDialog: false,
      balanceTab: 0,
      balanceOperation: 'add',
      balanceAmount: 0,
      gemsOperation: 'add',
      gemsAmount: 0,
      operations: [
        { text: 'Add', value: 'add' },
        { text: 'Subtract', value: 'subtract' },
        { text: 'Set Exact Value', value: 'set' }
      ]
    };
  },
  
  mounted() {
    this.getUserDetails();
  },
  
  methods: {
    async getUserDetails() {
      this.loading = true;
      try {
        const userId = this.$route.params.id;
        const response = await api.get(`/api/users/${userId}`);
        this.user = response.data;
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async saveUser() {
      try {
        const userId = this.$route.params.id;
        const response = await api.put(`/api/users/${userId}`, {
          display_name: this.user.display_name,
          first_name: this.user.first_name,
          surname: this.user.surname,
          nickname: this.user.nickname,
          is_active: this.user.is_active,
          account_locked: this.user.account_locked
        });
        
        this.editMode = false;
        // Show success notification
      } catch (error) {
        console.error('Error updating user:', error);
        // Show error notification
      }
    },
    
    async updateCurrency() {
      try {
        const userId = this.$route.params.id;
        
        if (this.balanceTab === 0) {
          // Update chips balance
          const response = await api.put(`/api/users/${userId}/balance`, {
            operation: this.balanceOperation,
            amount: this.balanceAmount
          });
          this.user.balance = response.data.currentBalance;
        } else {
          // Update gems
          const response = await api.put(`/api/users/${userId}/gems`, {
            operation: this.gemsOperation,
            amount: this.gemsAmount
          });
          this.user.gems = response.data.currentGems;
        }
        
        this.showBalanceDialog = false;
        // Show success notification
      } catch (error) {
        console.error('Error updating currency:', error);
        // Show error notification
      }
    },
    
    formatNumber(num) {
      return new Intl.NumberFormat().format(num || 0);
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Never';
      
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
  }
};
</script>
