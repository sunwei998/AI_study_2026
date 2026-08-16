import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, ChatSession, ThemeType } from '@/types/chat'
import apiService, { type ChatHistoryItem } from '@/services/apiService'

const THEMES: ThemeType[] = ['dark', 'light', 'neon', 'ocean']
const MAX_HISTORY = 20

export const useChatStore = defineStore('chat', () => {
  // 状态
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string>('')
  const currentTheme = ref<ThemeType>('dark')
  const isLoading = ref(false)

  // 计算属性
  const currentSession = computed(() => {
    return sessions.value.find((s) => s.id === currentSessionId.value)
  })

  const messages = computed(() => {
    return currentSession.value?.messages || []
  })

  const availableThemes = THEMES

  const getSession = (sessionId: string): ChatSession | undefined => {
    return sessions.value.find((s) => s.id === sessionId)
  }

  // 持久化
  const saveSessions = () => {
    try {
      localStorage.setItem('chatSessions', JSON.stringify(sessions.value))
    } catch (error) {
      console.warn('保存会话失败:', error)
    }
  }

  const loadSessions = () => {
    try {
      const saved = localStorage.getItem('chatSessions')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          sessions.value = parsed
          if (sessions.value.length > 0 && !currentSessionId.value) {
            currentSessionId.value = sessions.value[0].id
          }
        }
      }
    } catch (error) {
      console.warn('加载会话数据失败，已重置:', error)
      localStorage.removeItem('chatSessions')
      sessions.value = []
    }
    if (sessions.value.length === 0) {
      createNewSession()
    }
  }

  const createNewSession = () => {
    const id = `session_${Date.now()}`
    const newSession: ChatSession = {
      id,
      title: `聊天 ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    sessions.value.push(newSession)
    currentSessionId.value = id
    saveSessions()
    return id
  }

  const deleteSession = (sessionId: string) => {
    sessions.value = sessions.value.filter((s) => s.id !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id || ''
      if (!currentSessionId.value) {
        createNewSession()
      }
    }
    saveSessions()
  }

  const addMessage = (
    content: string,
    role: Message['role'] = 'user',
    sessionId?: string
  ): Message => {
    let session = sessionId ? getSession(sessionId) : currentSession.value
    if (!session) {
      if (!sessionId || !getSession(sessionId)) {
        createNewSession()
      }
      session = sessionId ? getSession(sessionId) : currentSession.value
    }
    if (!session) {
      throw new Error('无法定位会话')
    }
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      role,
      timestamp: Date.now()
    }
    session.messages.push(message)
    session.updatedAt = Date.now()
    saveSessions()
    return message
  }

  const updateMessage = (messageId: string, content: string, sessionId?: string) => {
    const session = sessionId ? getSession(sessionId) : currentSession.value
    if (session) {
      const message = session.messages.find((m) => m.id === messageId)
      if (message) {
        message.content = content
        session.updatedAt = Date.now()
      }
    }
  }

  const setMessageLoading = (messageId: string, loading: boolean, sessionId?: string) => {
    const session = sessionId ? getSession(sessionId) : currentSession.value
    if (session) {
      const message = session.messages.find((m) => m.id === messageId)
      if (message) {
        message.loading = loading
      }
    }
  }

  const deleteMessage = (messageId: string) => {
    if (currentSession.value) {
      currentSession.value.messages = currentSession.value.messages.filter(
        (m) => m.id !== messageId
      )
      currentSession.value.updatedAt = Date.now()
      saveSessions()
    }
  }

  const clearMessages = () => {
    if (currentSession.value) {
      currentSession.value.messages = []
      currentSession.value.updatedAt = Date.now()
      saveSessions()
    }
  }

  /**
   * 组装发送给模型的对话历史（去除占位助手消息，限制条数防止超长）
   */
  const buildHistory = (session: ChatSession, assistantMsgId: string): ChatHistoryItem[] => {
    return session.messages
      .filter((m) => m.id !== assistantMsgId)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }))
  }

  /**
   * 发送消息并获取AI回复
   */
  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    // 捕获会话ID，避免请求期间切换会话导致更新错位
    const sessionId = currentSessionId.value || createNewSession()

    addMessage(content, 'user', sessionId)
    const assistantMsg = addMessage('', 'assistant', sessionId)
    setMessageLoading(assistantMsg.id, true, sessionId)

    isLoading.value = true

    try {
      const session = getSession(sessionId)
      if (!session) return
      const response = await apiService.chat(buildHistory(session, assistantMsg.id))
      updateMessage(assistantMsg.id, response, sessionId)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      const errorMsg = error instanceof Error ? error.message : '发生错误'
      updateMessage(assistantMsg.id, `❌ 错误: ${errorMsg}`, sessionId)
    } finally {
      setMessageLoading(assistantMsg.id, false, sessionId)
      isLoading.value = false
      saveSessions()
    }
  }

  /**
   * 流式发送消息（逐字输出）
   */
  const sendMessageStream = async (content: string) => {
    if (!content.trim()) return

    const sessionId = currentSessionId.value || createNewSession()

    addMessage(content, 'user', sessionId)
    const assistantMsg = addMessage('', 'assistant', sessionId)
    setMessageLoading(assistantMsg.id, true, sessionId)

    isLoading.value = true

    try {
      const session = getSession(sessionId)
      if (!session) return
      const history = buildHistory(session, assistantMsg.id)
      await apiService.chatStream(history, (chunk) => {
        const currentContent =
          getSession(sessionId)?.messages.find((m) => m.id === assistantMsg.id)?.content || ''
        updateMessage(assistantMsg.id, currentContent + chunk, sessionId)
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      const errorMsg = error instanceof Error ? error.message : '发生错误'
      updateMessage(assistantMsg.id, `❌ 错误: ${errorMsg}`, sessionId)
    } finally {
      setMessageLoading(assistantMsg.id, false, sessionId)
      isLoading.value = false
      saveSessions()
    }
  }

  /**
   * 取消当前请求
   */
  const abortCurrentRequest = () => {
    apiService.abort()
  }

  const setTheme = (theme: ThemeType) => {
    currentTheme.value = theme
    localStorage.setItem('chatTheme', theme)
  }

  const loadTheme = () => {
    try {
      const savedTheme = localStorage.getItem('chatTheme') as ThemeType | null
      if (savedTheme && THEMES.includes(savedTheme)) {
        currentTheme.value = savedTheme
      }
    } catch {
      // 忽略读取失败
    }
  }

  const updateSessionTitle = (sessionId: string, title: string) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
      saveSessions()
    }
  }

  return {
    // 状态
    sessions,
    currentSessionId,
    currentTheme,
    isLoading,
    // 计算属性
    currentSession,
    messages,
    availableThemes,
    // 方法
    createNewSession,
    deleteSession,
    addMessage,
    updateMessage,
    setMessageLoading,
    deleteMessage,
    clearMessages,
    sendMessage,
    sendMessageStream,
    abortCurrentRequest,
    setTheme,
    loadTheme,
    loadSessions,
    saveSessions,
    updateSessionTitle
  }
})