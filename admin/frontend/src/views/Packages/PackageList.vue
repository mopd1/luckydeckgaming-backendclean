<!-- admin/frontend/src/views/Packages/PackageList.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-6">Package Management</h1>
    
    <!-- Actions -->
    <div class="mb-4">
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openPackageDialog()"
      >
        Add Package
      </v-btn>
    </div>
    
    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="packages"
      :loading="loading"
      class="elevation-1"
    >
      <!-- Status Column -->
      <template v-slot:item.active="{ item }">
        <v-switch
          v-model="item.active"
          @change="togglePackageStatus(item)"
          color="primary"
          hide-details
        ></v-switch>
      </template>
      
      <!-- Price Column -->
      <template v-slot:item.price="{ item }">
        ${{ item.price }}
      </template>
      
      <!-- Chips Column -->
      <template v-slot:item.chips="{ item }">
        {{ formatNumber(item.chips) }}
      </template>
      
      <!-- Actions Column -->
      <template v-slot:item.actions="{ item }">
        <v-btn
          icon
          color="primary"
          size="small"
          @click="openPackageDialog(item)"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        
        <v-btn
          icon
          color="error"
          size="small"
          class="ml-2"
          @click="confirmDeletePackage(item)"
        >
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>
    
    <!-- Package Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ editMode ? 'Edit Package' : 'New Package' }}</span>
        </v-card-title>
        
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="editedItem.active"
                  label="Active"
                  color="primary"
                ></v-switch>
              </v-col>
              
              <v-col cols="12">
                <v-text-field
                  v-model.number="editedItem.price"
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  :rules="[v => !!v || 'Price is required']"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12">
                <v-text-field
                  v-model.number="editedItem.chips"
                  label="Chips Amount"
                  type="number"
                  min="0"
                  :rules="[v => !!v || 'Chips amount is required']"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12">
                <v-text-field
                  v-model.number="editedItem.gems"
                  label="Gems Amount"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12">
                <v-text-field
                  v-model.number="editedItem.display_order"
                  label="Display Order"
                  type="number"
                  min="0"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
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
      headers: [
        { title: 'ID', key: 'id', sortable: true, width: '80px' },
        { title: 'Active', key: 'active', sortable: true, width: '100px' },
        { title: 'Price', key: 'price', sortable: true },
        { title: 'Chips', key: 'chips', sortable: true },
        { title: 'Gems', key: 'gems', sortable: true },
        { title: 'Display Order', key: 'display_order', sortable: true },
        { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
      ],
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
      try {
        const response = await api.get('/packages/admin/all');
        this.packages = response.data.packages;
      } catch (error) {
        console.error('Error fetching packages:', error);
        this.showMessage('Failed to load packages', 'error');
      } finally {
        this.loading = false;
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
      }, 300);
    },
    
    // Save package
    async savePackage() {
      try {
        if (this.editMode) {
          // Update existing package
          await api.put(`/packages/admin/${this.editedItem.id}`, {
            active: this.editedItem.active,
            price: this.editedItem.price,
            chips: this.editedItem.chips,
            gems: this.editedItem.gems,
            display_order: this.editedItem.display_order
          });
          this.showMessage('Package updated successfully');
        } else {
          // Create new package
          await api.post('/packages/admin', {
            active: this.editedItem.active,
            price: this.editedItem.price,
            chips: this.editedItem.chips,
            gems: this.editedItem.gems,
            display_order: this.editedItem.display_order
          });
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
