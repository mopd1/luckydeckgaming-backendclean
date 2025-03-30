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
              @update:model-value="fetchMilestones"
            ></v-select>
            
            <v-spacer></v-spacer>
            
            <v-btn 
              color="primary" 
              prepend-icon="mdi-plus" 
              class="ml-4"
              @click="bulkEditMilestones"
              :disabled="!selectedSeasonId"
            >
              Bulk Edit Milestones
            </v-btn>
            
            <v-btn 
              color="secondary" 
              prepend-icon="mdi-table-edit" 
              class="ml-2"
              @click="openImportDialog"
              :disabled="!selectedSeasonId"
            >
              Import from Sheet
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
      
      <v-alert v-if="!selectedSeasonId" type="info" border="start" class="mb-4">
        Please select a season to manage its milestones
      </v-alert>
    </div>
    
    <v-data-table
      v-if="selectedSeasonId"
      :headers="headers"
      :items="milestones"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.required_points="{ item }">
        {{ item.required_points.toLocaleString() }} AP
      </template>
      
      <template v-slot:item.free_reward="{ item }">
        <RewardDisplay :type="item.free_reward_type" :amount="item.free_reward_amount" />
      </template>
      
      <template v-slot:item.paid_reward="{ item }">
        <RewardDisplay :type="item.paid_reward_type" :amount="item.paid_reward_amount" />
      </template>
      
      <template v-slot:item.actions="{ item }">
        <v-btn 
          icon 
          variant="text" 
          color="primary" 
          size="small"
          @click="editMilestone(item)"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </template>
    </v-data-table>
    
    <!-- Edit Milestone Dialog -->
    <v-dialog v-model="editDialog" max-width="700px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Edit Milestone {{ editedMilestone.milestone_number }}</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.required_points"
                  label="Required Action Points"
                  type="number"
                  min="1"
                  required
                  :rules="[v => !!v || 'Points are required', v => v > 0 || 'Points must be positive']"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-switch
                  v-model="editedMilestone.is_active"
                  color="primary"
                  label="Active"
                ></v-switch>
              </v-col>
            </v-row>
            
            <v-divider class="my-4"></v-divider>
            <h3 class="text-h6 mb-2">Free Track Reward</h3>
            
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editedMilestone.free_reward_type"
                  label="Reward Type"
                  :items="rewardTypes"
                  required
                ></v-select>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.free_reward_amount"
                  label="Reward Amount"
                  type="number"
                  min="0"
                  required
                  :rules="[v => v >= 0 || 'Amount must be non-negative']"
                ></v-text-field>
              </v-col>
            </v-row>
            
            <v-divider class="my-4"></v-divider>
            <h3 class="text-h6 mb-2">Inside Track Reward (Premium)</h3>
            
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editedMilestone.paid_reward_type"
                  label="Reward Type"
                  :items="rewardTypes"
                  required
                ></v-select>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.paid_reward_amount"
                  label="Reward Amount"
                  type="number"
                  min="0"
                  required
                  :rules="[v => v >= 0 || 'Amount must be non-negative']"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="saveMilestone" :disabled="!valid">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Bulk Edit Dialog -->
    <v-dialog v-model="bulkDialog" max-width="900px" scrollable>
      <v-card>
        <v-card-title class="text-h5">Bulk Edit Milestones</v-card-title>
        
        <v-card-text style="max-height: 70vh; overflow-y: auto;">
          <p class="mb-4">Edit all milestones for "{{ selectedSeasonName }}" at once</p>
          
          <div v-for="(milestone, index) in bulkMilestones" :key="index" class="mb-6">
            <v-divider v-if="index > 0" class="mb-4"></v-divider>
            
            <div class="d-flex align-center mb-2">
              <h3 class="text-h6">Milestone {{ milestone.milestone_number }}</h3>
              <v-spacer></v-spacer>
              <v-checkbox v-model="milestone.is_active" label="Active" density="compact" hide-details></v-checkbox>
            </div>
            
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="milestone.required_points"
                  label="Required Points"
                  type="number"
                  min="1"
                  density="compact"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="4">
                <div class="d-flex align-center">
                  <v-select
                    v-model="milestone.free_reward_type"
                    label="Free Reward"
                    :items="rewardTypes"
                    density="compact"
                    variant="outlined"
                    class="mr-2"
                  ></v-select>
                  
                  <v-text-field
                    v-model.number="milestone.free_reward_amount"
                    label="Amount"
                    type="number"
                    min="0"
                    density="compact"
                    variant="outlined"
                    style="max-width: 100px;"
                  ></v-text-field>
                </div>
              </v-col>
              
              <v-col cols="12" sm="4">
                <div class="d-flex align-center">
                  <v-select
                    v-model="milestone.paid_reward_type"
                    label="Premium Reward"
                    :items="rewardTypes"
                    density="compact"
                    variant="outlined"
                    class="mr-2"
                  ></v-select>
                  
                  <v-text-field
                    v-model.number="milestone.paid_reward_amount"
                    label="Amount"
                    type="number"
                    min="0"
                    density="compact"
                    variant="outlined"
                    style="max-width: 100px;"
                  ></v-text-field>
                </div>
              </v-col>
            </v-row>
          </div>
