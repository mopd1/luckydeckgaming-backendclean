<template>
  <div class="d-flex align-center">
    <v-icon :icon="rewardIcon" :color="rewardColor" class="mr-1" small></v-icon>
    <span>
      {{ formattedAmount }} {{ formattedType }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  amount: {
    type: [Number, String],
    required: true
  }
})

// Formatted amount display
const formattedAmount = computed(() => {
  return Number(props.amount).toLocaleString()
})

// Formatted type display
const formattedType = computed(() => {
  switch (props.type) {
    case 'chips':
      return 'Chips'
    case 'gems':
      return 'Gems'
    case 'avatar_part':
      return 'Avatar Part'
    case 'pack':
      return 'Pack'
    default:
      return props.type
  }
})

// Icon for different reward types
const rewardIcon = computed(() => {
  switch (props.type) {
    case 'chips':
      return 'mdi-poker-chip'
    case 'gems':
      return 'mdi-diamond-stone'
    case 'avatar_part':
      return 'mdi-face-man'
    case 'pack':
      return 'mdi-package-variant-closed'
    default:
      return 'mdi-gift'
  }
})

// Color for different reward types
const rewardColor = computed(() => {
  switch (props.type) {
    case 'chips':
      return 'blue'
    case 'gems':
      return 'purple'
    case 'avatar_part':
      return 'green'
    case 'pack':
      return 'amber'
    default:
      return 'grey'
  }
})
</script>
