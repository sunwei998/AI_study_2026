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
      <div ref="topSentinel" class="top-sentinel"></div>
      <div v-if="loadingOlder" class="top-loading">
        <AppLoading :size="14" />
        <span>{{ $t('chat.loadingOlder') }}</span>
      </div>
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
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Message, SendPayload } from '@/types/chat'
import MessageItem from './MessageItem.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import { useChatStore } from '@/stores/chatStore'
import apiService from '@/services/apiService'

const { tm } = useI18n()
const store = useChatStore()

const props = defineProps<{
  messages: Message[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  send: [payload: SendPayload]
  regenerate: [message: Message]
}>()

const listRef = ref<HTMLElement>()
const topSentinel = ref<HTMLElement>()
const showTopBtn = ref(false)
const smoothScrolling = ref(false)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

const loadingOlder = computed(() => store.isLoadingOlder())

// “回到顶部”停在当前已加载内容顶部再下方一点的间距，让滚动条不贴顶，
// 提示用户上方还有更早消息；手动继续上滑到该间距以内才触发加载。
const AT_TOP_GAP = 48
const TRIGGER_ZONE = 24

// 向上懒加载：哨兵进入视口（靠近顶部）时加载更早消息，并保持滚动位置
let observer: IntersectionObserver | null = null

const setupObserver = () => {
  const el = listRef.value
  const sentinel = topSentinel.value
  observer?.disconnect()
  observer = null
  if (!el || !sentinel) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return
        if (!store.hasOlderMessages() || store.isLoadingOlder()) return
        const el = listRef.value
        if (!el) return
        const startTop = el.scrollTop
        const prevHeight = el.scrollHeight
        await store.loadOlderMessages()
        await nextTick()
        // “回到顶部”的平滑滚动进行中或滚动位置在此期间发生较大变化时，
        // 跳过位置补偿，避免与平滑动画竞争导致闪回到底部。
        if (smoothScrolling.value || Math.abs(el.scrollTop - startTop) > 30) return
        // 已在最顶部时不补偿，让更早消息自然出现在上方。
        if (el.scrollTop <= 2) return
        el.scrollTop += el.scrollHeight - prevHeight
      })
    },
    // 仅在用户手动上滑越过间距、真正接近已加载内容顶部时才触发加载
    { root: el, rootMargin: `${TRIGGER_ZONE}px 0px 0px 0px` }
  )
  observer.observe(sentinel)
}

watch(
  () => [store.currentSessionId, props.messages.length] as const,
  () => nextTick(setupObserver)
)

const onScroll = () => {
  const el = listRef.value
  showTopBtn.value = !!el && el.scrollTop > 200
}

const finishScroll = () => {
  smoothScrolling.value = false
  const el = listRef.value
  showTopBtn.value = !!el && el.scrollTop > 200
}

const scrollToTop = () => {
  if (props.isLoading) return
  const el = listRef.value
  if (!el) return
  // 上方还有未加载消息时，停在已加载内容的顶部稍下方（差一点到顶），
  // 让滚动条不贴顶、提示还有更早消息；已全部加载则直接滑到最顶。
  const target = store.hasOlderMessages() ? AT_TOP_GAP : 0
  smoothScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  if ('scrollBehavior' in document.documentElement.style) {
    el.scrollTo({ top: target, behavior: 'smooth' })
    // 平滑滚动结束时同步按钮状态（scrollend 不派发时由超时兜底）
    el.addEventListener('scrollend', finishScroll, { once: true })
    scrollTimer = setTimeout(finishScroll, 1500)
    return
  }
  const start = el.scrollTop
  const duration = 320
  const startTime = performance.now()
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1)
    el.scrollTop = Math.round(start + (target - start) * easeOutCubic(t))
    if (t < 1) requestAnimationFrame(step)
    else finishScroll()
  }
  requestAnimationFrame(step)
}

const i18nFallback = computed<string[]>(() => tm('chat.suggestions') as unknown as string[])

// 推荐词 = 用户提问高频词 TOP4（不分中英文，语言切换不影响）；无数据时用 i18n 兜底
const hotWords = ref<string[]>([])

const suggestions = computed<string[]>(() =>
  hotWords.value.length ? hotWords.value.slice(0, 4) : i18nFallback.value.slice(0, 4)
)

onMounted(async () => {
  try {
    const list = await apiService.fetchChatHotWords(4)
    if (Array.isArray(list)) {
      hotWords.value = list.map((w) => w.word).filter(Boolean)
    }
  } catch {
    // 后端不可用时使用 i18n 兜底
  }
  await nextTick()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  smoothScrolling.value = false
  if (scrollTimer) clearTimeout(scrollTimer)
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

// 1) 新消息/前插更早消息：仅关注消息条数变化（浅比较，避免逐 token 深遍历整个数组）
watch(
  () => props.messages.length,
  (len, oldLen) => {
    // 检测到「新出现的用户消息」（发送消息）时强制滚动到最新对话
    const lastUser = [...props.messages].reverse().find((m) => m.role === 'user')
    if (lastUser && lastUser.id !== lastUserMsgId) {
      lastUserMsgId = lastUser.id
      nextTick(() => {
        listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'auto' })
      })
      return
    }
    // 向上懒加载前插了更早消息：不跟随底部，滚动位置由 IntersectionObserver 保持
    if (oldLen !== undefined && len > oldLen) return
  }
)

// 2) 流式正文增长：最后一条消息内容变长时，若在底部则跟随滚动（合帧后最多 ~60/s）
watch(
  () => props.messages[props.messages.length - 1]?.content.length ?? 0,
  () => {
    if (!props.isLoading) return
    if (isNearBottom()) {
      nextTick(() => {
        listRef.value?.scrollTo({
          top: listRef.value.scrollHeight,
          behavior: 'auto'
        })
      })
    }
  }
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

.top-sentinel {
  height: 1px;
  flex-shrink: 0;
}

.top-loading {
  position: sticky;
  top: 8px;
  z-index: 5;
  align-self: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 14px var(--color-glow);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  animation: fadeIn 0.2s ease-out;
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
