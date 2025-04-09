<template>
  <v-container>
    <h1 class="text-h4 mb-4">Customer Relationship Management</h1>
    
    <v-tabs v-model="activeTab" background-color="primary">
      <v-tab value="messages">Messages</v-tab>
      <v-tab value="characters">Characters</v-tab>
      <v-tab value="analytics">Analytics</v-tab>
    </v-tabs>
    
    <v-card class="mt-4">
      <v-window v-model="activeTab">
        <v-window-item value="messages">
          <MessagesTab />
        </v-window-item>
        
        <v-window-item value="characters">
          <CharactersTab />
        </v-window-item>
        
        <v-window-item value="analytics">
          <AnalyticsTab />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script>
import MessagesTab from './MessagesTab.vue';
import CharactersTab from './CharactersTab.vue';
import AnalyticsTab from './AnalyticsTab.vue';

export default {
  name: 'CrmIndex',
  components: {
    MessagesTab,
    CharactersTab,
    AnalyticsTab
  },
  data() {
    return {
      activeTab: 'messages'
    }
  },
  created() {
    // Check if URL has a hash indicating which tab to show
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (['messages', 'characters', 'analytics'].includes(hash)) {
        this.activeTab = hash;
      }
    }
  },
  watch: {
    activeTab(newValue) {
      // Update URL hash when tab changes
      window.location.hash = newValue;
    }
  }
}
</script>
