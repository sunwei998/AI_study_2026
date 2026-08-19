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
    <div v-else ref="listRef" class="messages-container" @scroll="onScroll">
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @regenerate="handleRegenerate(message)"
      />
    </div>
    <Transition name="backtop">
      <button
        v-if="showTopBtn"
        class="back-top-btn"
        :title="$t('common.backToTop')"
        :disabled="isLoading"
        @click="scrollToTop"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Message, SendPayload } from '@/types/chat'
import MessageItem from './MessageItem.vue'
import apiService from '@/services/apiService'
import { i18n } from '@/locales'

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
const showTopBtn = ref(false)

const onScroll = () => {
  const el = listRef.value
  showTopBtn.value = !!el && el.scrollTop > 200
}

const scrollToTop = () => {
  if (props.isLoading) return
  const el = listRef.value
  if (!el) return
  if ('scrollBehavior' in document.documentElement.style) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const start = el.scrollTop
  const duration = 320
  const startTime = performance.now()
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1)
    el.scrollTop = Math.round(start * (1 - easeOutCubic(t)))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const i18nFallback = computed<string[]>(() => tm('chat.suggestions') as unknown as string[])

const configSuggestions = ref<{ title_zh: string; title_en: string }[]>([])
const configLoaded = ref(false)

const suggestions = computed<string[]>(() => {
  if (configLoaded.value && configSuggestions.value.length) {
    const isEn = i18n.global.locale.value === 'en-US'
    return configSuggestions.value.map((s) => (isEn ? s.title_en : s.title_zh)).slice(0, 6)
  }
  return i18nFallback.value.slice(0, 6)
})

onMounted(async () => {
  try {
    const list = await apiService.fetchSuggestions()
    if (Array.isArray(list)) {
      configSuggestions.value = list
    }
  } catch {
    // 后端不可用时使用 i18n 兜底
  } finally {
    configLoaded.value = true
  }
})

const handleRegenerate = (message: Message) => {
  emit('regenerate', message)
}

// 自动滚动到底部（用户靠近底部时才跟随，避免打断阅读）
const isNearBottom = (): boolean => {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

let lastUserMsgId = ''

watch(
  () => props.messages,
  (msgs) => {
    // 检测到「新出现的用户消息」（发送消息）时强制滚动到最新对话
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (lastUser && lastUser.id !== lastUserMsgId) {
      lastUserMsgId = lastUser.id
      nextTick(() => {
        listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'auto' })
      })
      return
    }
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
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 0;
}

.back-top-btn {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px var(--color-glow);
  transition: var(--transition-normal);
  will-change: transform, opacity;
}

.back-top-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back-top-btn:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 18px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-2px);
}

.back-top-btn:active {
  transform: translateY(0) scale(0.92);
}

.back-top-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  pointer-events: none;
}

.backtop-enter-active,
.backtop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.backtop-enter-from,
.backtop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.7);
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

  .back-top-btn {
    left: 0;
    right: 0;
    bottom: 10px;
    width: 38px;
    height: 38px;
    margin: 0 auto;
  }

  .back-top-btn svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.2;
  }

  .backtop-enter-active,
  .backtop-leave-active {
    transition:
      opacity 0.22s ease,
      transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .backtop-enter-from,
  .backtop-leave-to {
    transform: translateY(8px) scale(0.85);
  }
}
</style>
