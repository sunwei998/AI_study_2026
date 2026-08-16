<template>
  <div :class="['message-item', message.role]">
    <div class="message-avatar">
      <div class="avatar-icon">
        {{ message.role === 'user' ? '👤' : '🤖' }}
      </div>
    </div>
    <div class="message-content-wrapper">
      <div class="message-header">
        <span class="message-role">
          {{ message.role === 'user' ? '你' : 'AI助手' }}
        </span>
        <span class="message-time">
          {{ formatTime(message.timestamp) }}
        </span>
      </div>
      <div class="message-bubble">
        <p v-if="!message.loading" class="message-text">
          {{ message.content }}
        </p>
        <div v-else class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div v-if="message.loading" class="loading-text">正在思考中...</div>
      </div>
      <div v-if="message.role === 'assistant'" class="message-actions">
        <button
          v-if="message.content"
          class="action-btn"
          :title="copied ? '已复制' : '复制'"
          @click="copyToClipboard"
        >
          {{ copied ? '✓' : '📋' }}
        </button>
        <button class="action-btn" title="重新生成" @click="regenerate">
          🔄
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Message } from '@/types/chat'

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const copied = ref(false)

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const regenerate = () => {
  emit('regenerate')
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 16px;
  animation: slideInUp 0.3s ease-out;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: var(--shadow-md);
}

.message-item.user .avatar-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.message-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 70%;
}

.message-item.user .message-content-wrapper {
  align-items: flex-end;
}

.message-header {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.message-item.user .message-header {
  flex-direction: row-reverse;
}

.message-role {
  font-weight: 600;
  color: var(--color-primary);
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-color: rgba(102, 126, 234, 0.3);
}

.message-bubble:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.message-text {
  margin: 0;
  line-height: 1.6;
  color: var(--color-text);
  font-size: 14px;
}

.loading-dots {
  display: flex;
  gap: 4px;
  height: 20px;
  align-items: center;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.loading-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.message-actions {
  display: flex;
  gap: 8px;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: var(--color-border);
  transition: var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-primary);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .message-item {
    padding: 0 8px;
  }

  .message-content-wrapper {
    max-width: 90%;
  }

  .message-avatar {
    width: 28px;
    height: 28px;
  }

  .avatar-icon {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .message-bubble {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>
