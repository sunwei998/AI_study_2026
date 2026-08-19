<script setup lang="ts">
import { onMounted } from 'vue'
import SciFiBackground from './components/chat/SciFiBackground.vue'
import ChatWindow from './components/chat/ChatWindow.vue'
import AdminConsole from './components/admin/AdminConsole.vue'
import AuthPage from './components/auth/AuthPage.vue'
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
  <AuthPage v-if="!auth.isLoggedIn" />
  <AdminConsole v-else-if="auth.view === 'console'" />
  <ChatWindow v-else />
</template>