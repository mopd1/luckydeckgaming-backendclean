<template>
 <div>
   <div class="d-flex justify-space-between align-center mb-4">
     <h2 class="text-h5">Season List ({{ seasons.length }} seasons loaded)</h2>
     <v-btn
       color="primary"
       prepend-icon="mdi-plus"
       @click="openCreateDialog"
     >
       Create Season
     </v-btn>
   </div>

   <v-card>
     <div class="pa-4">
       <div class="v-table v-table--density-default v-theme--dark" style="background: var(--v-theme-surface); border-radius: 4px; overflow: hidden;">
         <div class="v-table__wrapper">
           <table style="width: 100%;">
             <thead>
               <tr style="background: rgba(255,255,255,0.05); height: 52px;">
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 10%;">
                   Season ID
                 </th>
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 25%;">
                   Name
                 </th>
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 15%;">
                   Start Date
                 </th>
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 15%;">
                   End Date
                 </th>
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 10%;">
                   Status
                 </th>
                 <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 25%;">
                   Actions
                 </th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="season in seasons" :key="season.season_id" 
                   style="height: 52px; border-bottom: 1px solid rgba(255,255,255,0.12);"
                   class="custom-row">
                 <td style="padding: 0 16px; color: rgba(255,255,255,0.87); font-family: monospace;">
                   {{ season.season_id }}
                 </td>
                 <td style="padding: 0 16px; color: rgba(255,255,255,0.87);">
                   {{ season.name }}
                 </td>
                 <td style="padding: 0 16px; color: rgba(255,255,255,0.60);">
                   {{ formatDate(season.start_date) }}
                 </td>
                 <td style="padding: 0 16px; color: rgba(255,255,255,0.60);">
                   {{ formatDate(season.end_date) }}
                 </td>
                 <td style="padding: 0 16px;">
                   <v-chip
                     :color="season.is_active ? 'success' : 'error'"
                     text-color="white"
                     size="small"
                   >
                     {{ season.is_active ? 'Active' : 'Inactive' }}
                   </v-chip>
                 </td>
                 <td style="padding: 0 16px;">
                   <v-btn
                     icon="mdi-pencil"
                     variant="text"
                     color="primary"
                     size="small"
                     @click="editSeason(season)"
                     class="mr-1"
                   ></v-btn>
                   <v-btn
                     icon="mdi-chart-timeline-variant"
                     variant="text"
                     color="primary"
                     size="small"
                     @click="viewMilestones(season)"
                     class="mr-1"
                   >
                     <v-tooltip activator="parent" location="top">View Milestones</v-tooltip>
                   </v-btn>
                   <v-btn
                     :icon="season.is_active ? 'mdi-close' : 'mdi-check'"
                     variant="text"
                     :color="season.is_active ? 'error' : 'success'"
                     size="small"
                     @click="toggleActive(season)"
                   >
                     <v-tooltip activator="parent" location="top">
                       {{ season.is_active ? 'Deactivate' : 'Activate' }}
                     </v-tooltip>
                   </v-btn>
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
         
         <div v-if="seasons.length === 0 && !loading" style="padding: 48px; text-align: center; color: rgba(255,255,255,0.60);">
           <div style="font-size: 18px; margin-bottom: 8px;">No Seasons Available</div>
           <div>There are currently no season passes configured.</div>
         </div>
         
         <div v-if="loading" style="padding: 48px; text-align: center;">
           <v-progress-circular indeterminate color="primary" class="mb-4"></v-progress-circular>
           <div style="color: rgba(255,255,255,0.60);">Loading seasons, please wait...</div>
         </div>
       </div>
     </div>
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
                 v-model="startDateInput"
                 label="Start Date (YYYY-MM-DD)"
                 type="date"
                 :rules="[v => !!v || 'Start date is required']"
                 variant="outlined"
                 density="compact"
                 @input="updateStartDate"
               ></v-text-field>
             </v-col>

             <v-col cols="12" sm="6">
               <v-text-field
                 v-model="endDateInput"
                 label="End Date (YYYY-MM-DD)"
                 type="date"
                 :rules="[
                   v => !!v || 'End date is required',
                   v => !startDateInput || !v || new Date(v) >= new Date(startDateInput) || 'End date must be after start date'
                 ]"
                 variant="outlined"
                 density="compact"
                 @input="updateEndDate"
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
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import axios from '../../services/api'

const seasons = ref([])
const loading = ref(true)
const dialog = ref(false)
const confirmDialog = ref(false)
const confirmMessage = ref('')
const confirmActionCallback = ref(() => {})
const valid = ref(false)
const form = ref(null)
const isEditing = ref(false)

