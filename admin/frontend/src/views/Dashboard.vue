<!-- admin/frontend/src/views/Dashboard.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-6">Dashboard</h1>
    
    <v-row>
      <!-- Stats Cards -->
      <v-col cols="12" md="3">
        <v-card color="primary" theme="dark">
          <v-card-text>
            <div class="text-h6">Total Users</div>
            <div class="text-h4">{{ stats.userStats.total_users || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card color="secondary" theme="dark">
          <v-card-text>
            <div class="text-h6">Active Users</div>
            <div class="text-h4">{{ stats.userStats.active_users || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card color="info" theme="dark">
          <v-card-text>
            <div class="text-h6">New Users Today</div>
            <div class="text-h4">{{ stats.userStats.new_users_today || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card color="success" theme="dark">
          <v-card-text>
            <div class="text-h6">Logins Today</div>
            <div class="text-h4">{{ stats.userStats.logins_today || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="mt-6">
      <!-- Recent Activity -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Recent Logins</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Login Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="login in activities.recentLogins" :key="login.id">
                  <td>
                    <router-link :to="`/users/${login.id}`">
                      {{ login.display_name || login.username }}
                    </router-link>
                  </td>
                  <td>{{ formatDate(login.last_login) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Recent Transactions</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in activities.recentTransactions" :key="tx.id">
                  <td>
                    <router-link :to="`/users/${tx.user_id}`">
                      {{ tx.display_name || tx.username }}
                    </router-link>
                  </td>
                  <td>{{ tx.amount }}</td>
                  <td>
                    <v-chip
                      :color="tx.type === 'add' ? 'success' : 'error'"
                      size="small"
                    >
                      {{ tx.type }}
                    </v-chip>
                  </td>
                  <td>{{ formatDate(tx.created_at) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>New Registrations</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Display Name</th>
                  <th>Registration Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in activities.newUsers" :key="user.id">
                  <td>
                    <router-link :to="`/users/${user.id}`">
                      {{ user.username }}
                    </router-link>
                  </td>
                  <td>{{ user.display_name || '-' }}</td>
                  <td>{{ formatDate(user.created_at) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const stats = ref({
  userStats: {},
  balanceStats: {},
  transactionStats: {}
})

const activities = ref({
  recentLogins: [],
  recentTransactions: [],
  newUsers: []
})

onMounted(async () => {
  try {
    const [statsRes, activitiesRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/activities')
    ])
    
    stats.value = statsRes.data
    activities.value = activitiesRes.data
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>
