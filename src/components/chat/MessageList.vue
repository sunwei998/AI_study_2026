<template>
  <div class="message-list">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">🚀</div>
      <h2>开始对话</h2>
      <p>与AI助手开始一场令人兴奋的交流吧</p>
      <div class="suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="suggestion-btn"
          @click="$emit('send', suggestion)"
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
import type { Message } from '@/types/chat'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: Message[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  regenerate: [message: Message]
}>()

const listRef = ref<HTMLElement>()

const suggestions = computed(() => [
  '请解释一下量子计算',
  '如何学习编程？',
  '写一个Python函数',
  '讲一个有趣的笑话'
])

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
  animation: slideInUp 0.5s ease-out;
}

.empty-state h2 {
  font-size: 24px;
  color: var(--color-text);
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
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
  border-radius: 8px;
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  transition: var(--transition-normal);
  font-size: 13px;
  text-align: center;
}

.suggestion-btn:hover {
  background: var(--color-primary);
  color: var(--color-background);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
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
