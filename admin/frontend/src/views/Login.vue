<!-- admin/frontend/src/views/Login.vue -->
<template>
  <v-container fluid class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-card-title class="text-center pt-6">
            <div class="text-h4">Lucky Deck Admin</div>
          </v-card-title>
          
          <v-card-text>
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errorMessage }}
            </v-alert>
            
            <v-form @submit.prevent="onSubmit" ref="form">
              <v-text-field
                v-model="username"
                label="Username"
                prepend-inner-icon="mdi-account"
                required
                variant="outlined"
                class="mb-2"
              ></v-text-field>
              
              <v-text-field
                v-model="password"
                label="Password"
                prepend-inner-icon="mdi-lock"
                required
                type="password"
                variant="outlined"
                class="mb-6"
              ></v-text-field>
              
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
              >
                Login
              </v-btn>
              
              <!-- Test button - bypass submit -->
              <v-btn
                color="secondary"
                block
                size="large"
                class="mt-4"
                @click="loginDirectly"
              >
                Test Login
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

console.log('Login component script executing');

const router = useRouter();
const authStore = useAuthStore();

const username = ref('admin');  // Default for testing
const password = ref('admin123');  // Default for testing
const loading = ref(false);
const errorMessage = ref('');
const form = ref(null);

onMounted(() => {
  console.log('Login component mounted');
});

// Handle form submission
async function onSubmit(event) {
  console.log('Form submitted', event);
  loginDirectly();
}

// Direct login without form validation
async function loginDirectly() {
  console.log('Login function called');
  console.log('Login credentials:', { username: username.value, password: password.value });
  
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await authStore.login(username.value, password.value);
    console.log('Login result:', result);

    if (result.success) {
      console.log('Login successful, redirecting...');
      router.push('/');
    } else {
      console.log('Login failed:', result.message);
      errorMessage.value = result.message || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
}
</script>
