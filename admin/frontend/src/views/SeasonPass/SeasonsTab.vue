<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">Season List</h2>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        Create Season
      </v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="seasons"
        :loading="loading"
        class="elevation-1"
      >
        <template v-slot:item.start_date="{ item }">
          {{ formatDate(item.start_date) }}
        </template>

        <template v-slot:item.end_date="{ item }">
          {{ formatDate(item.end_date) }}
        </template>

        <template v-slot:item.is_active="{ item }">
          <v-chip
            :color="item.is_active ? 'success' : 'error'"
            text-color="white"
            size="small"
          >
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon
            variant="text"
            color="primary"
            size="small"
            @click="editSeason(item)"
          >
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn
            icon
            variant="text"
            color="primary"
            size="small"
            @click="viewMilestones(item)"
          >
            <v-icon>mdi-chart-timeline-variant</v-icon>
            <v-tooltip activator="parent" location="top">View Milestones</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            :color="item.is_active ? 'error' : 'success'"
            size="small"
            @click="toggleActive(item)"
          >
            <v-icon>{{ item.is_active ? 'mdi-close' : 'mdi-check' }}</v-icon>
            <v-tooltip activator="parent" location="top">
              {{ item.is_active ? 'Deactivate' : 'Activate' }}
            </v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Season Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ isEditing ? 'Edit Season' : 'Create New Season' }}</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
              v-model="editedSeason.name"
              label="Season Name"
              required
              :rules="[v => !!v || 'Name is required']"
            ></v-text-field>

            <v-textarea
              v-model="editedSeason.description"
              label="Description"
              rows="3"
            ></v-textarea>

            <v-row>
              <v-col cols="12" sm="6">
                <v-dialog
                  ref="startDateDialog"
                  v-model="startDateDialog"
                  width="290px"
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      :value="formatDate(editedSeason.start_date)"
                      label="Start Date"
                      prepend-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      :rules="[v => !!editedSeason.start_date || 'Start date is required']"
                    ></v-text-field>
                  </template>
                  <v-date-picker v-model="editedSeason.start_date">
                    <template v-slot:actions>
                      <v-spacer></v-spacer>
                      <v-btn text color="grey" @click="startDateDialog = false">Cancel</v-btn>
                      <v-btn text color="primary" @click="startDateSelected">OK</v-btn>
                    </template>
                  </v-date-picker>
                </v-dialog>
              </v-col>

              <v-col cols="12" sm="6">
                <v-dialog
                  ref="endDateDialog"
                  v-model="endDateDialog"
                  width="290px"
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      :value="formatDate(editedSeason.end_date)"
                      label="End Date"
                      prepend-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      :rules="[v => !!editedSeason.end_date || 'End date is required']"
                    ></v-text-field>
                  </template>
                  <v-date-picker v-model="editedSeason.end_date">
                    <template v-slot:actions>
                      <v-spacer></v-spacer>
                      <v-btn text color="grey" @click="endDateDialog = false">Cancel</v-btn>
                      <v-btn text color="primary" @click="endDateSelected">OK</v-btn>
                    </template>
                  </v-date-picker>
                </v-dialog>
              </v-col>
            </v-row>

            <v-switch
              v-model="editedSeason.is_active"
              color="primary"
              label="Active Season"
              hint="Only one season can be active at a time"
              persistent-hint
            ></v-switch>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="saveSeason" :disabled="!valid">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h5">Confirm</v-card-title>

        <v-card-text>
          {{ confirmMessage }}
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="red-darken-1" variant="text" @click="confirmAction">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
// Import the configured API service instead of axios directly
import axios from '../../services/api'

// Data table headers
const headers = [
  { title: 'Season ID', key: 'season_id', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Start Date', key: 'start_date', sortable: true },
  { title: 'End Date', key: 'end_date', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// State variables
const seasons = ref([])
const loading = ref(true)
const dialog = ref(false)
const startDateDialog = ref(false)
const endDateDialog = ref(false)
const confirmDialog = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(() => {})
const valid = ref(false)
const form = ref(null)
const isEditing = ref(false)

// Default empty season
const defaultSeason = {
  name: '',
  description: '',
  start_date: new Date(),
  end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  is_active: true
}

// Edited season (for the form)
const editedSeason = reactive({...defaultSeason})

// Fetch seasons when component mounts
onMounted(async () => {
  await fetchSeasons()
})

// Handle date selection
function startDateSelected() {
  console.log("Selected start date:", editedSeason.start_date);
  startDateDialog.value = false;
}

function endDateSelected() {
  console.log("Selected end date:", editedSeason.end_date);
  endDateDialog.value = false;
}

// Fetch season data from API
async function fetchSeasons() {
  loading.value = true

  try {
    const response = await axios.get('/admin/season-pass/seasons')
    seasons.value = response.data
  } catch (error) {
    console.error('Error fetching seasons:', error)
    alert('Failed to load seasons data')
  } finally {
    loading.value = false
  }
}

// Open dialog to create new season
function openCreateDialog() {
  isEditing.value = false
  Object.assign(editedSeason, defaultSeason)
  dialog.value = true
}

// Open dialog to edit existing season
function editSeason(season) {
  isEditing.value = true
  Object.assign(editedSeason, season)
  ensureDateObjects()
  dialog.value = true
}

// Ensure dates are Date objects
function ensureDateObjects() {
  if (typeof editedSeason.start_date === 'string') {
    editedSeason.start_date = new Date(editedSeason.start_date);
  }
  if (typeof editedSeason.end_date === 'string') {
    editedSeason.end_date = new Date(editedSeason.end_date);
  }
}

// Save season (create or update)
async function saveSeason() {
  if (!valid.value) return

  loading.value = true

  // Create a copy of the season data with properly formatted dates for API
  const seasonData = {
    ...editedSeason,
    start_date: editedSeason.start_date instanceof Date
      ? editedSeason.start_date.toISOString().split('T')[0]
      : editedSeason.start_date,
    end_date: editedSeason.end_date instanceof Date
      ? editedSeason.end_date.toISOString().split('T')[0]
      : editedSeason.end_date
  };

  try {
    if (isEditing.value) {
      await axios.put(`/admin/season-pass/seasons/${editedSeason.season_id}`, seasonData)
    } else {
      await axios.post('/admin/season-pass/seasons', seasonData)
    }

    await fetchSeasons()
    dialog.value = false
  } catch (error) {
    console.error('Error saving season:', error)
    alert('Failed to save season')
  } finally {
    loading.value = false
  }
}

// Toggle active status
function toggleActive(season) {
  confirmMessage.value = season.is_active
    ? `Are you sure you want to deactivate the "${season.name}" season?`
    : `Are you sure you want to activate the "${season.name}" season?`

  confirmAction.value = async () => {
    try {
      await axios.put(`/admin/season-pass/seasons/${season.season_id}`, {
        is_active: !season.is_active
      })

      await fetchSeasons()
      confirmDialog.value = false
    } catch (error) {
      console.error('Error toggling season status:', error)
      alert('Failed to update season status')
    }
  }

  confirmDialog.value = true
}

// Navigate to milestones view for selected season
function viewMilestones(season) {
  // Set the global milestone editing mode
  // Router navigation could happen here, or passing data to parent component
  // For now let's implement a simple approach by changing the active tab
  localStorage.setItem('selectedSeasonId', season.season_id)
  // Emit event to parent to change tab
  const event = new CustomEvent('change-tab', { detail: 'milestones' })
  window.dispatchEvent(event)
}

// Format date for display
function formatDate(dateValue) {
  if (!dateValue) return ''
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
