import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, ChatSession, ThemeType } from '@/types/chat'
import apiService from '@/services/apiService'

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

  const availableThemes = computed(() => {
    return ['dark', 'light', 'neon', 'ocean'] as ThemeType[]
  })

  // 方法
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
  }

  const addMessage = (content: string, role: 'user' | 'assistant' = 'user') => {
    if (!currentSession.value) {
      createNewSession()
    }
    const message: Message = {
      id: `msg_${Date.now()}`,
      content,
      role,
      timestamp: Date.now()
    }
    if (currentSession.value) {
      currentSession.value.messages.push(message)
      currentSession.value.updatedAt = Date.now()
    }
    return message
  }

  const updateMessage = (messageId: string, content: string) => {
    if (currentSession.value) {
      const message = currentSession.value.messages.find((m) => m.id === messageId)
      if (message) {
        message.content = content
        currentSession.value.updatedAt = Date.now()
      }
    }
  }

  const setMessageLoading = (messageId: string, loading: boolean) => {
    if (currentSession.value) {
      const message = currentSession.value.messages.find((m) => m.id === messageId)
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
    }
  }

  const clearMessages = () => {
    if (currentSession.value) {
      currentSession.value.messages = []
      currentSession.value.updatedAt = Date.now()
    }
  }

  /**
   * 发送消息并获取AI回复
   */
  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    // 添加用户消息
    addMessage(content, 'user')

    // 创建加载中的助手消息
    const assistantMsg = addMessage('', 'assistant')
    setMessageLoading(assistantMsg.id, true)

    isLoading.value = true

    try {
      // 调用API
      const response = await apiService.chat(content)
      updateMessage(assistantMsg.id, response)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发生错误'
      updateMessage(assistantMsg.id, `❌ 错误: ${errorMsg}`)
    } finally {
      setMessageLoading(assistantMsg.id, false)
      isLoading.value = false
    }
  }

  /**
   * 流式发送消息
   */
  const sendMessageStream = async (content: string) => {
    if (!content.trim()) return

    // 添加用户消息
    addMessage(content, 'user')

    // 创建加载中的助手消息
    const assistantMsg = addMessage('', 'assistant')
    setMessageLoading(assistantMsg.id, true)

    isLoading.value = true

    try {
      // 流式调用API
      await apiService.chatStream(content, (chunk) => {
        const currentContent = assistantMsg.content
        updateMessage(assistantMsg.id, currentContent + chunk)
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发生错误'
      updateMessage(assistantMsg.id, `❌ 错误: ${errorMsg}`)
    } finally {
      setMessageLoading(assistantMsg.id, false)
      isLoading.value = false
    }
  }

  const setTheme = (theme: ThemeType) => {
    currentTheme.value = theme
    localStorage.setItem('chatTheme', theme)
  }

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('chatTheme') as ThemeType | null
    if (savedTheme && availableThemes.value.includes(savedTheme)) {
      currentTheme.value = savedTheme
    }
  }

  const loadSessions = () => {
    const saved = localStorage.getItem('chatSessions')
    if (saved) {
      sessions.value = JSON.parse(saved)
      if (sessions.value.length > 0 && !currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id
      }
    }
    if (sessions.value.length === 0) {
      createNewSession()
    }
  }

  const saveSessions = () => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions.value))
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
    setTheme,
    loadTheme,
    loadSessions,
    saveSessions,
    updateSessionTitle
  }
})