</v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="bulkDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveBulkMilestones">Save All Milestones</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Import Sheet Dialog -->
    <v-dialog v-model="importDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">Import Milestones from Google Sheet</v-card-title>
        
        <v-card-text>
          <p class="mb-4">
            Import milestones data from a Google Sheet. The sheet must have these columns:
            <br>
            <small>Milestone #, Points, Free Type, Free Amount, Premium Type, Premium Amount</small>
          </p>
          
          <v-text-field
            v-model="sheetUrl"
            label="Google Sheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            hint="Sheet must be publicly accessible or published to web"
            persistent-hint
          ></v-text-field>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="importDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="importFromSheet" 
            :loading="importLoading"
            :disabled="!sheetUrl"
          >
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import RewardDisplay from './components/RewardDisplay.vue'

// Data table headers
const headers = [
  { title: 'Milestone #', key: 'milestone_number', sortable: true, align: 'start' },
  { title: 'Required Points', key: 'required_points', sortable: true },
  { title: 'Free Reward', key: 'free_reward', sortable: false },
  { title: 'Inside Track Reward', key: 'paid_reward', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

// Available reward types
const rewardTypes = [
  { title: 'Chips', value: 'chips' },
  { title: 'Gems', value: 'gems' },
  { title: 'Avatar Part', value: 'avatar_part' },
  { title: 'Pack', value: 'pack' }
]

// State variables
const seasons = ref([])
const milestones = ref([])
const selectedSeasonId = ref('')
const loading = ref(false)
const editDialog = ref(false)
const bulkDialog = ref(false)
const importDialog = ref(false)
const importLoading = ref(false)
const sheetUrl = ref('')
const valid = ref(true)
const form = ref(null)

// Compute selected season name for UI display
const selectedSeasonName = computed(() => {
  const found = seasons.value.find(s => s.season_id === selectedSeasonId.value)
  return found ? found.name : ''
})

// Default empty milestone
const defaultMilestone = {
  milestone_number: 0,
  required_points: 0,
  free_reward_type: 'chips',
  free_reward_amount: 0,
  paid_reward_type: 'chips',
  paid_reward_amount: 0,
  is_active: true
}

// Milestone being edited
const editedMilestone = reactive({...defaultMilestone})

// Array for bulk editing
const bulkMilestones = ref([])

// Fetch seasons and listen for season selection changes from other components
onMounted(async () => {
  await fetchSeasons()
  
  // Check if a season was selected in the Seasons tab
  const storedSeasonId = localStorage.getItem('selectedSeasonId')
  if (storedSeasonId) {
    selectedSeasonId.value = storedSeasonId
    await fetchMilestones()
    localStorage.removeItem('selectedSeasonId')
  }
  
  // Listen for tab change events
  window.addEventListener('change-tab', handleTabChange)
})

// Cleanup event listener on component unmount
onUnmounted(() => {
  window.removeEventListener('change-tab', handleTabChange)
})

// Handle tab change event from other components
function handleTabChange(event) {
  if (event.detail === 'milestones') {
    const storedSeasonId = localStorage.getItem('selectedSeasonId')
    if (storedSeasonId) {
      selectedSeasonId.value = storedSeasonId
      fetchMilestones()
      localStorage.removeItem('selectedSeasonId')
    }
  }
}

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

// Fetch milestones for selected season
async function fetchMilestones() {
  if (!selectedSeasonId.value) return
  
  loading.value = true
  
  try {
    const response = await axios.get(`/api/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`)
    milestones.value = response.data
  } catch (error) {
    console.error('Error fetching milestones:', error)
    alert('Failed to load milestones data')
  } finally {
    loading.value = false
  }
}

// Open dialog to edit a single milestone
function editMilestone(milestone) {
  Object.assign(editedMilestone, milestone)
  editDialog.value = true
}

// Save single milestone changes
async function saveMilestone() {
  if (!valid.value) return
  
  loading.value = true
  
  try {
    // We'll update the milestone using the bulk update endpoint
    await axios.post(`/api/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`, {
      milestones: [editedMilestone]
    })
    
    await fetchMilestones()
    editDialog.value = false
  } catch (error) {
    console.error('Error updating milestone:', error)
    alert('Failed to update milestone')
  } finally {
    loading.value = false
  }
}

// Open bulk edit dialog with all milestones
function bulkEditMilestones() {
  // Create a deep copy of the milestones for editing
  bulkMilestones.value = JSON.parse(JSON.stringify(milestones.value))
  
  // Sort by milestone number to ensure consistent ordering
  bulkMilestones.value.sort((a, b) => a.milestone_number - b.milestone_number)
  
  bulkDialog.value = true
}

// Save all milestones in bulk
async function saveBulkMilestones() {
  loading.value = true
  
  try {
    await axios.post(`/api/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`, {
      milestones: bulkMilestones.value
    })
    
    await fetchMilestones()
    bulkDialog.value = false
  } catch (error) {
    console.error('Error updating milestones:', error)
    alert('Failed to update milestones')
  } finally {
    loading.value = false
  }
}

// Open import dialog
function openImportDialog() {
  sheetUrl.value = ''
  importDialog.value = true
}

// Import milestones from Google Sheet
async function importFromSheet() {
  if (!sheetUrl.value) return
  
  importLoading.value = true
  
  try {
    await axios.post('/api/admin/season-pass/import-sheet', {
      season_id: selectedSeasonId.value,
      sheet_url: sheetUrl.value
    })
    
    await fetchMilestones()
    importDialog.value = false
    alert('Milestones imported successfully')
  } catch (error) {
    console.error('Error importing from sheet:', error)
    alert(`Failed to import: ${error.response?.data?.error || 'Unknown error'}`)
  } finally {
    importLoading.value = false
  }
}
</script>
