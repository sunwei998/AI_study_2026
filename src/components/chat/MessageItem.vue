<template>
  <div :class="['message-item', message.role]">
    <div class="message-avatar">
      <div class="avatar-icon">
        <img
          v-if="message.role === 'user' && auth.user?.avatar"
          :src="avatarSrc(auth.user.avatar)"
          class="avatar-img"
          alt=""
        />
        <template v-else>{{ message.role === 'user' ? '👤' : '🤖' }}</template>
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
        <div v-if="message.content && message.role === 'assistant' && !message.loading" class="markdown-body" v-html="renderedContent" @click="onMarkdownClick"></div>
        <div v-else-if="message.content && message.role === 'assistant'" class="markdown-body streaming-text">{{ message.content }}</div>
        <div v-else-if="message.content && message.role === 'user'" class="user-text">{{ message.content }}</div>
        <div v-if="message.isSearching" class="message-searching">
          <div class="searching-animation">
            <span class="searching-pulse"></span>
            <AppIcon name="lucide:search" :size="16" class="searching-icon" />
          </div>
          <span class="searching-text">
            {{ (message.searchingText || '联网搜索中').replace(/\.+$/, '') }}
            <span class="searching-dots"><span>.</span><span>.</span><span>.</span></span>
          </span>
        </div>
        <span v-if="message.loading && message.content" class="streaming-cursor"></span>
        <template v-if="message.loading && !message.content && !message.isSearching">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="loading-text">{{ $t('chat.thinking') }}</div>
        </template>
      </div>
      <div v-if="message.role === 'assistant' && message.reasoning" class="message-reasoning">
        <button type="button" class="reasoning-toggle" @click="reasoningOpen = !reasoningOpen">
          <span class="reasoning-icon">💭</span>
          <span>{{ $t('chat.reasoning') }}</span>
          <span class="reasoning-caret">{{ reasoningOpen ? '▾' : '▸' }}</span>
        </button>
        <div v-if="reasoningOpen" class="reasoning-body">{{ message.reasoning }}</div>
      </div>
      <div
        v-if="message.role === 'assistant' && message.searchStatus && message.searchStatus.status !== 'started'"
        class="message-search-meta"
      >
        <span v-if="message.searchStatus.status === 'done'" class="search-meta-done">
          🔍 {{ $t('chat.searchDone', { count: message.searchStatus.count ?? 0, duration: ((message.searchStatus.duration_ms ?? 0) / 1000).toFixed(1) }) }}
        </span>
        <span v-else-if="message.searchStatus.status === 'no_results'" class="search-meta-warn">
          ⚠️ {{ $t('chat.searchNoResults') }}
        </span>
        <span v-else-if="message.searchStatus.status === 'unsupported'" class="search-meta-warn">
          ⚠️ {{ $t('chat.searchUnsupported') }}
        </span>
        <span v-else class="search-meta-warn">
          ⚠️ {{ $t('chat.searchFailed') }}
        </span>
      </div>
      <div v-if="message.citations && message.citations.length" class="message-citations">
        <span class="citations-label">{{ $t('chat.sources') }}:</span>
        <a
          v-for="(c, i) in message.citations"
          :key="i"
          class="citation-link"
          :href="c.link"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.link"
        >
          <AppIcon name="lucide:link-2" :size="11" />
          {{ c.title }}
        </a>
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
import { useAuthStore } from '@/stores/authStore'
import { avatarSrc } from '@/utils/avatar'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const auth = useAuthStore()
const copied = ref(false)
const reasoningOpen = ref(false)

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
  // 流式输出期间不解析 Markdown（纯文本渲染），结束后再一次性解析，避免每个 token 都 O(n²) 重渲染
  if (!props.message.content || props.message.loading) return ''
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
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
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
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm), inset 0 1px 0 var(--glass-edge);
  transition: var(--transition-normal);
  word-wrap: break-word;
  position: relative;
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25));
  border-color: rgba(124, 92, 255, 0.4);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.user-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.65;
}

/* 流式输出期间的纯文本（避免每个 token 重解析 Markdown） */
.streaming-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.65;
}

.message-bubble:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md), inset 0 0 14px var(--color-glow), inset 0 1px 0 var(--glass-edge);
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

.message-searching {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  color: var(--color-primary);
  font-size: 12px;
  font-family: var(--font-mono);
  width: fit-content;
}

.searching-animation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.searching-icon {
  position: relative;
  z-index: 1;
  color: var(--color-primary);
  animation: searching-swing 1.6s ease-in-out infinite;
  transform-origin: center;
}

.searching-pulse {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-primary);
  opacity: 0;
  animation: searching-pulse 1.6s ease-out infinite;
}

@keyframes searching-swing {
  0%, 100% { transform: rotate(-12deg) translateX(-1px); }
  50% { transform: rotate(12deg) translateX(1px); }
}

@keyframes searching-pulse {
  0% { transform: scale(0.6); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}

.searching-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.searching-dots {
  display: inline;
}

.searching-dots span {
  opacity: 0;
  animation: searching-dot 1.4s ease-in-out infinite;
}

.searching-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.searching-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes searching-dot {
  0%, 60%, 100% { opacity: 0; }
  30% { opacity: 1; }
}

/* 搜索状态徽标：成功/无结果/失败 */
.message-search-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  opacity: 0.85;
}

.search-meta-done {
  color: var(--color-primary);
  text-shadow: 0 0 8px var(--color-glow);
}

.search-meta-warn {
  color: #ffb74d;
}

/* 来源引用列表 */
.message-citations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 6px 12px;
}

.citations-label {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.citation-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 220px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text-secondary);
  font-size: 11px;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: var(--transition-fast);
}

.citation-link:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

@media (max-width: 768px) {
  .message-searching {
    padding: 6px 10px;
    font-size: 11px;
  }
}

/* 思考过程（DeepSeek 等 reasoning_content）：默认折叠，点击展开 */
.message-reasoning {
  padding: 2px 12px 0;
}

.reasoning-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-glass);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: var(--transition-fast);
}

.reasoning-toggle:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.reasoning-icon {
  opacity: 0.8;
}

.reasoning-caret {
  margin-left: 2px;
}

.reasoning-body {
  margin-top: 6px;
  max-height: 240px;
  overflow: auto;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-style: italic;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
</style>
