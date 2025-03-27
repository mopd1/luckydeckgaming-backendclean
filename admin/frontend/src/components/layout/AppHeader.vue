<!-- admin/frontend/src/components/layout/AppHeader.vue -->
<template>
  <v-app-bar color="primary" app>
    <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
    <v-toolbar-title>Lucky Deck Admin</v-toolbar-title>
    <v-spacer></v-spacer>
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn icon v-bind="props">
          <v-avatar color="secondary" size="36">
            <span class="text-h6">{{ userInitials }}</span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list>
        <v-list-item>
          <v-list-item-title>{{ authStore.user?.username }}</v-list-item-title>
          <v-list-item-subtitle>{{ authStore.user?.role }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="logout">
          <v-list-item-title>Logout</v-list-item-title>
          <template v-slot:prepend>
            <v-icon>mdi-logout</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
  <v-navigation-drawer v-model="drawer" app>
    <v-list>
      <v-list-item
        title="Dashboard"
        prepend-icon="mdi-view-dashboard"
        :to="{ name: 'Dashboard' }"
      ></v-list-item>
      <v-list-item
        title="Economy"
        prepend-icon="mdi-cash-multiple"
        :to="{ name: 'Economy' }"
      ></v-list-item>
      <v-list-item
        v-if="hasPermission('view_users')"
        title="Users"
        prepend-icon="mdi-account-group"
        :to="{ name: 'UserList' }"
      ></v-list-item>
      <v-list-item
        v-if="hasPermission('view_database')"
        title="Database"
        prepend-icon="mdi-database"
        :to="{ name: 'DatabaseTables' }"
      ></v-list-item>
      <v-list-item
        v-if="hasPermission('execute_sql')"
        title="SQL Query"
        prepend-icon="mdi-console"
        :to="{ name: 'SqlQuery' }"
      ></v-list-item>
      <v-list-item
        v-if="hasPermission('view_config')"
        title="Game Configuration"
        prepend-icon="mdi-cog"
        :to="{ name: 'GameConfig' }"
      ></v-list-item>
      <v-list-item
        v-if="hasPermission('view_config')"
        title="Daily Tasks"
        prepend-icon="mdi-calendar-check"
        :to="{ name: 'DailyTasks' }"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
const router = useRouter()
const authStore = useAuthStore()
const drawer = ref(false)
const userInitials = computed(() => {
  if (!authStore.user?.username) return ''
  return authStore.user.username.substring(0, 2).toUpperCase()
})
const hasPermission = (permission) => {
  return authStore.hasPermission(permission)
}
function logout() {
  authStore.logout()
  router.push('/login')
}
</script>
