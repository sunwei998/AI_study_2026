<script setup lang="ts">
import { onMounted } from 'vue'
import SciFiBackground from './components/chat/SciFiBackground.vue'
import ChatWindow from './components/chat/ChatWindow.vue'
import AdminConsole from './components/admin/AdminConsole.vue'
import AuthPage from './components/auth/AuthPage.vue'
import { useSafeArea } from './composables/useSafeArea'
import { useAuthStore } from './stores/authStore'

useSafeArea()

const auth = useAuthStore()

onMounted(() => {
  auth.init()
})
</script>

<template>
  <SciFiBackground />
  <AuthPage v-if="!auth.isLoggedIn" />
  <AdminConsole v-else-if="auth.view === 'console'" />
  <ChatWindow v-else />
</template>