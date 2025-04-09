<template>
  <div class="pa-4">
    <h2 class="text-h5 mb-4">CRM Analytics</h2>
    
    <v-data-table
      :headers="headers"
      :items="stats"
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
      
      <template v-slot:item.read_rate="{ item }">
        <span>{{ calculateRate(item.read_count, item.total_users) }}%</span>
      </template>
      
      <template v-slot:item.completion_rate="{ item }">
        <span v-if="item.message_type === 'TASK'">
          {{ calculateRate(item.completed_count, item.read_count) }}%
        </span>
        <span v-else>N/A</span>
      </template>
      
      <template v-slot:item.claim_rate="{ item }">
        <span v-if="item.message_type === 'REWARD' || item.message_type === 'TASK'">
          {{ calculateRate(item.claimed_count, item.read_count) }}%
        </span>
        <span v-else>N/A</span>
      </template>
    </v-data-table>
    
    <div class="mt-6">
      <h3 class="text-h6 mb-4">Message Performance Chart</h3>
      <v-card class="pa-4" v-if="!loading && stats.length > 0">
        <Bar :data="chartData" :options="chartOptions" />
      </v-card>
      <v-card class="pa-4 text-center" v-else-if="!loading">
        <p>No analytics data available.</p>
      </v-card>
      <v-card class="pa-4 text-center" v-else>
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="mt-2">Loading chart data...</p>
      </v-card>
    </div>
  </div>
</template>

<script>
import apiService from '@/services/api';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default {
  name: 'AnalyticsTab',
  components: {
    Bar
  },
  data() {
    return {
      stats: [],
      loading: true,
      headers: [
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Title', key: 'title', sortable: true },
        { title: 'Type', key: 'message_type', sortable: true },
        { title: 'Recipients', key: 'total_users', sortable: true },
        { title: 'Read Rate', key: 'read_rate', sortable: false },
        { title: 'Completion Rate', key: 'completion_rate', sortable: false },
        { title: 'Claim Rate', key: 'claim_rate', sortable: false }
      ],
      chartData: {
        labels: [],
        datasets: []
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Percentage (%)'
            }
          }
        }
      }
    }
  },
  mounted() {
    this.fetchAnalytics();
  },
  methods: {
    async fetchAnalytics() {
      this.loading = true;
      try {
        const response = await apiService.get('/api/crm/admin/analytics');
        this.stats = response.data.stats;
        this.prepareChartData();
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        this.$toast.error('Failed to load analytics: ' + (error.response?.data?.error || error.message));
      } finally {
        this.loading = false;
      }
    },
    prepareChartData() {
      if (!this.stats || this.stats.length === 0) return;
      
      // Take only the first 10 messages for the chart
      const chartMessages = this.stats.slice(0, 10);
      
      this.chartData = {
        labels: chartMessages.map(item => item.title.substring(0, 15) + (item.title.length > 15 ? '...' : '')),
        datasets: [
          {
            label: 'Read Rate',
            backgroundColor: 'rgba(71, 183, 132, 0.5)',
            borderColor: 'rgb(71, 183, 132)',
            borderWidth: 1,
            data: chartMessages.map(item => this.calculateRate(item.read_count, item.total_users))
          },
          {
            label: 'Completion Rate',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderColor: 'rgb(153, 102, 255)',
            borderWidth: 1,
            data: chartMessages.map(item => 
              item.message_type === 'TASK' 
                ? this.calculateRate(item.completed_count, item.read_count) 
                : 0
            )
          },
          {
            label: 'Claim Rate',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1,
            data: chartMessages.map(item => 
              (item.message_type === 'REWARD' || item.message_type === 'TASK')
                ? this.calculateRate(item.claimed_count, item.read_count) 
                : 0
            )
          }
        ]
      };
    },
    calculateRate(numerator, denominator) {
      if (!denominator || denominator === 0) return 0;
      return Math.round((numerator / denominator) * 100);
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
