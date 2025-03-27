// admin/frontend/src/plugins/vuetify.js
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        colors: {
          primary: '#4d2c91',
          secondary: '#f5c542',
          accent: '#e91e63',
          error: '#f44336',
          warning: '#ff9800',
          info: '#03a9f4',
          success: '#4caf50'
        }
      },
      dark: {
        colors: {
          primary: '#4d2c91',
          secondary: '#f5c542',
          accent: '#e91e63',
          error: '#f44336',
          warning: '#ff9800',
          info: '#03a9f4',
          success: '#4caf50'
        }
      }
    }
  }
})
