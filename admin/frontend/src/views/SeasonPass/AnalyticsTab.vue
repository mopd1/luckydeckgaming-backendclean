<template>
  <div>
    <div class="mb-4">
      <v-card class="mb-4">
        <v-card-text>
          <div class="d-flex align-center">
            <v-select
              v-model="selectedSeasonId"
              :items="seasons"
              item-title="name"
              item-value="season_id"
              label="Select Season"
              variant="outlined"
              density="comfortable"
              :loading="loading"
              @update:model-value="fetchAnalytics"
            ></v-select>
          </div>
        </v-card-text>
      </v-card>
      
      <v-alert v-if="!selectedSeasonId" type="info" border="start" class="mb-4">
        Please select a season to view analytics
      </v-alert>
    </div>
    
    <v-row v-if="analytics && selectedSeasonId">
      <v-col cols="12" md="3">
        <v-card class="rounded-lg">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold text-primary">
              {{ analytics.users_with_progress }}
            </div>
            <div class="text-subtitle-1 text-grey-darken-1">
              Active Users
            </div>
            <div class="text-caption text-grey">
              Of {{ analytics.total_users }} total users
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card class="rounded-lg">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold text-primary">
              {{ analytics.users_with_inside_track }}
            </div>
            <div class="text-subtitle-1 text-grey-darken-1">
              Inside Track Users
            </div>
            <div class="text-caption text-grey">
              {{ (analytics.conversion_rate || 0).toFixed(1) }}% conversion rate
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card class="rounded-lg">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold text-primary">
              {{ (analytics.avg_milestones_completed || 0).toFixed(1) }}
            </div>
            <div class="text-subtitle-1 text-grey-darken-1">
              Avg. Milestones Completed
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card class="rounded-lg">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold text-primary">
              {{ analytics.milestone_completion?.length || 0 }}
            </div>
            <div class="text-subtitle-1 text-grey-darken-1">
              Milestones Reached
            </div>
            <div class="text-caption text-grey">
              By at least one user
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <!-- Milestone Completion Chart -->
      <v-col cols="12">
        <v-card>
          <v-card-title>Milestone Completion</v-card-title>
          <v-card-text>
            <v-progress-linear
              v-for="milestone in analytics.milestone_completion"
              :key="milestone.milestone"
              :model-value="(milestone.count / analytics.users_with_progress) * 100"
              color="primary"
              height="25"
              rounded
              class="mb-3"
            >
              <template v-slot:default="{ value }">
                <strong>Milestone {{ milestone.milestone }}: {{ milestone.count }} users ({{ value.toFixed(1) }}%)</strong>
              </template>
            </v-progress-linear>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-skeleton-loader
      v-else-if="loading && selectedSeasonId"
      type="card, card-heading, article, card-heading, table"
    ></v-skeleton-loader>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// State variables
const seasons = ref([])
const selectedSeasonId = ref('')
const analytics = ref(null)
const loading = ref(false)

// Load seasons when component mounts
onMounted(async () => {
  await fetchSeasons()
})

// Fetch all seasons
async function fetchSeasons() {
  loading.value = true
  
  try {
    const response = await axios.get('/api/admin/season-pass/seasons')
    seasons.value = response.data
  } catch (error) {
    console.error('Error fetching seasons:', error)
    alert('Failed to load seasons data')
  } finally {
    loading.value = false
  }
}

// Fetch analytics for selected season
async function fetchAnalytics() {
  if (!selectedSeasonId.value) return
  
  loading.value = true
  analytics.value = null
  
  try {
    const response = await axios.get(`/api/admin/season-pass/seasons/${selectedSeasonId.value}/analytics`)
    analytics.value = response.data
  } catch (error) {
    console.error('Error fetching analytics:', error)
    alert('Failed to load analytics data')
  } finally {
    loading.value = false
  }
}
</script>
