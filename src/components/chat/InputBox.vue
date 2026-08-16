<template>
  <div class="input-box">
    <div class="input-wrapper">
      <textarea
        v-model="inputText"
        :placeholder="placeholder"
        :disabled="isLoading"
        maxlength="4000"
        class="input-field"
        @keydown.enter="handleSubmit"
      ></textarea>
      <div class="input-actions">
        <button
          v-if="inputText.trim()"
          class="clear-btn"
          @click="inputText = ''"
          title="清空"
        >
          ✕
        </button>
        <button
          v-if="isLoading"
          class="send-btn stop-btn"
          @click="$emit('stop')"
          title="停止生成"
        >
          ■
        </button>
        <button
          v-else
          class="send-btn"
          :disabled="!inputText.trim()"
          @click="handleClick"
          title="发送"
        >
          📤
        </button>
      </div>
    </div>
    <div class="input-footer">
      <span class="char-count">{{ inputText.length }} / 4000</span>
      <span class="tip">按 Enter 发送，Shift+Enter 换行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const inputText = ref('')

const placeholder = '输入您的问题... (按 Enter 发送)'

const handleSubmit = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (inputText.value.trim() && !props.isLoading) {
      emit('send', inputText.value)
      inputText.value = ''
    }
  }
}

const handleClick = () => {
  if (inputText.value.trim() && !props.isLoading) {
    emit('send', inputText.value)
    inputText.value = ''
  }
}
</script>

<style scoped>
.input-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-secondary);
  animation: slideInUp 0.3s ease-out;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  position: relative;
}

.input-field {
  flex: 1;
  min-height: 44px;
  max-height: 150px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  transition: var(--transition-normal);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.input-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.clear-btn,
.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  font-size: 18px;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.send-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: var(--color-background);
  font-weight: 600;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background: var(--color-surface);
  border-color: #ff4444;
  color: #ff4444;
}

.stop-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 0 4px;
}

.char-count {
  opacity: 0.7;
}

.tip {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .input-box {
    padding: 12px;
    gap: 6px;
  }

  .input-field {
    min-height: 40px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .clear-btn,
  .send-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .input-footer {
    font-size: 11px;
  }
}
</style>
