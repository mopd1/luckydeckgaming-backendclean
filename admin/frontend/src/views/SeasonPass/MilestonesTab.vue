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
              prepend-icon="mdi-cogs"
              class="ml-4"
              @click="bulkEditMilestones"
              :disabled="!selectedSeasonId"
            >
              Configure Milestones
            </v-btn>

            <v-btn
              color="secondary"
              prepend-icon="mdi-table-arrow-down"
              class="ml-2"
              @click="openImportDialog"
              :disabled="!selectedSeasonId"
            >
              Import from Sheet
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Configuration card is part of the main view now, not a separate dialog? -->
      <!-- Removed the separate Apply Config button/card for now, assuming bulk edit handles this -->
      <!-- If you want the generator card, it needs to be integrated differently -->

      <v-alert v-if="!selectedSeasonId" type="info" border="start" class="mb-4">
        Please select a season to view or configure its milestones.
      </v-alert>
    </div>

    <!-- Milestone Table -->
    <v-data-table
      v-if="selectedSeasonId"
      :headers="headers"
      :items="milestones"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.required_points="{ item }">
        {{ item.required_points?.toLocaleString() }} AP
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
          <v-tooltip activator="parent" location="top">Edit Milestone {{ item.milestone_number }}</v-tooltip>
        </v-btn>
      </template>
       <template v-slot:no-data>
         No milestones found for this season. Use "Configure Milestones" or "Import from Sheet" to add some.
       </template>
    </v-data-table>

    <!-- Edit Milestone Dialog -->
    <v-dialog v-model="editDialog" max-width="700px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">Edit Milestone {{ editedMilestone.milestone_number }}</span>
        </v-card-title>

        <v-card-text>
          <!-- Use editedMilestone.property for v-model as it's now a ref -->
          <v-form ref="editForm" v-model="valid">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.required_points"
                  label="Required Action Points"
                  type="number"
                  min="1"
                  required
                  :rules="[v => v !== null && v !== undefined || 'Points are required', v => v > 0 || 'Points must be positive']"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                 <v-checkbox
                    v-model="editedMilestone.is_active"
                    label="Active"
                    density="compact"
                  ></v-checkbox>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>
            <h3 class="text-subtitle-1 mb-2">Free Track Reward</h3>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editedMilestone.free_reward_type"
                  label="Reward Type"
                  :items="rewardTypes"
                  required
                  variant="outlined"
                  density="compact"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.free_reward_amount"
                  label="Reward Amount / ID"
                  type="number"
                  min="0"
                  required
                  :rules="[v => v !== null && v !== undefined || 'Amount/ID is required', v => v >= 0 || 'Amount/ID must be non-negative']"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>
            <h3 class="text-subtitle-1 mb-2">Inside Track Reward (Premium)</h3>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editedMilestone.paid_reward_type"
                  label="Reward Type"
                  :items="rewardTypes"
                  required
                  variant="outlined"
                  density="compact"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedMilestone.paid_reward_amount"
                  label="Reward Amount / ID"
                  type="number"
                  min="0"
                  required
                  :rules="[v => v !== null && v !== undefined || 'Amount/ID is required', v => v >= 0 || 'Amount/ID must be non-negative']"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="elevated" @click="saveMilestone" :disabled="!valid">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk Edit/Configure Dialog -->
    <v-dialog v-model="bulkDialog" max-width="95vw" persistent scrollable>
        <v-card>
          <v-card-title class="text-h5">Configure Milestones for "{{ selectedSeasonName }}"</v-card-title>
          <v-card-subtitle>Define or adjust all milestones for this season.</v-card-subtitle>

          <v-card-text style="max-height: 75vh;">
            <v-container fluid>
              <div v-if="bulkMilestones.length === 0" class="text-center pa-4">
                  No milestones defined yet. Defaults will be generated, or use Import.
              </div>

              <div v-for="(milestone, index) in bulkMilestones" :key="milestone.milestone_number || index" class="milestone-row pa-2 mb-2 elevation-1">
                 <v-row dense align="center">
                    <v-col cols="auto" class="font-weight-bold pl-1"> #{{ milestone.milestone_number }} </v-col>
                    <v-col>
                      <v-text-field
                        v-model.number="milestone.required_points"
                        label="Points"
                        type="number" min="1" density="compact" variant="outlined" hide-details
                       />
                    </v-col>
                    <v-col>
                       <v-select
                          v-model="milestone.free_reward_type"
                          label="Free Type" :items="rewardTypes" density="compact" variant="outlined" hide-details
                        />
                    </v-col>
                     <v-col cols="2">
                       <v-text-field
                          v-model.number="milestone.free_reward_amount"
                          label="Free Amt/ID" type="number" min="0" density="compact" variant="outlined" hide-details
                        />
                    </v-col>
                     <v-col>
                       <v-select
                          v-model="milestone.paid_reward_type"
                          label="Premium Type" :items="rewardTypes" density="compact" variant="outlined" hide-details
                        />
                    </v-col>
                     <v-col cols="2">
                       <v-text-field
                          v-model.number="milestone.paid_reward_amount"
                          label="Premium Amt/ID" type="number" min="0" density="compact" variant="outlined" hide-details
                        />
                    </v-col>
                    <v-col cols="auto">
                       <v-checkbox v-model="milestone.is_active" density="compact" hide-details title="Active"></v-checkbox>
                    </v-col>
                     <v-col cols="auto">
                       <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" @click="removeBulkMilestone(index)" title="Remove Milestone"></v-btn>
                    </v-col>
                 </v-row>
              </div>

              <v-row>
                  <v-col>
                      <v-btn prepend-icon="mdi-plus-box" @click="addBulkMilestone" color="grey" variant="text">Add Milestone Row</v-btn>
                  </v-col>
              </v-row>
           </v-container>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="grey-darken-1" variant="text" @click="bulkDialog = false">Cancel</v-btn>
            <v-btn color="primary" variant="elevated" @click="saveBulkMilestones" :loading="loading">Save Configuration</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    <!-- Import Sheet Dialog -->
    <v-dialog v-model="importDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="text-h5">Import Milestones from Google Sheet</v-card-title>
        <v-card-text>
          <p class="mb-4 text-body-2">
            Import milestones data from a Google Sheet. The sheet must be publicly accessible or published to the web and have these columns starting from row 10:
            <br>
            <v-chip size="small" class="mr-1">Milestone # (Optional)</v-chip>
            <v-chip size="small" class="mr-1">Points</v-chip>
            <v-chip size="small" class="mr-1">Free Type</v-chip>
            <v-chip size="small" class="mr-1">Free Amount/ID</v-chip>
            <v-chip size="small" class="mr-1">Premium Type</v-chip>
            <v-chip size="small" class="mr-1">Premium Amount/ID</v-chip>
          </p>
          <v-text-field
            v-model="sheetUrl"
            label="Google Sheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            variant="outlined"
            density="compact"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="importDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
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
import { ref, onMounted, watch, computed, onUnmounted } from 'vue' // Removed reactive
import axios from '../../services/api'; // Assuming correct path to configured axios
import RewardDisplay from './components/RewardDisplay.vue' // Assuming this component exists

