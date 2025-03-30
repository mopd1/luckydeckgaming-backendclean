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

    <v-dialog v-model="dialog" max-width="600px" persistent>
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
              variant="outlined"
              density="compact"
            ></v-text-field>

            <v-textarea
              v-model="editedSeason.description"
              label="Description"
              rows="3"
              variant="outlined"
              density="compact"
            ></v-textarea>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  :value="formattedStartDate"
                  label="Start Date"
                  prepend-icon="mdi-calendar"
                  readonly
                  @click="openStartDatePicker"
                  :rules="[v => !!editedSeason.start_date || 'Start date is required']"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  :value="formattedEndDate"
                  label="End Date"
                  prepend-icon="mdi-calendar"
                  readonly
                  @click="openEndDatePicker"
                  :rules="[
                    v => !!editedSeason.end_date || 'End date is required',
                    v => !editedSeason.start_date || !editedSeason.end_date || new Date(editedSeason.end_date) >= new Date(editedSeason.start_date) || 'End date must be after start date'
                  ]"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-switch
              v-model="editedSeason.is_active"
              color="primary"
              label="Active Season"
              hint="Only one season can be active at a time"
              persistent-hint
              density="compact"
              inset
            ></v-switch>
          </v-form>

          <v-dialog ref="startDateDialogRef" v-model="startDateDialog" width="auto">
              <v-date-picker
                  v-model="tempPickerStartDate"
                  show-adjacent-months
                  hide-header
              >
                  <template v-slot:actions>
                      <v-spacer></v-spacer>
                      <v-btn text color="grey" @click.stop="cancelStartDate">Cancel</v-btn>
                      <v-btn text color="primary" @click.stop="confirmStartDate">OK</v-btn>
                  </template>
              </v-date-picker>
          </v-dialog>

          <v-dialog ref="endDateDialogRef" v-model="endDateDialog" width="auto">
               <v-date-picker
                  v-model="tempPickerEndDate"
                  :min="editedSeason.start_date ? editedSeason.start_date.toISOString().split('T')[0] : undefined"
                  show-adjacent-months
                  hide-header
              >
                  <template v-slot:actions>
                      <v-spacer></v-spacer>
                      <v-btn text color="grey" @click.stop="cancelEndDate">Cancel</v-btn>
                      <v-btn text color="primary" @click.stop="confirmEndDate">OK</v-btn>
                  </template>
              </v-date-picker>
          </v-dialog>

        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="elevated" @click="saveSeason" :disabled="!valid">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h5">Confirm</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="red-darken-1" variant="text" @click="executeConfirmAction">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue' // Removed reactive
import axios from '../../services/api'

// State variables
const seasons = ref([])
const loading = ref(true)
const dialog = ref(false)
const startDateDialog = ref(false)
const endDateDialog = ref(false)
const confirmDialog = ref(false)
const confirmMessage = ref('')
const confirmActionCallback = ref(() => {})
const valid = ref(false)
const form = ref(null)
const isEditing = ref(false)

const tempPickerStartDate = ref(null);
const tempPickerEndDate = ref(null);
const tempStartDate = ref(null);
const tempEndDate = ref(null);

const defaultSeason = {
  season_id: null,
  name: '',
  description: '',
  start_date: new Date(),
  end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  is_active: false
}

// Use ref for the edited object
const editedSeason = ref({...defaultSeason})

const headers = [
  { title: 'Season ID', key: 'season_id', sortable: true, width: '10%' },
  { title: 'Name', key: 'name', sortable: true, width: '25%' },
  { title: 'Start Date', key: 'start_date', sortable: true, width: '15%' },
  { title: 'End Date', key: 'end_date', sortable: true, width: '15%' },
  { title: 'Status', key: 'is_active', sortable: true, width: '10%' },
  { title: 'Actions', key: 'actions', sortable: false, width: '25%', align: 'end' }
]

// --- Lifecycle ---
onMounted(async () => {
  await fetchSeasons()
})

// --- Computed Properties for Display ---
const formattedStartDate = computed(() => {
  // Access .value because editedSeason is a ref
  return formatDate(editedSeason.value.start_date);
});

const formattedEndDate = computed(() => {
   // Access .value because editedSeason is a ref
  return formatDate(editedSeason.value.end_date);
});

// --- Watchers ---
watch(() => editedSeason.value.start_date, (newDate, oldDate) => {
  if (newDate?.getTime() !== oldDate?.getTime()) {
      nextTick(() => {
        form.value?.validate();
      });
  }
});
watch(() => editedSeason.value.end_date, (newDate, oldDate) => {
  if (newDate?.getTime() !== oldDate?.getTime()) {
      nextTick(() => {
        form.value?.validate();
      });
  }
});


// --- Methods ---