const startDateInput = ref('')
const endDateInput = ref('')

const defaultSeason = {
 season_id: null,
 name: '',
 description: '',
 start_date: new Date(),
 end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
 is_active: false
}

const editedSeason = ref({...defaultSeason})

onMounted(async () => {
 await fetchSeasons()
})

function formatDateForInput(date) {
 if (!date) return '';
 const d = date instanceof Date ? date : new Date(date);
 if (isNaN(d.getTime())) return '';
 return d.toISOString().split('T')[0];
}

function updateStartDate(event) {
 const dateStr = event.target.value;
 if (dateStr) {
   editedSeason.value.start_date = new Date(dateStr + 'T00:00:00');
 } else {
   editedSeason.value.start_date = null;
 }
}

function updateEndDate(event) {
 const dateStr = event.target.value;
 if (dateStr) {
   editedSeason.value.end_date = new Date(dateStr + 'T23:59:59');
 } else {
   editedSeason.value.end_date = null;
 }
}

async function fetchSeasons() {
 loading.value = true
 console.log('[SeasonsTab] Attempting to load seasons...');
 
 try {
   const response = await axios.get('/admin/season-pass/seasons')
   console.log('[SeasonsTab] Raw API response for /seasons:', JSON.parse(JSON.stringify(response)));
   
   seasons.value = response.data.map(season => ({
     ...season,
     start_date: season.start_date ? new Date(season.start_date) : null,
     end_date: season.end_date ? new Date(season.end_date) : null,
   }));
   
   console.log('[SeasonsTab] Seasons successfully loaded (length):', seasons.value.length);
   if (seasons.value.length > 0) {
     console.log('[SeasonsTab] First season object structure:', JSON.parse(JSON.stringify(seasons.value[0])));
   }
 } catch (error) {
   console.error('Error fetching seasons:', error)
   alert('Failed to load seasons data')
   seasons.value = []
 } finally {
   loading.value = false
   console.log('[SeasonsTab] fetchSeasons finished. Loading state:', loading.value);
 }
}

function openCreateDialog() {
 console.log("Opening create dialog...");
 isEditing.value = false;
 editedSeason.value = {
   season_id: null,
   name: '',
   description: '',
   start_date: new Date(),
   end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
   is_active: false
 };
 startDateInput.value = formatDateForInput(editedSeason.value.start_date);
 endDateInput.value = formatDateForInput(editedSeason.value.end_date);
 nextTick(() => {
     form.value?.resetValidation();
     valid.value = false;
 });
 dialog.value = true;
}

function editSeason(season) {
 console.log("Opening edit dialog for season:", season.season_id);
 isEditing.value = true;
 editedSeason.value = {
   ...season,
   start_date: season.start_date instanceof Date ? season.start_date : (season.start_date ? new Date(season.start_date) : null),
   end_date: season.end_date instanceof Date ? season.end_date : (season.end_date ? new Date(season.end_date) : null),
 };
 startDateInput.value = formatDateForInput(editedSeason.value.start_date);
 endDateInput.value = formatDateForInput(editedSeason.value.end_date);
  nextTick(() => {
     form.value?.resetValidation();
     valid.value = false;
 });
 dialog.value = true;
}

function closeDialog() {
   dialog.value = false;
}

async function saveSeason() {
 const { valid: formIsValid } = await form.value.validate();
 if (!formIsValid) {
     console.warn("Form validation failed.");
     return;
 }

 loading.value = true

 const formatDateForAPI = (date) => {
     if (date instanceof Date && !isNaN(date)) {
         const year = date.getFullYear();
         const month = (date.getMonth() + 1).toString().padStart(2, '0');
         const day = date.getDate().toString().padStart(2, '0');
         return `${year}-${month}-${day}`;
     }
     return null;
 };

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

function viewMilestones(season) {
 localStorage.setItem('selectedSeasonId', season.season_id);
 const event = new CustomEvent('change-tab', { detail: 'milestones' });
 window.dispatchEvent(event);
}

function formatDate(dateValue) {
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
.custom-row {
 transition: background-color 0.2s;
 cursor: default;
}

.custom-row:hover {
 background-color: rgba(255,255,255,0.08) !important;
}

.v-table {
 border-radius: 4px;
 box-shadow: 0px 2px 1px -1px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, 0.2)), 0px 1px 1px 0px var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, 0.14)), 0px 1px 3px 0px var(--v-shadow-key-ambient-opacity, rgba(0, 0, 0, 0.12));
}

.v-dialog .v-card-text {
   padding: 16px 24px;
}
.v-dialog .v-card-actions {
   padding: 16px 24px;
}
</style>