// Data table headers
const headers = [
  { title: 'Milestone #', key: 'milestone_number', sortable: true, align: 'start', width: '10%' },
  { title: 'Required Points', key: 'required_points', sortable: true, width: '15%' },
  { title: 'Free Reward', key: 'free_reward', sortable: false, width: '25%' },
  { title: 'Premium Reward', key: 'paid_reward', sortable: false, width: '25%' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '15%' }
]

// Available reward types
const rewardTypes = [
  { title: 'Chips', value: 'chips' },
  { title: 'Gems', value: 'gems' },
  { title: 'Avatar Part', value: 'avatar_part' },
  { title: 'Pack', value: 'pack' }
  // Add other types if needed
]

// State variables
const seasons = ref([])
const milestones = ref([])
const selectedSeasonId = ref('')
const loading = ref(false)
const editDialog = ref(false) // For single milestone edit
const bulkDialog = ref(false) // For bulk edit/configure
const importDialog = ref(false) // For sheet import
const importLoading = ref(false)
const sheetUrl = ref('')
const valid = ref(true) // For single edit form validation
const editForm = ref(null) // Ref for single edit form

// Milestone being edited (single edit) - Use ref
const defaultMilestone = {
  milestone_number: 0,
  required_points: 0,
  free_reward_type: 'chips',
  free_reward_amount: 0,
  paid_reward_type: 'chips',
  paid_reward_amount: 0,
  is_active: true
}
const editedMilestone = ref({...defaultMilestone})