async function fetchSeasons() {
  loading.value = true
  try {
    const response = await axios.get('/admin/season-pass/seasons')
    seasons.value = response.data.map(season => ({
      ...season,
      start_date: season.start_date ? new Date(season.start_date) : null,
      end_date: season.end_date ? new Date(season.end_date) : null,
    }));
  } catch (error) {
    console.error('Error fetching seasons:', error)
    alert('Failed to load seasons data')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  console.log("Opening create dialog...");
  isEditing.value = false;
  // Assign to .value when using ref
  editedSeason.value = {
    season_id: null,
    name: '',
    description: '',
    start_date: new Date(),
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    is_active: false
  };
  nextTick(() => {
      form.value?.resetValidation();
      valid.value = false;
  });
  dialog.value = true;
}

function editSeason(season) {
  console.log("Opening edit dialog for season:", season.season_id);
  isEditing.value = true;
   // Assign to .value when using ref
  editedSeason.value = {
    ...season,
    start_date: season.start_date instanceof Date ? season.start_date : (season.start_date ? new Date(season.start_date) : null),
    end_date: season.end_date instanceof Date ? season.end_date : (season.end_date ? new Date(season.end_date) : null),
  };
   nextTick(() => {
      form.value?.resetValidation();
      valid.value = false;
  });
  dialog.value = true;
}

function closeDialog() {
    dialog.value = false;
}

// --- Date Picker Handling ---
function openStartDatePicker() {
    console.log("Opening start date picker. Current start date:", editedSeason.value.start_date);
    tempStartDate.value = editedSeason.value.start_date ? new Date(editedSeason.value.start_date.getTime()) : null;
    tempPickerStartDate.value = editedSeason.value.start_date ? new Date(editedSeason.value.start_date.getTime()) : new Date();
    startDateDialog.value = true;
}

function openEndDatePicker() {
    console.log("Opening end date picker. Current end date:", editedSeason.value.end_date);
    tempEndDate.value = editedSeason.value.end_date ? new Date(editedSeason.value.end_date.getTime()) : null;
    tempPickerEndDate.value = editedSeason.value.end_date ? new Date(editedSeason.value.end_date.getTime()) : new Date();
    endDateDialog.value = true;
}

function confirmStartDate() {
    editedSeason.value.start_date = tempPickerStartDate.value; // Update .value
    console.log("Confirmed start date, setting editedSeason.start_date to:", editedSeason.value.start_date);
    startDateDialog.value = false;
    nextTick(() => form.value?.validate());
}

function cancelStartDate() {
    console.log("Cancelled start date picker.");
    // No need to update editedSeason on cancel
    startDateDialog.value = false;
}

function confirmEndDate() {
    editedSeason.value.end_date = tempPickerEndDate.value; // Update .value
    console.log("Confirmed end date, setting editedSeason.end_date to:", editedSeason.value.end_date);
    endDateDialog.value = false;
    nextTick(() => form.value?.validate());
}

function cancelEndDate() {
    console.log("Cancelled end date picker.");
    // No need to update editedSeason on cancel
    endDateDialog.value = false;
}

// Save season (create or update)
async function saveSeason() {
  const { valid: formIsValid } = await form.value.validate();
  if (!formIsValid) {
      console.warn("Form validation failed.");
      return;
  }

  loading.value = true

  // *** USE LOCAL TIME FOR API PAYLOAD ***
  const formatDateForAPI = (date) => {
      if (date instanceof Date && !isNaN(date)) {
          const year = date.getFullYear(); // Use local year
          const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Use local month
          const day = date.getDate().toString().padStart(2, '0'); // Use local day
          return `${year}-${month}-${day}`;
      }
      return null;
  };

  // Create data object from editedSeason.value
  const seasonData = {
    name: editedSeason.value.name,
    description: editedSeason.value.description,
    start_date: formatDateForAPI(editedSeason.value.start_date),
    end_date: formatDateForAPI(editedSeason.value.end_date),
    is_active: editedSeason.value.is_active
  };

  console.log("Attempting to save season. Payload being sent:", JSON.stringify(seasonData, null, 2));

  try {
    if (isEditing.value && editedSeason.value.season_id) {
      console.log(`Sending PUT request to /admin/season-pass/seasons/${editedSeason.value.season_id}`);
      await axios.put(`/admin/season-pass/seasons/${editedSeason.value.season_id}`, seasonData);
    } else {
      console.log("Sending POST request to /admin/season-pass/seasons");
      await axios.post('/admin/season-pass/seasons', seasonData);
    }

    await fetchSeasons()
    closeDialog();
  } catch (error) {
     console.error('Error saving season:', error);
     if (error.response) {
         console.error("Backend Response Error Data:", error.response.data);
     }
     const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save season';
     alert(`Error: ${errorMsg}`);
  } finally {
    loading.value = false
  }
}

// --- Activation Toggle ---
function toggleActive(season) {
  const seasonToUpdate = seasons.value.find(s => s.season_id === season.season_id);
  if (!seasonToUpdate) return;

  confirmMessage.value = seasonToUpdate.is_active
    ? `Are you sure you want to deactivate the "${seasonToUpdate.name}" season? This cannot be undone easily.`
    : `Are you sure you want to activate the "${seasonToUpdate.name}" season? Any other active season will be deactivated.`;

  confirmActionCallback.value = async () => {
    confirmDialog.value = false;
    loading.value = true;
    try {
      await axios.put(`/admin/season-pass/seasons/${seasonToUpdate.season_id}/toggle-active`);
      await fetchSeasons();
    } catch (error) {
      console.error('Error toggling season status:', error);
       if (error.response) {
           console.error("Backend Response Error Data:", error.response.data);
       }
      alert('Failed to update season status. ' + (error.response?.data?.message || ''));
      await fetchSeasons();
    } finally {
      loading.value = false;
    }
  };

  confirmDialog.value = true;
}

function executeConfirmAction() {
  if (typeof confirmActionCallback.value === 'function') {
    confirmActionCallback.value();
  }
}

// --- Navigation ---
function viewMilestones(season) {
  localStorage.setItem('selectedSeasonId', season.season_id);
  const event = new CustomEvent('change-tab', { detail: 'milestones' });
  window.dispatchEvent(event);
}

// --- Formatting ---
function formatDate(dateValue) {
  // Display formatting (remains unchanged)
  if (!dateValue) return '';
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}
</script>

<style scoped>
.v-data-table {
  margin-bottom: 1rem;
}
.v-dialog .v-card-text {
    padding: 16px 24px;
}
.v-dialog .v-card-actions {
    padding: 16px 24px;
}
</style>
