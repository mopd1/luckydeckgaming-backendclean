<!-- admin/frontend/src/views/Packages/PackageList.vue -->
<template>
  <div>
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>Package Management ({{ packages.length }} packages loaded)</span>
        <v-btn color="primary" @click="openPackageDialog()">Add Package</v-btn>
      </v-card-title>
      
      <!-- Custom Vuetify-styled table (same pattern as Daily Tasks) -->
      <div class="pa-4">
        <div class="v-table v-table--density-default v-theme--dark" style="background: var(--v-theme-surface); border-radius: 4px; overflow: hidden;">
          <div class="v-table__wrapper">
            <table style="width: 100%;">
              <thead>
                <tr style="background: rgba(255,255,255,0.05); height: 52px;">
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 80px;">
                    ID
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 100px;">
                    Active
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87);">
                    Price
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87);">
                    Chips
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87);">
                    Gems
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87);">
                    Display Order
                  </th>
                  <th style="padding: 0 16px; text-align: left; font-weight: 500; color: rgba(255,255,255,0.87); width: 120px;">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="packageItem in packages" :key="packageItem.id" 
                    style="height: 52px; border-bottom: 1px solid rgba(255,255,255,0.12);"
                    class="custom-row">
                  <td style="padding: 0 16px; color: rgba(255,255,255,0.87); font-family: monospace;">
                    {{ packageItem.id }}
                  </td>
                  <td style="padding: 0 16px;">
                    <v-switch
                      v-model="packageItem.active"
                      @change="togglePackageStatus(packageItem)"
                      color="primary"
                      hide-details
                      density="compact"
                    ></v-switch>
                  </td>
                  <td style="padding: 0 16px; color: rgba(255,255,255,0.87);">
                    ${{ packageItem.price }}
                  </td>
                  <td style="padding: 0 16px; color: rgba(255,255,255,0.87);">
                    {{ formatNumber(packageItem.chips) }}
                  </td>
                  <td style="padding: 0 16px; color: rgba(255,255,255,0.87);">
                    {{ formatNumber(packageItem.gems) }}
                  </td>
                  <td style="padding: 0 16px; color: rgba(255,255,255,0.87); text-align: center;">
                    {{ packageItem.display_order }}
                  </td>
                  <td style="padding: 0 16px;">
                    <v-btn 
                      icon="mdi-pencil" 
                      size="small" 
                      variant="text" 
                      @click="openPackageDialog(packageItem)"
                      class="mr-1"
                    ></v-btn>
                    <v-btn 
                      icon="mdi-delete" 
                      size="small" 
                      variant="text" 
                      color="error"
                      @click="confirmDeletePackage(packageItem)"
                    ></v-btn>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- No data state -->
          <div v-if="packages.length === 0 && !loading" style="padding: 48px; text-align: center; color: rgba(255,255,255,0.60);">
            <div style="font-size: 18px; margin-bottom: 8px;">No Packages Available</div>
            <div>There are currently no packages configured.</div>
          </div>
          
          <!-- Loading state -->
          <div v-if="loading" style="padding: 48px; text-align: center;">
            <v-progress-circular indeterminate color="primary" class="mb-4"></v-progress-circular>
            <div style="color: rgba(255,255,255,0.60);">Loading packages, please wait...</div>
          </div>
        </div>
      </div>
    </v-card>
    
    <!-- Package Dialog -->
    <v-dialog v-model="dialog" max-width="500px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ editMode ? 'Edit Package' : 'New Package' }}</span>
        </v-card-title>
        
        <v-card-text>
          <v-form ref="packageForm" @submit.prevent="savePackage">
            <v-switch
              v-model="editedItem.active"
              label="Active"
              color="primary"
              class="mb-3"
            ></v-switch>
            
            <v-text-field
              v-model.number="editedItem.price"
              label="Price ($)*"
              type="number"
              step="0.01"
              min="0"
              :rules="[v => !!v || 'Price is required', v => v >= 0 || 'Price must be positive']"
              required
            ></v-text-field>
            
            <v-text-field
              v-model.number="editedItem.chips"
              label="Chips Amount*"
              type="number"
              min="0"
              :rules="[v => !!v || 'Chips amount is required', v => v >= 0 || 'Chips must be positive']"
              required
            ></v-text-field>
            
            <v-text-field
              v-model.number="editedItem.gems"
              label="Gems Amount"
              type="number"
              min="0"
              :rules="[v => v >= 0 || 'Gems must be positive']"
            ></v-text-field>
            
            <v-text-field
              v-model.number="editedItem.display_order"
              label="Display Order"
              type="number"
              min="0"
              :rules="[v => v >= 0 || 'Display order must be positive']"
            ></v-text-field>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" text @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" text @click="savePackage">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h5">Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete this package? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" text @click="deletePackage">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn
          color="white"
          text
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'PackageList',
  data() {
    return {
      packages: [],
      loading: true,
      dialog: false,
      deleteDialog: false,
      editMode: false,
      editedItem: {
        id: null,
        active: true,
        price: 0,
        chips: 0,
        gems: 0,
        display_order: 0
      },
      defaultItem: {
        active: true,
        price: 0,
        chips: 0,
        gems: 0,
        display_order: 0
      },
      packageToDelete: null,
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        timeout: 3000
      }
    };
  },
  
  mounted() {
    this.fetchPackages();
  },
  
  methods: {
    // Show notification
    showMessage(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    
    // Load packages
    async fetchPackages() {
      this.loading = true;
      console.log('[PackageList] Attempting to load packages...');
      
      try {
        const response = await api.get('/packages/admin/all');
        console.log('[PackageList] Raw API response for /packages:', JSON.parse(JSON.stringify(response)));
        
        if (response.data && Array.isArray(response.data.packages)) {
          this.packages = response.data.packages;
          console.log('[PackageList] Packages successfully loaded (length):', this.packages.length);
          if (this.packages.length > 0) {
            console.log('[PackageList] First package object structure:', JSON.parse(JSON.stringify(this.packages[0])));
          }
        } else {
          console.error('[PackageList] Unexpected data structure. response.data:', JSON.parse(JSON.stringify(response.data)));
          this.packages = [];
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
        this.showMessage('Failed to load packages', 'error');
        this.packages = [];
      } finally {
        this.loading = false;
        console.log('[PackageList] fetchPackages finished. Loading state:', this.loading);
      }
    },
    
    // Open dialog for new/edit
    openPackageDialog(item = null) {
      if (item) {
        // Edit mode
        this.editMode = true;
        this.editedItem = Object.assign({}, item);
      } else {
        // Add mode
        this.editMode = false;
        this.editedItem = Object.assign({}, this.defaultItem);
      }
      this.dialog = true;
    },
    
    // Close dialog
    closeDialog() {
      this.dialog = false;
      // Wait for dialog to close before resetting form
      setTimeout(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        if (this.$refs.packageForm) {
          this.$refs.packageForm.resetValidation();
        }
      }, 300);
    },
    
    // Save package
    async savePackage() {
      if (this.$refs.packageForm) {
        const { valid } = await this.$refs.packageForm.validate();
        if (!valid) {
          this.showMessage('Please correct the form errors', 'error');
          return;
        }
      }
      
      try {
        const payload = {
          active: this.editedItem.active,
          price: this.editedItem.price,
          chips: this.editedItem.chips,
          gems: this.editedItem.gems || 0,
          display_order: this.editedItem.display_order || 0
        };
        
        if (this.editMode) {
          // Update existing package
          await api.put(`/packages/admin/${this.editedItem.id}`, payload);
          this.showMessage('Package updated successfully');
        } else {
          // Create new package
          await api.post('/packages/admin', payload);
          this.showMessage('Package created successfully');
        }
        
        // Close dialog and refresh data
        this.closeDialog();
        this.fetchPackages();
      } catch (error) {
        console.error('Error saving package:', error);
        this.showMessage('Failed to save package', 'error');
      }
    },
    
    // Toggle package active status
    async togglePackageStatus(item) {
      try {
        await api.put(`/packages/admin/${item.id}`, {
          active: item.active
        });
        this.showMessage(`Package ${item.active ? 'activated' : 'deactivated'}`);
        this.fetchPackages();
      } catch (error) {
        console.error('Error updating package status:', error);
        // Revert UI change
        item.active = !item.active;
        this.showMessage('Failed to update package status', 'error');
      }
    },
    
    // Confirm package deletion
    confirmDeletePackage(item) {
      this.packageToDelete = item;
      this.deleteDialog = true;
    },
    
    // Delete package
    async deletePackage() {
      try {
        await api.delete(`/packages/admin/${this.packageToDelete.id}`);
        this.deleteDialog = false;
        this.showMessage('Package deleted successfully');
        this.fetchPackages();
      } catch (error) {
        console.error('Error deleting package:', error);
        this.showMessage('Failed to delete package', 'error');
      }
    },
    
    // Format number with commas
    formatNumber(num) {
      return new Intl.NumberFormat().format(num || 0);
    }
  }
};
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
</style>