// Array for bulk editing/configuration
const bulkMilestones = ref([])

// Compute selected season name for UI display
const selectedSeasonName = computed(() => {
  const found = seasons.value.find(s => s.season_id === selectedSeasonId.value)
  return found ? found.name : ''
})

// --- Lifecycle & Event Handling ---
onMounted(async () => {
  await fetchSeasons()
  // Check for initial season selection from localStorage (e.g., navigating from SeasonsTab)
  const storedSeasonId = localStorage.getItem('selectedSeasonId')
  if (storedSeasonId) {
    selectedSeasonId.value = storedSeasonId
    await fetchMilestones()
    localStorage.removeItem('selectedSeasonId') // Clear after use
  }
  window.addEventListener('change-tab', handleTabChange)
})

onUnmounted(() => {
  window.removeEventListener('change-tab', handleTabChange)
})

function handleTabChange(event) {
  if (event.detail === 'milestones') {
    const storedSeasonId = localStorage.getItem('selectedSeasonId')
    if (storedSeasonId && storedSeasonId !== selectedSeasonId.value) {
        // Only refetch if the ID actually changed
        selectedSeasonId.value = storedSeasonId
        fetchMilestones()
        localStorage.removeItem('selectedSeasonId')
    }
  }
}

// --- Data Fetching ---
async function fetchSeasons() {
  loading.value = true;
  try {
    const response = await axios.get('/admin/season-pass/seasons');
    seasons.value = response.data;
  } catch (error) {
    console.error('Error fetching seasons:', error);
    alert('Failed to load seasons data');
  } finally {
    loading.value = false;
  }
}

