<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">CRM Characters</h2>
      <v-btn color="primary" @click="createCharacter">
        New Character
      </v-btn>
    </div>
    
    <v-data-table
      :headers="headers"
      :items="characters"
      :loading="loading"
      :items-per-page="10"
      class="elevation-1"
    >
      <template v-slot:item.avatar_data="{ item }">
        <v-chip
          :color="item.avatar_data ? 'success' : 'grey'"
          text-color="white"
          size="small"
        >
          {{ item.avatar_data ? 'Has Avatar' : 'No Avatar' }}
        </v-chip>
      </template>
      
      <template v-slot:item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
      
      <template v-slot:item.actions="{ item }">
        <v-btn icon size="small" color="primary" @click="editCharacter(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" color="error" class="ml-2" @click="confirmDelete(item)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>
    
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
      headers: [
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Title', key: 'title', sortable: true },
        { title: 'Avatar', key: 'avatar_data', sortable: false },
        { title: 'Created', key: 'created_at', sortable: true },
        { title: 'Actions', key: 'actions', sortable: false }
      ],
      confirmDialog: false,
      characterToDelete: null
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
        this.characters = response.data.characters;
      } catch (error) {
        console.error('Failed to fetch characters:', error);
        this.$toast?.error ? this.$toast.error('Failed to load characters: ' + (error.response?.data?.error || error.message)) : alert('Failed to load characters');
      } finally {
        this.loading = false;
      }
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
        this.$toast?.success ? this.$toast.success('Character deleted successfully') : alert('Character deleted successfully');
        this.fetchCharacters();
      } catch (error) {
        console.error('Failed to delete character:', error);
        this.$toast?.error ? this.$toast.error('Failed to delete character: ' + (error.response?.data?.error || error.message)) : alert('Failed to delete character');
      } finally {
        this.confirmDialog = false;
        this.characterToDelete = null;
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  }
}
</script>
