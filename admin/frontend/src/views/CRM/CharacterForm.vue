<template>
  <v-container>
    <h1 class="text-h4 mb-4">
      {{ isNew ? 'Create New Character' : 'Edit Character' }}
    </h1>
    
    <v-form ref="form" v-model="formValid" @submit.prevent="saveCharacter">
      <v-card>
        <v-card-title>Character Information</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="character.name"
                label="Name *"
                required
                :rules="[v => !!v || 'Name is required']"
              ></v-text-field>
              <div class="text-caption text-grey">The name of this character that will be displayed to users</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="character.title"
                label="Title"
              ></v-text-field>
              <div class="text-caption text-grey">Optional title or role for this character</div>
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="avatarDataJson"
                label="Avatar Data (JSON)"
                rows="8"
                hint="JSON object containing avatar configuration (format must match your avatar system)"
                persistent-hint
                :error-messages="jsonError"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="d-flex justify-space-between pa-4">
          <v-btn
            color="secondary"
            @click="$router.push({ name: 'crm' })"
          >
            Cancel
          </v-btn>
          
          <v-btn
            color="primary"
            type="submit"
            :disabled="!formValid || saving"
            :loading="saving"
          >
            {{ saving ? 'Saving...' : 'Save Character' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-container>
</template>

<script>
import apiService from '@/services/api';

export default {
  name: 'CharacterForm',
  data() {
    return {
      isNew: true,
      formValid: false,
      saving: false,
      character: {
        name: '',
        title: '',
        avatar_data: null
      },
      avatarDataJson: '{}',
      jsonError: ''
    }
  },
  created() {
    this.isNew = !this.$route.params.id;
    
    if (!this.isNew) {
      this.fetchCharacter(this.$route.params.id);
    }
  },
  methods: {
    async fetchCharacter(id) {
      try {
        const response = await apiService.get(`/crm/admin/characters/${id}`);
        this.character = response.data;
        
        // Initialize JSON string field
        this.avatarDataJson = this.character.avatar_data ? JSON.stringify(this.character.avatar_data, null, 2) : '{}';
      } catch (error) {
        console.error('Failed to fetch character:', error);
        this.$toast.error('Failed to load character: ' + (error.response?.data?.error || error.message));
        this.$router.push({ name: 'crm' });
      }
    },
    validateJson() {
      this.jsonError = '';
      
      if (this.avatarDataJson.trim() && this.avatarDataJson !== '{}') {
        try {
          JSON.parse(this.avatarDataJson);
        } catch (e) {
          this.jsonError = 'Invalid JSON format: ' + e.message;
          return false;
        }
      }
      
      return true;
    },
    async saveCharacter() {
      if (!this.$refs.form.validate() || !this.validateJson()) {
        return;
      }
      
      this.saving = true;
      
      try {
        // Parse the JSON field
        const payload = {
          ...this.character
        };
        
        // Parse avatar_data if it's not empty
        if (this.avatarDataJson.trim() && this.avatarDataJson !== '{}') {
          payload.avatar_data = JSON.parse(this.avatarDataJson);
        }
        
        if (this.isNew) {
          await apiService.post('/crm/admin/characters', payload);
          this.$toast.success('Character created successfully');
        } else {
          await apiService.put(`/crm/admin/characters/${this.character.id}`, payload);
          this.$toast.success('Character updated successfully');
        }
        
        this.$router.push({ name: 'crm' });
      } catch (error) {
        console.error('Failed to save character:', error);
        this.$toast.error('Failed to save character: ' + (error.response?.data?.error || error.message));
      } finally {
        this.saving = false;
      }
    }
  }
}
</script>
