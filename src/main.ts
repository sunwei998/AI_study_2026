import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Particles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import App from './App.vue'
import { i18n } from './locales'
import router from './router'
import { setUnauthorizedHandler } from './services/unauthorized'
import { useAuthStore } from './stores/authStore'
import { showToast } from './composables/useToast'
import './composables/useDevice'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(Particles, { init: loadSlim })

setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia)
  const fullPath = router.currentRoute.value.fullPath
  auth.reset()
  showToast(i18n.global.t('auth.expired'), 'error')
  router.replace({ path: '/login', query: { redirect: fullPath } })
})

app.mount('#app')