<script setup lang="ts">
import SciFiBackground from './components/chat/SciFiBackground.vue'
import ChatWindow from './components/chat/ChatWindow.vue'
import { useSafeArea } from './composables/useSafeArea'

useSafeArea()
</script>

<template>
  <SciFiBackground />
  <ChatWindow />
</template>