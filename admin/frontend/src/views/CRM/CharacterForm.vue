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
              <!-- Moved comment outside the tag -->
              <!-- Added validation on input for better UX -->
              <v-textarea
                v-model="avatarDataJson"
                label="Avatar Data (JSON)"
                rows="8"
                hint="JSON object containing avatar configuration (format must match your avatar system)"
                persistent-hint
                :error-messages="jsonError"
                @input="validateJson"
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

          <!-- Moved comment outside the tag -->
          <!-- Also disable if JSON is invalid -->
          <v-btn
            color="primary"
            type="submit"
            :disabled="!formValid || saving || !!jsonError"
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
import apiService from '@/services/api'; // Ensure this path is correct

export default {
  name: 'CharacterForm',
  data() {
    return {
      isNew: true,
      formValid: false, // This should reflect the Vuetify form validity
      saving: false,
      character: {
        id: null, // Add id for easier handling in save
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
    } else {
      // Ensure form is validated on creation if needed for initial state
       this.$nextTick(() => {
         if (this.$refs.form) {
           this.$refs.form.validate();
         }
      });
    }
  },
  methods: {
    async fetchCharacter(id) {
      this.saving = true; // Indicate loading during fetch
      try {
        // Use the imported apiService instance directly
        const response = await apiService.get(`/crm/admin/characters/${id}`);
        console.log('Fetched Character Response:', response); // Debug fetch

        // Correctly access data based on api.js interceptor returning full response
        if (response && response.data && response.data.success && response.data.character) {
          this.character = response.data.character;
          // Initialize JSON string field
          this.avatarDataJson = this.character.avatar_data ? JSON.stringify(this.character.avatar_data, null, 2) : '{}';
          // Ensure form validity is re-evaluated after loading data
          this.$nextTick(() => {
             if (this.$refs.form) {
               this.$refs.form.validate();
             }
          });
        } else {
          // Handle cases where API returns success:false or unexpected structure
          throw new Error(response?.data?.error || 'Failed to load character data');
        }
      } catch (error) {
        console.error('Failed to fetch character:', error);
        // Use optional chaining for safer access to error details
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
        // Assuming you have a global toast notification system like vue-toastification
        if (this.$toast && typeof this.$toast.error === 'function') {
          this.$toast.error(`Failed to load character: ${errorMessage}`);
        } else {
          console.error('Toast notification system not available or not configured correctly.');
          alert(`Failed to load character: ${errorMessage}`); // Fallback alert
        }
        this.$router.push({ name: 'crm' }); // Navigate back if fetch fails
      } finally {
        this.saving = false;
      }
    },

    validateJson() {
      this.jsonError = ''; // Reset error
      let isValid = true; // Assume valid initially
      // Only validate if the field is not empty or just '{}'
      if (this.avatarDataJson && this.avatarDataJson.trim() && this.avatarDataJson.trim() !== '{}') {
        try {
          JSON.parse(this.avatarDataJson);
        } catch (e) {
          this.jsonError = 'Invalid JSON format: ' + e.message;
          isValid = false; // Indicate invalid JSON
        }
      }

      // Trigger form re-validation after JSON check potentially changes error state
       this.$nextTick(() => {
         if (this.$refs.form) {
           // This ensures the overall form validity state (`v-model="formValid"`) updates
           this.$refs.form.validate();
         }
      });
      return isValid; // Return true/false
    },

    async saveCharacter() {
      // Manually trigger validation and store results
      const isFormValid = await this.$refs.form.validate(); // Vuetify validate() can be async
      const isJsonValid = this.validateJson(); // Our sync function

      // Check both validation results
      // Note: isFormValid from Vuetify's validate() already considers :rules and internal state
      // We mainly need to ensure our custom JSON validation also passes.
      if (!isFormValid || !isJsonValid) {
         console.warn('Validation failed. Form valid:', isFormValid, 'JSON valid:', isJsonValid);
         if (this.$toast && typeof this.$toast.warning === 'function') {
             this.$toast.warning('Please correct the errors before saving.');
         }
         return; // Stop if validation fails
      }

      this.saving = true;

      try {
        // Prepare payload
        const payload = {
          name: this.character.name,
          title: this.character.title,
          avatar_data: null // Default to null
        };

        // Parse avatar_data only if it's valid JSON and not empty/default
        if (this.avatarDataJson && this.avatarDataJson.trim() && this.avatarDataJson.trim() !== '{}') {
           // Validation already confirmed it's parseable
           payload.avatar_data = JSON.parse(this.avatarDataJson);
        }

        let response; // Declare response variable

        console.log('Saving character. Is New:', this.isNew, 'Payload:', JSON.stringify(payload)); // Debug log payload

        if (this.isNew) {
          // Call API and store the response
          response = await apiService.post('/crm/admin/characters', payload);
        } else {
          // Call API and store the response
          response = await apiService.put(`/crm/admin/characters/${this.character.id}`, payload);
        }

        console.log('Save Character Raw Response:', response); // Log the full response object

        // **** Access data via response.data ****
        if (response && response.data && response.data.success === true) {
          const successMessage = this.isNew ? 'Character created successfully' : 'Character updated successfully';
          console.log(successMessage, 'API Data:', response.data);

          if (this.$toast && typeof this.$toast.success === 'function') {
             this.$toast.success(successMessage);
          } else {
             console.error('Toast notification system not available or not configured correctly.');
             alert(successMessage); // Fallback
          }

          // Navigate back to the character list on successful save
          // Ensure 'crm' is the correct route name for your list view
          this.$router.push({ name: 'crm' });

        } else {
          // Handle cases where API returns success: false or unexpected structure
          const errorMessage = response?.data?.error || `API did not indicate success.`;
          console.error('Failed to save character (API logic error):', errorMessage, 'Full response data:', response?.data);
           if (this.$toast && typeof this.$toast.error === 'function') {
             this.$toast.error(`Failed to save character: ${errorMessage}`);
          } else {
             console.error('Toast notification system not available or not configured correctly.');
             alert(`Failed to save character: ${errorMessage}`); // Fallback
          }
        }

      } catch (error) {
        // This catch block handles network errors or non-2xx responses from Axios interceptor
        console.error('Failed to save character (Network/Server Error):', error);
        // Log the detailed error response if available
        if (error.response) {
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
        } else if (error.request) {
            console.error('Error Request Made but No Response Received:', error.request);
        } else {
            console.error('Error Setting Up Request:', error.message);
        }

        const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
        if (this.$toast && typeof this.$toast.error === 'function') {
          this.$toast.error(`Failed to save character: ${errorMessage}`);
        } else {
          console.error('Toast notification system not available or not configured correctly.');
          alert(`Failed to save character: ${errorMessage}`); // Fallback
        }
      } finally {
        this.saving = false; // Ensure loading state is always reset
      }
    }
  }
}
</script>
