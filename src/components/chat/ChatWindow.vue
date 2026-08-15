<template>
  <div class="chat-window">
    <!-- 顶部栏 -->
    <header class="chat-header">
      <div class="header-left">
        <h1 class="title">DeepSeek AI Chat</h1>
        <span class="model-badge">deepseek-r1:7b</span>
      </div>
      <div class="header-right">
        <ThemeSwitcher />
        <button
          v-if="currentSession && currentSession.messages.length > 0"
          class="header-btn"
          @click="confirmClear"
          title="清空当前会话"
        >
          🗑️
        </button>
        <button class="header-btn" @click="createNew" title="新建会话">
          ➕
        </button>
      </div>
    </header>

    <div class="chat-container">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>会话历史</h2>
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
                {{ session.messages.length }} 条消息
              </div>
            </div>
            <button
              class="delete-btn"
              @click.stop="deleteSession(session.id)"
              title="删除"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <main class="chat-main">
        <MessageList
          :messages="messages"
          :is-loading="isLoading"
          @send="handleSendMessage"
          @regenerate="handleRegenerate"
        />
        <InputBox :is-loading="isLoading" @send="handleSendMessage" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import { applyTheme } from '@/styles/themes'
import MessageList from './MessageList.vue'
import InputBox from './InputBox.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const store = useChatStore()

const sessions = computed(() => store.sessions)
const currentSessionId = computed(() => store.currentSessionId)
const currentSession = computed(() => store.currentSession)
const messages = computed(() => store.messages)
const isLoading = computed(() => store.isLoading)

onMounted(() => {
  // 加载本地数据
  store.loadSessions()
  store.loadTheme()
  applyTheme(store.currentTheme)
})

const createNew = () => {
  store.createNewSession()
}

const selectSession = (sessionId: string) => {
  store.currentSessionId = sessionId
}

const deleteSession = (sessionId: string) => {
  store.deleteSession(sessionId)
}

const confirmClear = () => {
  if (
    confirm('确定要清空当前会话的所有消息吗？此操作无法撤销。')
  ) {
    store.clearMessages()
  }
}

const handleSendMessage = async (content: string) => {
  // 使用普通方式或流式方式（可根据需要切换）
  await store.sendMessage(content)
  // 如果要使用流式方式：await store.sendMessageStream(content)
}

const handleRegenerate = async (message: Message) => {
  // 找到最后一条用户消息
  const messages = store.messages
  const userMsgIndex = messages.lastIndexOf(
    messages.find((m) => m.role === 'user' && m.timestamp < message.timestamp)!
  )

  if (userMsgIndex !== -1) {
    // 删除该助手消息
    store.deleteMessage(message.id)
    // 重新发送
    await store.sendMessage(messages[userMsgIndex].content)
  }
}

import { computed } from 'vue'
import type { Message } from '@/types/chat'
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-background);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-surface));
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.model-badge {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
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
  box-shadow: var(--shadow-md);
}

.chat-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: var(--color-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.3s ease-out;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-item {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition-normal);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.session-item:hover {
  border-color: var(--color-primary);
  background: var(--color-border);
}

.session-item.active {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.05));
  box-shadow: var(--shadow-sm);
}

.session-content {
  flex: 1;
  overflow: hidden;
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
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
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
  background: #ff4444;
  color: white;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .chat-header {
    padding: 12px;
  }

  .title {
    font-size: 18px;
  }

  .model-badge {
    display: none;
  }

  .header-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}
</style>
