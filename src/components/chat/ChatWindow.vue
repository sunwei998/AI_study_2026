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
          @click="confirmClear"
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
        @click="sidebarOpen = false"
      ></div>
      <aside class="sidebar" :class="{ open: sidebarOpen, collapsed: sidebarCollapsed }">
        <div class="sidebar-header">
          <div class="sidebar-header-row">
            <h2>{{ $t('chat.title') }}</h2>
            <button
              class="header-btn collapse-btn"
              :title="$t('common.collapseSessions')"
              @click="toggleCollapsed"
            >
              «
            </button>
            <button
              class="header-btn sidebar-close"
              :title="$t('common.close')"
              @click="closeSidebar"
            >
              ✕
            </button>
          </div>
          <button class="header-btn sidebar-new" @click="createNew(), closeSidebar()">
            ➕ <span>{{ $t('common.newSession') }}</span>
          </button>
        </div>
        <div class="sessions-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            :class="['session-item', { active: session.id === currentSessionId }]"
            @click="selectSession(session.id)"
          >
            <div class="session-content">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-meta">
                {{ $t('chat.messageCount', { count: session.messages.length }) }}
              </div>
            </div>
            <button
              class="delete-btn"
              @click.stop="deleteSession(session.id)"
              :title="$t('common.delete')"
            >
              ✕
            </button>
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

const { t } = useI18n()

const store = useChatStore()

const sessions = computed(() => store.sessions)
const currentSessionId = computed(() => store.currentSessionId)
const currentSession = computed(() => store.currentSession)
const messages = computed(() => store.messages)
const isLoading = computed(() => store.isLoading)

const sidebarOpen = ref(false)
const closeSidebar = () => {
  sidebarOpen.value = false
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
  store.loadModel()
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

const confirmClear = () => {
  if (
    confirm(t('chat.confirmClear'))
  ) {
    store.clearMessages()
  }
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
.collapse-btn,
.sidebar-close {
  display: none;
}

.sidebar-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-primary);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
}

.session-item:hover {
  border-color: var(--color-primary);
  background: var(--color-glass);
  box-shadow: 0 0 12px var(--color-glow);
  transform: translateX(2px);
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

.delete-btn {
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
    display: flex;
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

  .sidebar-close {
    display: flex;
  }

  .sidebar-header {
    padding-top: calc(14px + var(--safe-top, 0px));
  }

  .sidebar-header,
  .sessions-list {
    min-width: 0;
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
    padding: 13px 12px;
  }

  .delete-btn {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }
}
</style>
