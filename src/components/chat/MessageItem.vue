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
          {{ message.role === 'user' ? $t('chat.you') : $t('chat.assistant') }}
        </span>
        <span class="message-time">
          {{ formatTime(message.timestamp) }}
        </span>
      </div>
      <div class="message-bubble">
        <div v-if="message.images && message.images.length" class="message-images">
          <img
            v-for="(img, index) in message.images"
            :key="index"
            :src="img"
            class="message-image"
            alt=""
            loading="lazy"
            @click="openImage(img)"
          />
        </div>
        <div v-if="message.content && message.role === 'assistant'" class="markdown-body" v-html="renderedContent" @click="onMarkdownClick"></div>
        <div v-else-if="message.content && message.role === 'user'" class="user-text">{{ message.content }}</div>
        <span v-if="message.loading && message.content" class="streaming-cursor"></span>
        <div v-if="message.loading && !message.content" class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div v-if="message.loading && !message.content" class="loading-text">{{ $t('chat.thinking') }}</div>
      </div>
      <div v-if="message.role === 'assistant'" class="message-actions">
        <button
          v-if="message.content"
          class="action-btn"
          :title="copied ? $t('common.copied') : $t('common.copy')"
          @click="copyToClipboard"
        >
          {{ copied ? '✓' : '📋' }}
        </button>
        <button class="action-btn" :title="$t('common.regenerate')" @click="regenerate">
          🔄
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Message } from '@/types/chat'

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const copied = ref(false)

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) {
      const safeLang = (lang || '').replace(/[^\w+#.-]/g, '')
      const escapeHtml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const content = escaped ? text : escapeHtml(text)
      return `<div class="code-block"><div class="code-header"><span class="code-lang">${safeLang || 'code'}</span><button class="code-copy-btn" type="button" title="copy">📋</button></div><pre><code${safeLang ? ` class="language-${safeLang}"` : ''}>${content}</code></pre></div>`
    }
  }
})

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const renderedContent = computed(() => {
  if (!props.message.content) return ''
  return DOMPurify.sanitize(marked.parse(props.message.content) as string)
})

const flashBtn = (btn: Element) => {
  btn.textContent = '✓'
  setTimeout(() => {
    btn.textContent = '📋'
  }, 1500)
}

const onMarkdownClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const btn = target.closest('.code-copy-btn')
  if (!btn) return
  const codeEl = (btn as HTMLElement).closest('.code-block')?.querySelector('code')
  const text = codeEl?.textContent ?? ''
  if (!text) return
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(() => flashBtn(btn))
      .catch(() => {
        if (legacyCopy(text)) flashBtn(btn)
      })
  } else if (legacyCopy(text)) {
    flashBtn(btn)
  }
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const legacyCopy = (text: string): boolean => {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-9999px'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  ta.setSelectionRange(0, ta.value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch (err) {
    console.error('复制失败:', err)
  }
  document.body.removeChild(ta)
  return ok
}

const copyToClipboard = () => {
  const text = props.message.content
  const showCopied = () => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(showCopied)
      .catch(() => {
        if (legacyCopy(text)) showCopied()
      })
  } else if (legacyCopy(text)) {
    showCopied()
  }
}

const regenerate = () => {
  emit('regenerate')
}

const openImage = (url: string) => {
  window.open(url, '_blank', 'noopener')
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
  box-shadow: 0 0 14px var(--color-glow);
  border: 1px solid var(--color-primary);
}

.message-item.user .avatar-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: rgba(124, 92, 255, 0.6);
  box-shadow: 0 0 14px rgba(124, 92, 255, 0.4);
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
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-primary);
  text-shadow: 0 0 8px var(--color-glow);
}

.message-time {
  font-family: var(--font-mono);
}

.message-bubble {
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  word-wrap: break-word;
  position: relative;
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25));
  border-color: rgba(124, 92, 255, 0.4);
}

.user-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.65;
}

.message-bubble:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md), inset 0 0 14px var(--color-glow);
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-image {
  max-width: 200px;
  max-height: 180px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  object-fit: cover;
  cursor: zoom-in;
  transition: var(--transition-normal);
  display: block;
}

.message-image:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow);
  transform: scale(1.02);
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
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
  box-shadow: 0 0 10px var(--color-glow);
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
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: var(--color-glass);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
  transform: scale(1.12);
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
