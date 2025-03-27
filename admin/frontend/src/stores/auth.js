// admin/frontend/src/stores/auth.js
import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('admin_token') || null,
    permissions: []
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    hasPermission: (state) => (permission) => state.permissions.includes(permission)
  },

  actions: {
    async login(username, password) {
      try {
        console.log('Attempting login with:', { username, password });
        const response = await api.post('/auth/login', { username, password });
        console.log('Login response:', response.data);

        this.token = response.data.token;
        this.user = response.data.user;

        localStorage.setItem('admin_token', this.token);

        // Fetch user permissions
        await this.fetchUserInfo();

        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          message: error.response?.data?.message || 'Login failed'
        };
      }
    },

    async fetchUserInfo() {
      try {
        const response = await api.get('/auth/me', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });

        this.user = response.data;
        this.permissions = response.data.permissions || [];

        return { success: true };
      } catch (error) {
        console.error('Error fetching user info:', error);

        // If unauthorized, logout
        if (error.response?.status === 401) {
          this.logout();
        }

        return { success: false };
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.permissions = [];
      localStorage.removeItem('admin_token');
    }
  }
})
