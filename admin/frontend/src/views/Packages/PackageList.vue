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
        {{ item.chips.toLocaleString() }}
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../services/api'
import { useSnackbar } from '../../stores/snackbar'

const snackbar = useSnackbar()

// Data
const packages = ref([])
const loading = ref(true)
const dialog = ref(false)
const deleteDialog = ref(false)
const editMode = ref(false)
const editedItem = reactive({
  id: null,
  active: true,
  price: 0,
  chips: 0,
  gems: 0,
  display_order: 0
})
const defaultItem = {
  active: true,
  price: 0,
  chips: 0,
  gems: 0,
  display_order: 0
}
const packageToDelete = ref(null)

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true, width: '80px' },
  { title: 'Active', key: 'active', sortable: true, width: '100px' },
  { title: 'Price', key: 'price', sortable: true },
  { title: 'Chips', key: 'chips', sortable: true },
  { title: 'Gems', key: 'gems', sortable: true },
  { title: 'Display Order', key: 'display_order', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
]

// Load packages
const fetchPackages = async () => {
  loading.value = true
  try {
    const response = await api.get('/packages/admin/all')
    packages.value = response.data.packages
  } catch (error) {
    console.error('Error fetching packages:', error)
    snackbar.show({
      text: 'Failed to load packages',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Open dialog for new/edit
const openPackageDialog = (item = null) => {
  if (item) {
    // Edit mode
    editMode.value = true
    Object.assign(editedItem, item)
  } else {
    // Add mode
    editMode.value = false
    Object.assign(editedItem, defaultItem)
  }
  dialog.value = true
}

// Close dialog
const closeDialog = () => {
  dialog.value = false
  // Wait for dialog to close before resetting form
  setTimeout(() => {
    Object.assign(editedItem, defaultItem)
  }, 300)
}

// Save package
const savePackage = async () => {
  try {
    if (editMode.value) {
      // Update existing package
      await api.put(`/packages/admin/${editedItem.id}`, {
        active: editedItem.active,
        price: editedItem.price,
        chips: editedItem.chips,
        gems: editedItem.gems,
        display_order: editedItem.display_order
      })
      snackbar.show({
        text: 'Package updated successfully',
        color: 'success'
      })
    } else {
      // Create new package
      await api.post('/packages/admin', {
        active: editedItem.active,
        price: editedItem.price,
        chips: editedItem.chips,
        gems: editedItem.gems,
        display_order: editedItem.display_order
      })
      snackbar.show({
        text: 'Package created successfully',
        color: 'success'
      })
    }
    
    // Close dialog and refresh data
    closeDialog()
    fetchPackages()
  } catch (error) {
    console.error('Error saving package:', error)
    snackbar.show({
      text: 'Failed to save package',
      color: 'error'
    })
  }
}

// Toggle package active status
const togglePackageStatus = async (item) => {
  try {
    await api.put(`/packages/admin/${item.id}`, {
      active: item.active
    })
    snackbar.show({
      text: `Package ${item.active ? 'activated' : 'deactivated'}`,
      color: 'success'
    })
    fetchPackages()
  } catch (error) {
    console.error('Error updating package status:', error)
    // Revert UI change
    item.active = !item.active
    snackbar.show({
      text: 'Failed to update package status',
      color: 'error'
    })
  }
}

// Confirm package deletion
const confirmDeletePackage = (item) => {
  packageToDelete.value = item
  deleteDialog.value = true
}

// Delete package
const deletePackage = async () => {
  try {
    await api.delete(`/packages/admin/${packageToDelete.value.id}`)
    deleteDialog.value = false
    snackbar.show({
      text: 'Package deleted successfully',
      color: 'success'
    })
    fetchPackages()
  } catch (error) {
    console.error('Error deleting package:', error)
    snackbar.show({
      text: 'Failed to delete package',
      color: 'error'
    })
  }
}

// Initialize
onMounted(() => {
  fetchPackages()
})
</script>
