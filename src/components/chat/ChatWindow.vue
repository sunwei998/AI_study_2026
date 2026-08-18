<template>
  <div class="chat-window">
    <!-- 顶部栏 -->
    <header class="chat-header">
      <div class="header-left">
        <button
          class="header-btn menu-btn"
          :title="$t('chat.title')"
          @click="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>
        <h1 class="title">{{ $t('app.name') }}</h1>
      </div>
      <div class="header-right">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <ModelSelector />
        <button
          v-if="currentSession && currentSession.messages.length > 0"
          class="header-btn"
          @click="askClearSession"
          :title="$t('common.clearSession')"
        >
          🗑️
        </button>
        <button class="header-btn header-new" @click="createNew" :title="$t('common.newSession')">
          ➕
        </button>
      </div>
    </header>

    <div class="chat-container">
      <!-- 侧边栏（移动端为抽屉） -->
      <div
        v-if="sidebarOpen"
        class="sidebar-backdrop"
        @click="closeSidebar()"
      ></div>
      <aside
        class="sidebar"
        :class="{ open: sidebarOpen, collapsed: sidebarCollapsed }"
        @click="onSidebarClick"
      >
        <button
          class="header-btn collapse-btn"
          :title="$t('common.collapseSessions')"
          @click="toggleCollapsed"
        >
          «
        </button>
        <div class="sidebar-header">
          <div class="sidebar-header-row">
            <div class="sidebar-filter">
              <input
                v-model="searchTerm"
                type="text"
                class="filter-input"
                :placeholder="$t('chat.filterPlaceholder')"
                @keydown.enter="onFilterEnter"
              />
              <button class="filter-btn" :title="$t('chat.filterSearch')" @click="applyFilter">
                🔍
              </button>
            </div>
          </div>
          <button class="header-btn sidebar-new" @click="createNew(), closeSidebar()">
            ➕ <span>{{ $t('common.newSession') }}</span>
          </button>
        </div>
        <div class="sessions-list">
          <div
            v-for="session in filteredSessions"
            :key="session.id"
            :class="[
              'session-item',
              {
                active: session.id === currentSessionId,
                deleting: deleteRevealedId === session.id
              }
            ]"
            @click="onSessionClick(session.id)"
            @touchstart.passive="onSessionPressStart(session.id)"
            @touchmove.passive="onSessionPressMove"
            @touchend="onSessionPressEnd"
            @touchcancel="onSessionPressEnd"
          >
            <div class="session-content">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-meta">
                {{ $t('chat.messageCount', { count: session.messages.length }) }}
              </div>
            </div>
            <button
              class="pin-btn"
              :class="{ pinned: session.pinned }"
              :disabled="pinningId === session.id"
              @click.stop="togglePin(session.id)"
              @touchstart.stop
              :title="session.pinned ? $t('common.unpin') : $t('common.pin')"
            >
              <AppLoading v-if="pinningId === session.id" :size="13" />
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 17v5" />
                <path
                  d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"
                />
              </svg>
            </button>
            <button
              class="delete-btn"
              @click.stop="askDeleteSession(session.id)"
              @touchstart.stop
              :title="$t('common.delete')"
            >
              ✕
            </button>
          </div>
          <div v-if="filteredSessions.length === 0" class="filter-empty">
            {{ $t('chat.filterEmpty') }}
          </div>
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <main class="chat-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-reopen"
          :title="$t('common.expandSessions')"
          @click="toggleCollapsed"
        >
          ☰
        </button>
        <MessageList
          :messages="messages"
          :is-loading="isLoading"
          @send="handleSendMessage"
          @regenerate="handleRegenerate"
        />
        <InputBox
          :is-loading="isLoading"
          @send="handleSendMessage"
          @stop="store.abortCurrentRequest()"
        />
      </main>
    </div>

    <ConfirmModal
      v-model:visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="$t('confirm.confirm')"
      :cancel-text="$t('confirm.cancel')"
      :confirming="confirmLoading"
      danger
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Message, SendPayload } from '@/types/chat'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chatStore'
import { applyTheme } from '@/styles/themes'
import MessageList from './MessageList.vue'
import InputBox from './InputBox.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import ModelSelector from './ModelSelector.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'

const { t } = useI18n()

const store = useChatStore()

const currentSessionId = computed(() => store.currentSessionId)
const currentSession = computed(() => store.currentSession)
const messages = computed(() => store.messages)
const isLoading = computed(() => store.isLoading)

const searchTerm = ref('')
const activeFilter = ref('')

const applyFilter = () => {
  activeFilter.value = searchTerm.value.trim().toLowerCase()
}

const onFilterEnter = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.isComposing) {
    applyFilter()
  }
}

const filteredSessions = computed(() => {
  const kw = activeFilter.value
  const base = store.sortedSessions
  if (!kw) return base
  return base.filter((s) => s.title.toLowerCase().includes(kw))
})

const sidebarOpen = ref(false)
const closeSidebar = () => {
  sidebarOpen.value = false
  deleteRevealedId.value = null
}

const deleteRevealedId = ref<string | null>(null)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressFired = false
let suppressClick = false

const clearLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onSessionPressStart = (id: string) => {
  suppressClick = false
  longPressFired = false
  clearLongPress()
  longPressTimer = setTimeout(() => {
    longPressFired = true
    deleteRevealedId.value = id
    navigator.vibrate?.(8)
  }, 500)
}

const onSessionPressMove = () => {
  clearLongPress()
}

const onSessionPressEnd = (e: TouchEvent) => {
  const fired = longPressFired
  longPressFired = false
  clearLongPress()
  if (fired) {
    suppressClick = true
    if (!(e.target as HTMLElement).closest('.pin-btn, .delete-btn')) {
      e.preventDefault()
    }
  }
}

const onSessionClick = (id: string) => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  selectSession(id)
}

const onSidebarClick = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.session-item')) {
    deleteRevealedId.value = null
  }
}

const sidebarCollapsed = ref(localStorage.getItem('chatSidebarCollapsed') === '1')
const toggleCollapsed = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('chatSidebarCollapsed', sidebarCollapsed.value ? '1' : '0')
}

onMounted(() => {
  // 加载本地数据
  store.loadSessions()
  store.loadTheme()
  store.loadModels()
  applyTheme(store.currentTheme)
})

const createNew = () => {
  store.createNewSession()
}

const selectSession = (sessionId: string) => {
  store.currentSessionId = sessionId
  closeSidebar()
}

const deleteSession = (sessionId: string) => {
  store.deleteSession(sessionId)
  closeSidebar()
}

const togglePin = async (sessionId: string) => {
  if (pinningId.value) return
  pinningId.value = sessionId
  await sleep(300)
  store.togglePin(sessionId)
  pinningId.value = null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pinningId = ref<string | null>(null)

const confirmVisible = ref(false)
const confirmState = ref<{
  title: string
  message: string
  onConfirm: () => void
} | null>(null)

const confirmTitle = computed(() => confirmState.value?.title ?? '')
const confirmMessage = computed(() => confirmState.value?.message ?? '')

const openConfirm = (opts: { title: string; message: string; onConfirm: () => void }) => {
  confirmState.value = opts
  confirmVisible.value = true
}

const confirmLoading = ref(false)

const handleConfirm = async () => {
  const cb = confirmState.value?.onConfirm
  if (!cb) return
  confirmLoading.value = true
  try {
    await sleep(300)
    confirmState.value = null
    confirmVisible.value = false
    cb()
  } finally {
    confirmLoading.value = false
  }
}

const handleCancel = () => {
  confirmState.value = null
}

const askDeleteSession = (sessionId: string) => {
  openConfirm({
    title: t('confirm.deleteSessionTitle'),
    message: t('confirm.deleteSessionMessage'),
    onConfirm: () => deleteSession(sessionId)
  })
}

const askClearSession = () => {
  openConfirm({
    title: t('confirm.clearTitle'),
    message: t('confirm.clearMessage'),
    onConfirm: () => store.clearMessages()
  })
}

const handleSendMessage = async (payload: SendPayload) => {
  // 流式输出，逐字渲染
  await store.sendMessageStream(payload.content, payload.images)
}

const handleRegenerate = async (message: Message) => {
  // 找到该助手消息之前最近的用户消息
  const msgs = store.messages
  const idx = msgs.findIndex((m) => m.id === message.id)
  if (idx < 0) return

  let userContent = ''
  let userImages: string[] = []
  let userId = ''
  for (let i = idx - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      userId = msgs[i].id
      userContent = msgs[i].content
      userImages = msgs[i].images || []
      break
    }
  }

  if (userContent || userImages.length) {
    // 删除该助手消息及对应的用户消息，再重新发送
    store.deleteMessage(message.id)
    if (userId) store.deleteMessage(userId)
    await store.sendMessage(userContent, userImages)
  }
}
</script>

<style scoped>
.chat-window {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-overlay);
}

.chat-header {
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 18px var(--color-glow);
  animation: fadeIn 0.6s ease-out;
}

.model-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1px;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--color-glass);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-btn {
  width: var(--control-h);
  height: var(--control-h);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  font-size: 18px;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-1px);
}

.chat-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.3s ease-out;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg, var(--color-glow), transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sidebar-new,
.collapse-btn {
  display: none;
}

.sidebar-filter {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: var(--transition-normal);
}

.sidebar-filter:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.filter-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  padding: 6px 0;
  color: var(--color-text);
  font-size: 13px;
  line-height: 1.4;
  outline: none;
}

.sidebar-filter .filter-input:focus {
  outline: none;
  border-color: transparent;
  box-shadow: none;
}

.filter-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.filter-btn {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-normal);
}

.filter-btn:hover {
  color: var(--color-primary);
  text-shadow: 0 0 10px var(--color-glow);
}

.filter-empty {
  padding: 28px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 45%, transparent) transparent;
}

.sessions-list::-webkit-scrollbar {
  width: 6px;
}

.sessions-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.sessions-list::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-primary) 32%, transparent),
    color-mix(in srgb, var(--color-accent) 32%, transparent)
  );
  border-radius: 3px;
}

