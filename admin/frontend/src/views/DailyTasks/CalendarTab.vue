<template>
  <div>
    <v-row>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>Task Sets</v-card-title>
          <v-card-text>
            <v-radio-group v-model="selectedSetId">
              <v-radio
                v-for="set in taskSets"
                :key="set.set_id"
                :label="set.name"
                :value="set.set_id"
              ></v-radio>
            </v-radio-group>
          </v-card-text>
          <v-card-actions>
            <v-btn 
              block 
              color="primary" 
              @click="assignSetToDates" 
              :disabled="!selectedSetId || selectedDates.length === 0"
            >
              Apply to Selected Dates
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="9">
        <v-card>
          <v-card-title>
            <div class="d-flex justify-space-between align-center w-100">
              <div>
                <v-btn icon @click="prevMonth">
                  <v-icon>mdi-chevron-left</v-icon>
                </v-btn>
                {{ currentMonthName }} {{ currentYear }}
                <v-btn icon @click="nextMonth">
                  <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
              </div>
              <div>
                <v-btn text @click="selectedDates = []">Clear Selection</v-btn>
              </div>
            </div>
          </v-card-title>
          
          <v-card-text>
            <div class="calendar">
              <!-- Day headers -->
              <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="calendar-header">
                {{ day }}
              </div>
              
              <!-- Calendar days -->
              <div 
                v-for="(day, index) in calendarDays" 
                :key="index"
                class="calendar-day"
                :class="{
                  'current-month': day.currentMonth,
                  'selected': isSelected(day.date),
                  'has-tasks': hasTaskSet(day.date)
                }"
                @click="toggleDateSelection(day.date)"
              >
                <div class="day-number">{{ day.day }}</div>
                <div v-if="hasTaskSet(day.date)" class="task-set-indicator">
                  {{ getTaskSetName(day.date) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../services/api'

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const selectedDates = ref([])
const selectedSetId = ref(null)
const taskSets = ref([])
const calendarData = ref({})
const loading = ref(false)

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentMonthName = computed(() => monthNames[currentMonth.value])

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  // Get first day of the month
  const firstDay = new Date(year, month, 1)
  // Get last day of the month
  const lastDay = new Date(year, month + 1, 0)
  
  // Get the day of the week for the first day (0 = Sunday)
  const firstDayOfWeek = firstDay.getDay()
  
  // Calculate days from previous month to show
  const daysFromPrevMonth = firstDayOfWeek
  
  // Calculate total days needed (prev month + current month + next month)
  const totalDays = 42 // 6 rows of 7 days
  
  // Generate calendar days
  const days = []
  
  // Add days from previous month
  const prevMonth = month === 0 ? 11 : month - 1
  const prevMonthYear = month === 0 ? year - 1 : year
  const prevMonthLastDay = new Date(prevMonthYear, prevMonth + 1, 0).getDate()
  
  for (let i = 0; i < daysFromPrevMonth; i++) {
    const day = prevMonthLastDay - daysFromPrevMonth + i + 1
    const date = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      day,
      date,
      currentMonth: false
    })
  }
  
  // Add days from current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      day: i,
      date,
      currentMonth: true
    })
  }
  
  // Add days from next month
  const remainingDays = totalDays - days.length
  const nextMonth = month === 11 ? 0 : month + 1
  const nextMonthYear = month === 11 ? year + 1 : year
  
  for (let i = 1; i <= remainingDays; i++) {
    const date = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      day: i,
      date,
      currentMonth: false
    })
  }
  
  return days
})

onMounted(async () => {
  await Promise.all([
    loadTaskSets(),
    loadCalendarData()
  ])
})

watch([currentYear, currentMonth], async () => {
  await loadCalendarData()
})

async function loadTaskSets() {
  try {
    const response = await api.get('/daily-tasks/sets')
    taskSets.value = response.data.sets
  } catch (error) {
    console.error('Error loading task sets:', error)
  }
}

async function loadCalendarData() {
  try {
    loading.value = true
    const year = currentYear.value
    const month = currentMonth.value + 1 // API expects 1-indexed months
    
    const response = await api.get(`/daily-tasks/calendar/${year}/${month}`)
    calendarData.value = response.data.calendar
  } catch (error) {
    console.error('Error loading calendar data:', error)
  } finally {
    loading.value = false
  }
}

function isSelected(date) {
  return selectedDates.value.includes(date)
}

function toggleDateSelection(date) {
  const index = selectedDates.value.indexOf(date)
  if (index === -1) {
    selectedDates.value.push(date)
  } else {
    selectedDates.value.splice(index, 1)
  }
}

function hasTaskSet(date) {
  return calendarData.value[date] !== undefined
}

function getTaskSetName(date) {
  return calendarData.value[date]?.set_name || ''
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

async function assignSetToDates() {
  if (!selectedSetId.value || selectedDates.value.length === 0) return
  
  try {
    await api.post('/daily-tasks/calendar/set-dates', {
      setId: selectedSetId.value,
      dates: selectedDates.value
    })
    
    // Refresh calendar data
    await loadCalendarData()
    
    // Clear selections
    selectedDates.value = []
  } catch (error) {
    console.error('Error assigning task set to dates:', error)
    alert('Failed to update calendar')
  }
}
</script>

<style scoped>
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-header {
  text-align: center;
  font-weight: bold;
  padding: 8px;
}

.calendar-day {
  height: 80px;
  border: 1px solid #e0e0e0;
  padding: 8px;
  cursor: pointer;
  position: relative;
  background-color: #f5f5f5;
}

.current-month {
  background-color: white;
}

.day-number {
  position: absolute;
  top: 4px;
  right: 8px;
}

.selected {
  background-color: #e3f2fd;
  border: 2px solid #2196f3;
}

.has-tasks {
  border-bottom: 3px solid #4caf50;
}

.task-set-indicator {
  font-size: 0.8rem;
  color: #4caf50;
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
