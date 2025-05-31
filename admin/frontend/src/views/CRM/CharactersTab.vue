<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">CRM Characters</h2>
      <v-btn color="primary" @click="createCharacter">
        <v-icon left>mdi-plus</v-icon>
        New Character
      </v-btn>
    </div>
    
    <!-- Search bar -->
    <v-card class="mb-4">
      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search characters..."
          single-line
          hide-details
          clearable
          @input="searchCharacters"
          @click:clear="clearSearch"
        ></v-text-field>
      </v-card-text>
    </v-card>

    <!-- Custom table implementation (proven pattern) -->
    <v-card>
      <div v-if="!loading" class="v-table v-table--density-default v-theme--dark">
        <table>
          <thead>
            <tr style="background: rgba(255,255,255,0.05); height: 52px;">
              <th style="width: 10%; padding: 16px;">ID</th>
              <th style="width: 25%; padding: 16px;">Name</th>
              <th style="width: 25%; padding: 16px;">Title</th>
              <th style="width: 20%; padding: 16px;">Avatar</th>
              <th style="width: 20%; padding: 16px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="character in filteredCharacters" :key="character.id" class="custom-row" style="border-bottom: 1px solid rgba(255,255,255,0.12);">
              <td style="padding: 16px;">{{ character.id }}</td>
              <td style="padding: 16px;">{{ character.name }}</td>
              <td style="padding: 16px;">{{ character.title || '-' }}</td>
              <td style="padding: 16px;">
                <v-chip size="small" color="info" v-if="character.avatar_data">
                  Has Avatar
                </v-chip>
                <span v-else class="text-grey">No Avatar</span>
              </td>
              <td style="padding: 16px;">
                <v-btn size="small" icon color="primary" @click="editCharacter(character)" class="me-1">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn size="small" icon color="error" @click="confirmDelete(character)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="mt-2">Loading characters...</p>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredCharacters.length === 0" class="text-center pa-4">
        <v-icon size="64" color="grey">mdi-account-group</v-icon>
        <p class="mt-2 text-grey">{{ search ? 'No characters found matching your search' : 'No characters found' }}</p>
        <v-btn color="primary" class="mt-2" @click="createCharacter">
          Create First Character
        </v-btn>
      </div>
    </v-card>
    
    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">
          Confirm Deletion
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the character "{{ characterToDelete?.name }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="confirmDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="text" @click="deleteCharacter">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
import apiService from '@/services/api';

export default {
  name: 'CharactersTab',
  data() {
    return {
      characters: [],
      loading: true,
      search: '',
      searchTimeout: null,
      confirmDialog: false,
      characterToDelete: null,
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success'
    }
  },
  computed: {
    filteredCharacters() {
      if (!this.search) return this.characters;
      
      const searchTerm = this.search.toLowerCase();
      return this.characters.filter(character => 
        character.name.toLowerCase().includes(searchTerm) ||
        character.title?.toLowerCase().includes(searchTerm)
      );
    }
  },
  mounted() {
    this.fetchCharacters();
  },
  methods: {
    async fetchCharacters() {
      this.loading = true;
      try {
        const response = await apiService.get('/crm/admin/characters');
        this.characters = response.data.characters || [];
        console.log('Characters loaded:', this.characters.length);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
        this.showSnackbar('Failed to load characters: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.loading = false;
      }
    },
    
    searchCharacters() {
      // Debounce search to avoid too many operations
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        // Search is handled by computed property
      }, 300);
    },
    
    clearSearch() {
      this.search = '';
    },
    
    createCharacter() {
      this.$router.push({ name: 'crm-character-create' });
    },
    
    editCharacter(character) {
      this.$router.push({ 
        name: 'crm-character-edit', 
        params: { id: character.id } 
      });
    },
    
    confirmDelete(character) {
      this.characterToDelete = character;
      this.confirmDialog = true;
    },
    
    async deleteCharacter() {
      if (!this.characterToDelete) return;
      
      try {
        await apiService.delete(`/crm/admin/characters/${this.characterToDelete.id}`);
        this.showSnackbar('Character deleted successfully', 'success');
        this.fetchCharacters();
      } catch (error) {
        console.error('Failed to delete character:', error);
        this.showSnackbar('Failed to delete character: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.confirmDialog = false;
        this.characterToDelete = null;
      }
    },
    
    showSnackbar(text, color = 'success') {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.snackbar = true;
    }
  }
}
</script>

<style scoped>
.custom-row:hover {
  background-color: rgba(255, 255, 255, 0.04) !important;
}

.v-table table {
  width: 100%;
  border-collapse: collapse;
}

.v-table th,
.v-table td {
  text-align: left;
}

.v-table th {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.0892857143em;
}
</style>
