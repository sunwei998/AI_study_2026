import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Particles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import App from './App.vue'
import { i18n } from './locales'
import './styles/global.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(Particles, { init: loadSlim })
app.mount('#app')
