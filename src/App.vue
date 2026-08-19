<script setup lang="ts">
import { onMounted } from 'vue'
import SciFiBackground from './components/chat/SciFiBackground.vue'
import AppToast from './components/common/AppToast.vue'
import { useSafeArea } from './composables/useSafeArea'
import { useAuthStore } from './stores/authStore'
import { useChatStore } from './stores/chatStore'
import { applyTheme } from './styles/themes'

useSafeArea()

const auth = useAuthStore()
const chat = useChatStore()

onMounted(() => {
  auth.init()
  chat.loadTheme()
  applyTheme(chat.currentTheme)
})
</script>

<template>
  <SciFiBackground />
  <RouterView />
  <AppToast />
</template>