async function fetchMilestones() {
  if (!selectedSeasonId.value) {
      milestones.value = []; // Clear milestones if no season selected
      return;
  }
  loading.value = true;
  try {
    const response = await axios.get(`/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`);
    // Ensure points/amounts are numbers
    milestones.value = response.data.map(m => ({
        ...m,
        required_points: Number(m.required_points) || 0,
        free_reward_amount: Number(m.free_reward_amount) || 0,
        paid_reward_amount: Number(m.paid_reward_amount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching milestones:', error);
    milestones.value = []; // Clear on error
    alert('Failed to load milestones data');
  } finally {
    loading.value = false;
  }
}

// --- Single Milestone Edit ---
function editMilestone(milestone) {
  console.log("editMilestone called with:", JSON.stringify(milestone));
  // Assign to .value using spread for a fresh copy
  editedMilestone.value = { ...milestone };
  // Reset validation state for the dialog form
  nextTick(() => {
    editForm.value?.resetValidation();
    valid.value = true; // Assume valid initially
  });
  editDialog.value = true;
  console.log("editDialog.value set to:", editDialog.value);
}

async function saveMilestone() {
  // Trigger validation
  const { valid: formIsValid } = await editForm.value.validate();
  if (!formIsValid) {
      console.warn("Single milestone edit form invalid");
      return;
  }

  loading.value = true;
  try {
    // Use the bulk update endpoint, sending only the edited milestone
    await axios.post(`/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`, {
      milestones: [editedMilestone.value] // Send the value of the ref
    });
    await fetchMilestones(); // Refresh the table
    editDialog.value = false;
  } catch (error) {
    console.error('Error updating milestone:', error);
    alert('Failed to update milestone');
  } finally {
    loading.value = false;
  }
}

// --- Bulk Edit / Configuration ---
function bulkEditMilestones() {
  console.log("Configure Milestones clicked. Current milestones count:", milestones.value.length);
  if (milestones.value.length > 0) {
    // Edit existing: Create a deep copy
    bulkMilestones.value = JSON.parse(JSON.stringify(milestones.value));
    console.log("Populating bulk edit with existing milestones.");
  } else {
    // Create New: Initialize with default empty milestones
    const defaultCount = 30; // Number of milestones to create by default
    console.log(`No existing milestones found. Populating bulk edit with ${defaultCount} defaults.`);
    bulkMilestones.value = [];
    for (let i = 1; i <= defaultCount; i++) {
      bulkMilestones.value.push({
        milestone_number: i,
        required_points: i * 100, // Example default points
        free_reward_type: 'chips',
        free_reward_amount: 100 + (i - 1) * 10, // Example scaling
        paid_reward_type: 'chips',
        paid_reward_amount: 250 + (i - 1) * 25, // Example scaling
        is_active: true
      });
    }
  }
  // Sort by milestone number to ensure consistent ordering
  bulkMilestones.value.sort((a, b) => a.milestone_number - b.milestone_number);
  bulkDialog.value = true; // Open the dialog
  console.log("bulkDialog.value set to true. bulkMilestones count:", bulkMilestones.value.length);
}

function addBulkMilestone() {
    const nextNumber = bulkMilestones.value.length > 0
      ? Math.max(...bulkMilestones.value.map(m => m.milestone_number)) + 1
      : 1;
     bulkMilestones.value.push({
         milestone_number: nextNumber,
         required_points: (bulkMilestones.value.at(-1)?.required_points || 0) + 100, // Guess next points
         free_reward_type: 'chips',
         free_reward_amount: (bulkMilestones.value.at(-1)?.free_reward_amount || 100) + 10,
         paid_reward_type: 'chips',
         paid_reward_amount: (bulkMilestones.value.at(-1)?.paid_reward_amount || 250) + 25,
         is_active: true
     });
     // Consider scrolling to the new row if needed
}

function removeBulkMilestone(index) {
    if (confirm(`Are you sure you want to remove Milestone #${bulkMilestones.value[index].milestone_number}? This will be permanent on save.`)) {
        bulkMilestones.value.splice(index, 1);
        // Note: Renumbering is complex, backend POST should handle deletions if numbers are missing
    }
}


async function saveBulkMilestones() {
  // Add basic validation for bulk milestones (e.g., points > 0)
   const isValid = bulkMilestones.value.every(m => m.required_points > 0 && m.milestone_number > 0);
   if (!isValid) {
       alert("Please ensure all milestones have a positive number and required points.");
       return;
   }

  loading.value = true;
  try {
    await axios.post(`/admin/season-pass/seasons/${selectedSeasonId.value}/milestones`, {
      milestones: bulkMilestones.value // Send the current array
    });
    await fetchMilestones(); // Refresh list
    bulkDialog.value = false;
  } catch (error) {
    console.error('Error saving bulk milestones:', error);
    alert('Failed to save milestones');
  } finally {
    loading.value = false;
  }
}

// --- Import Sheet ---
function openImportDialog() {
  sheetUrl.value = '';
  importDialog.value = true;
}

async function importFromSheet() {
  if (!sheetUrl.value) return;
  importLoading.value = true;
  try {
    await axios.post('/admin/season-pass/import-sheet', {
      season_id: selectedSeasonId.value,
      sheet_url: sheetUrl.value
    });
    await fetchMilestones();
    importDialog.value = false;
    alert('Milestones imported successfully');
  } catch (error) {
    console.error('Error importing from sheet:', error);
    alert(`Failed to import: ${error.response?.data?.error || 'Unknown error'}`);
  } finally {
    importLoading.value = false;
  }
}

// --- Remove functions related to the separate configuration card ---
// remove detectProgressionType, detectRewardPatterns, detectSpecialMilestones, applyConfiguration, updateMilestoneCount, generatePointsProgression
// remove state variables related to that card: totalMilestones, pointsProgressionType, configurationChanged, freeRewardDefaultType, etc.

</script>

<style scoped>
.milestone-row {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}
</style>
