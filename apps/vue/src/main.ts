import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { installInterceptors } from './api/client'
import { i18n } from './plugins/i18n'
import { vuetify } from './plugins/vuetify'
import { router } from './router'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(vuetify)

// Needs pinia + router to exist, so it runs after both are installed.
installInterceptors(router)

app.mount('#app')