.sidebar:hover .sessions-list {
  scrollbar-color: var(--color-primary) transparent;
}

.sidebar:hover .sessions-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 8px var(--color-glow), 0 0 16px var(--color-glow);
}

.sidebar:hover .sessions-list::-webkit-scrollbar-track {
  background: var(--color-overlay);
}

.session-item {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition-normal);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  position: relative;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.session-item:hover {
  border-color: var(--color-primary);
  background: var(--color-glass);
  box-shadow: 0 0 12px var(--color-glow);
  transform: translateX(2px);
}

.session-item.deleting {
  border-color: var(--color-primary);
  background: var(--color-glass);
  box-shadow: 0 0 14px var(--color-glow);
}

.session-item.active {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 60%);
  box-shadow: var(--shadow-sm), inset 0 0 18px var(--color-glow);
}

.session-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.session-content {
  flex: 1;
  overflow: hidden;
  padding-left: 6px;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.delete-btn,
.pin-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: var(--transition-fast);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.session-item:hover .delete-btn,
.session-item:hover .pin-btn,
.session-item:focus-within .delete-btn,
.session-item:focus-within .pin-btn,
.session-item.deleting .delete-btn,
.session-item.deleting .pin-btn {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.pin-btn svg {
  width: 14px;
  height: 14px;
}

.pin-btn:hover {
  background: rgba(255, 193, 7, 0.18);
  color: #ffc107;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
}

.pin-btn.pinned {
  background: rgba(255, 193, 7, 0.22);
  color: #ffc107;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.55);
}

.delete-btn:hover {
  background: #ff4d5e;
  color: white;
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.6);
}

.chat-main {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
}

.sidebar-reopen {
  display: none;
}

.menu-btn {
  display: none;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
}

/* 桌面端：可折叠面板 */
@media (min-width: 769px) {
  .sidebar {
    position: relative;
    min-width: 0;
    overflow: hidden;
    transition: width 0.45s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .sidebar-header,
  .sessions-list {
    min-width: 280px;
    transition: opacity 0.28s ease;
  }

  .collapse-btn {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    display: flex;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 14px;
  }

  .collapse-btn:hover:not(:disabled) {
    transform: translateY(-50%);
    box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  }

  .sidebar.collapsed {
    width: 0;
    border-right: none;
  }

  .sidebar.collapsed .sidebar-header,
  .sidebar.collapsed .sessions-list {
    opacity: 0;
  }

  .sidebar-reopen {
    position: absolute;
    left: 10px;
    top: 10px;
    z-index: 15;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-glass);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    color: var(--color-text);
    font-size: 16px;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: var(--transition-normal);
    animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .sidebar-reopen:hover {
    border-color: var(--color-primary);
    box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar-header,
  .sessions-list {
    min-width: 240px;
  }
}

@media (max-width: 768px) {
  .chat-header {
    padding: calc(var(--safe-top, 0px) + 10px) 10px 10px;
  }

  .header-left {
    gap: 6px;
  }

  .header-right {
    gap: 5px;
  }

  .menu-btn {
    display: flex;
  }

  .header-new {
    display: none;
  }

  .sidebar-header .sidebar-new {
    display: flex;
    width: 100%;
    height: 40px;
    justify-content: center;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  .sidebar-header {
    padding-top: calc(14px + var(--safe-top, 0px));
  }

  .sidebar-header,
  .sessions-list {
    min-width: 0;
  }

  .sidebar-filter .filter-input {
    font-size: 16px;
  }

  .title {
    font-size: 14px;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .model-badge {
    display: none;
  }

  .header-btn {
    width: 32px;
    height: 32px;
    font-size: 15px;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    width: min(280px, 85vw);
    display: flex;
    animation: none;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
    box-shadow: var(--shadow-lg);
    will-change: transform;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar.open .session-item {
    animation: slideInUp 0.4s ease-out both;
  }

  .sidebar.open .session-item:nth-child(1) {
    animation-delay: 0.04s;
  }

  .sidebar.open .session-item:nth-child(2) {
    animation-delay: 0.08s;
  }

  .sidebar.open .session-item:nth-child(3) {
    animation-delay: 0.12s;
  }

  .sidebar.open .session-item:nth-child(4) {
    animation-delay: 0.16s;
  }

  .sidebar.open .session-item:nth-child(5) {
    animation-delay: 0.2s;
  }

  .sidebar.open .session-item:nth-child(6) {
    animation-delay: 0.24s;
  }

  .sidebar.open .session-item:nth-child(7) {
    animation-delay: 0.28s;
  }

  .sidebar.open .session-item:nth-child(8) {
    animation-delay: 0.32s;
  }

  .sidebar.open .session-item:nth-child(n + 9) {
    animation-delay: 0.36s;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 99;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease-out;
  }

  .session-item {
    padding: 8px 12px;
  }

  .session-meta {
    display: none;
  }

  .delete-btn,
.pin-btn {
    width: 24px;
    height: 24px;
    font-size: 12px;
    border-radius: 5px;
  }
}
</style>
