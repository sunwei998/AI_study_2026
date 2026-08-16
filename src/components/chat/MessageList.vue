<template>
  <div class="message-list">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">🚀</div>
      <h2>{{ $t('chat.emptyTitle') }}</h2>
      <p>{{ $t('chat.emptyDesc') }}</p>
      <div class="suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="suggestion-btn"
          @click="$emit('send', { content: suggestion, images: [] })"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>
    <div v-else ref="listRef" class="messages-container">
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @regenerate="handleRegenerate(message)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Message, SendPayload } from '@/types/chat'
import MessageItem from './MessageItem.vue'

const { tm } = useI18n()

const props = defineProps<{
  messages: Message[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  send: [payload: SendPayload]
  regenerate: [message: Message]
}>()

const listRef = ref<HTMLElement>()

const suggestions = computed<string[]>(() => tm('chat.suggestions') as unknown as string[])

const handleRegenerate = (message: Message) => {
  emit('regenerate', message)
}

// 自动滚动到底部（用户靠近底部时才跟随，避免打断阅读）
const isNearBottom = (): boolean => {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

watch(
  () => props.messages,
  () => {
    if (isNearBottom()) {
      nextTick(() => {
        listRef.value?.scrollTo({
          top: listRef.value.scrollHeight,
          behavior: props.isLoading ? 'auto' : 'smooth'
        })
      })
    }
  },
  { deep: true }
)
</script>

<style scoped>
.message-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--color-text-secondary);
  animation: fadeIn 0.5s ease-out;
}

.empty-icon {
  font-size: 64px;
  position: relative;
  animation: floatY 3s ease-in-out infinite;
  filter: drop-shadow(0 0 18px var(--color-glow));
}

.empty-state h2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--color-primary);
  text-shadow: 0 0 18px var(--color-glow);
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
  letter-spacing: 1px;
}

.suggestions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 600px;
  padding: 0 20px;
}

.suggestion-btn {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition-normal);
  font-size: 13px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.suggestion-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 30%,
    var(--color-glow) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  opacity: 0;
  transition: opacity 0.2s;
}

.suggestion-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 0 16px var(--color-glow);
}

.suggestion-btn:hover::before {
  opacity: 1;
  animation: shimmer 1.4s linear infinite;
}

.messages-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .suggestions {
    grid-template-columns: 1fr;
  }

  .empty-icon {
    font-size: 48px;
  }

  .empty-state h2 {
    font-size: 20px;
  }
}
</style>
