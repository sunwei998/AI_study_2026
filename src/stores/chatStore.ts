import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Message, ChatSession, ThemeType, ModelInfo } from '@/types/chat'
import apiService, { type ChatHistoryItem } from '@/services/apiService'
import { MODEL_LIST } from '@/config/models'
import { i18n } from '@/locales'
import { themes } from '@/styles/themes'
import { useAuthStore } from '@/stores/authStore'

const THEMES: ThemeType[] = Object.keys(themes) as ThemeType[]
const MAX_HISTORY = 20
const DEFAULT_MODEL = 'tencent/Hunyuan-MT-7B'

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore()

  // 状态
  const sessions = ref<ChatSession[]>([])
  const messageCache = ref<Record<string, Message[]>>({})
  const hasMoreMap = ref<Record<string, boolean>>({})
  const loadingOlder = ref<Record<string, boolean>>({})
  const currentSessionId = ref<string>('')
  const currentTheme = ref<ThemeType>('dark')
  const loadingSessions = ref<Record<string, boolean>>({})
  const requestIds = new Map<string, string>()

  // 计算属性
  const currentSession = computed(
    () => sessions.value.find((s) => s.id === currentSessionId.value) ?? null
  )

  // 排序由后端统一决定（置顶最新在前，非置顶最近活跃在前）
  const sortedSessions = computed(() => sessions.value)

  const messages = computed(() => messageCache.value[currentSessionId.value] || [])

  const isLoading = computed(() => {
    return currentSessionId.value ? !!loadingSessions.value[currentSessionId.value] : false
  })

  const isSessionLoading = (sessionId: string) => !!loadingSessions.value[sessionId]

  const setSessionLoading = (sessionId: string, loading: boolean) => {
    const next = { ...loadingSessions.value }
    if (loading) {
      next[sessionId] = true
    } else {
      delete next[sessionId]
    }
    loadingSessions.value = next
  }

  const availableThemes = THEMES

  const availableModels = ref<ModelInfo[]>(MODEL_LIST)

  const loadModels = async () => {
    try {
      const list = await apiService.fetchModels()
      if (list.length) {
        availableModels.value = list
      }
    } catch {
      // 后端不可用时保留本地兜底列表
    }
  }

  const currentModel = computed(() => {
    const session = currentSession.value
    if (session?.model && availableModels.value.some((m) => m.id === session.model)) {
      return session.model
    }
    return DEFAULT_MODEL
  })

  const currentModelInfo = computed(() => {
    return availableModels.value.find((m) => m.id === currentModel.value) || null
  })

  const resolveSessionModel = (session: ChatSession | null): string => {
    if (session?.model && availableModels.value.some((m) => m.id === session.model)) {
      return session.model
    }
    return DEFAULT_MODEL
  }

  const getSession = (sessionId: string): ChatSession | undefined => {
    return sessions.value.find((s) => s.id === sessionId)
  }

  // 服务端列表同步
  const applyList = (list: ChatSession[]) => {
    sessions.value = list
    if (list.length && !list.some((s) => s.id === currentSessionId.value)) {
      currentSessionId.value = list[0].id
    }
  }

  const refreshSessions = async () => {
    try {
      applyList(await apiService.fetchSessions())
    } catch {
      // 保留当前内存数据
    }
  }

  const getMessages = (sessionId?: string): Message[] => {
    const id = sessionId || currentSessionId.value
    if (!id) return []
    if (!messageCache.value[id]) {
      messageCache.value[id] = []
    }
    return messageCache.value[id]
  }

  const loadMessages = async (sessionId: string) => {
    if (messageCache.value[sessionId] || loadingSessions.value[sessionId]) return
    setSessionLoading(sessionId, true)
    try {
      const page = await apiService.fetchSessionMessages(sessionId)
      messageCache.value[sessionId] = page.messages
      hasMoreMap.value[sessionId] = page.hasMore
    } catch {
      messageCache.value[sessionId] = []
      hasMoreMap.value[sessionId] = false
    } finally {
      setSessionLoading(sessionId, false)
    }
  }

  const hasOlderMessages = (sessionId?: string): boolean => {
    const id = sessionId || currentSessionId.value
    return !!hasMoreMap.value[id]
  }

  const isLoadingOlder = (sessionId?: string): boolean => {
    const id = sessionId || currentSessionId.value
    return !!loadingOlder.value[id]
  }

  const loadOlderMessages = async (sessionId?: string) => {
    const id = sessionId || currentSessionId.value
    if (!id) return
    const list = messageCache.value[id]
    if (!list || list.length === 0) return
    if (!hasMoreMap.value[id] || loadingOlder.value[id]) return
    loadingOlder.value[id] = true
    try {
      const page = await apiService.fetchSessionMessages(id, {
        beforeId: list[0].id
      })
      if (page.messages.length) {
        messageCache.value[id] = [...page.messages, ...list]
      }
      hasMoreMap.value[id] = page.hasMore
    } catch {
      // 保持现状，下次滚动再试
    } finally {
      loadingOlder.value[id] = false
    }
  }

  const selectSession = async (sessionId: string) => {
    if (currentSessionId.value === sessionId) return
    currentSessionId.value = sessionId
    await loadMessages(sessionId)
  }

  const init = async () => {
    await auth.init()
    if (!auth.user) return
    try {
      applyList(await apiService.fetchSessions())
    } catch {
      // 未登录或后端不可用时静默
    }
    if (sessions.value.length === 0) {
      await createNewSession()
    } else {
      currentSessionId.value = sessions.value[0].id
      await loadMessages(currentSessionId.value)
    }
  }

  const createNewSession = async () => {
    try {
      const oldIds = new Set(sessions.value.map((s) => s.id))
      const list = await apiService.createSession()
      // 新会话 = 新列表里原来没有的那条（有置顶会话时 list[0] 不一定是新会话）
      const created = Array.isArray(list) ? list.find((s) => !oldIds.has(s.id)) : null
      if (created?.id) {
        // 本地前插 + 同帧切换 currentSessionId：避免整表替换导致列表重排、高亮闪烁
        sessions.value = [created, ...sessions.value.filter((s) => s.id !== created.id)]
        currentSessionId.value = created.id
      } else {
        applyList(list)
      }
    } catch {
      const id = `session_${Date.now()}`
      sessions.value.unshift({
        id,
        title: '',
        model: DEFAULT_MODEL,
        webSearch: false,
        pinned: false,
        pinnedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        lastPreview: ''
      })
      currentSessionId.value = id
    }
    return currentSessionId.value
  }

  const deleteSession = async (sessionId: string) => {
    const requestId = requestIds.get(sessionId)
    if (requestId) {
      apiService.abort(requestId)
      requestIds.delete(sessionId)
      setSessionLoading(sessionId, false)
    }
    delete messageCache.value[sessionId]
    delete hasMoreMap.value[sessionId]
    delete loadingOlder.value[sessionId]
    try {
      applyList(await apiService.deleteSession(sessionId))
    } catch {
      sessions.value = sessions.value.filter((s) => s.id !== sessionId)
    }
    if (sessions.value.length === 0) {
      await createNewSession()
    } else if (!sessions.value.some((s) => s.id === currentSessionId.value)) {
      currentSessionId.value = sessions.value[0].id
      await loadMessages(currentSessionId.value)
    }
  }

  const togglePin = async (sessionId: string) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session) return
    try {
      applyList(await apiService.patchSession(sessionId, { pinned: !session.pinned }))
    } catch {
      // 保留原状态
    }
  }

  const setModel = async (model: ModelInfo) => {
    const session = currentSession.value
    if (!session) return
    // 切到不支持联网搜索的模型时自动关闭搜索开关
    if (session.webSearch && model.supportsSearch === false) {
      try {
        applyList(await apiService.patchSession(session.id, { model: model.id, web_search: false }))
        session.webSearch = false
      } catch {
        session.model = model.id
        session.webSearch = false
      }
      return
    }
    try {
      applyList(await apiService.patchSession(session.id, { model: model.id }))
    } catch {
      session.model = model.id
    }
  }

  const setWebSearch = async (enabled: boolean) => {
    const session = currentSession.value
    if (!session) return
    try {
      applyList(await apiService.patchSession(session.id, { web_search: enabled }))
    } catch {
      session.webSearch = enabled
    }
  }

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      applyList(await apiService.patchSession(sessionId, { title }))
    } catch {
      const session = getSession(sessionId)
      if (session) session.title = title
    }
  }

  // 本地消息操作（乐观更新；最终以服务端落库为准）
  const addMessage = (
    content: string,
    role: Message['role'] = 'user',
    sessionId?: string,
    images?: string[]
  ): Message => {
    const id = sessionId || currentSessionId.value
    if (!id || !getSession(id)) {
      throw new Error('无法定位会话')
    }
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      role,
      timestamp: Date.now(),
      ...(images && images.length ? { images } : {})
    }
    const list = getMessages(id)
    list.push(message)
    const session = getSession(id)
    if (session) {
      session.messageCount += 1
      session.updatedAt = message.timestamp
      session.lastPreview = content.slice(0, 50)
    }
    return message
  }

  const updateMessage = (messageId: string, content: string, sessionId?: string) => {
    const id = sessionId || currentSessionId.value
    const message = getMessages(id).find((m) => m.id === messageId)
    if (message) {
      message.content = content
      const session = getSession(id)
      if (session) {
        session.updatedAt = Date.now()
        session.lastPreview = content.slice(0, 50)
      }
    }
  }

  // 仅更新消息正文，不触碰会话的 lastPreview/updatedAt —— 流式输出高频调用时避免侧栏整块重渲染
  const updateMessageContent = (messageId: string, content: string, sessionId?: string) => {
    const id = sessionId || currentSessionId.value
    const message = getMessages(id).find((m) => m.id === messageId)
    if (message) {
      message.content = content
    }
  }

  const setMessageLoading = (messageId: string, loading: boolean, sessionId?: string) => {
    const id = sessionId || currentSessionId.value
    const message = getMessages(id).find((m) => m.id === messageId)
    if (message) {
      message.loading = loading
    }
  }

  const deleteMessage = async (messageId: string, sessionId?: string) => {
    const id = sessionId || currentSessionId.value
    const list = getMessages(id)
    const idx = list.findIndex((m) => m.id === messageId)
    if (idx >= 0) list.splice(idx, 1)
    const session = getSession(id)
    if (session) session.messageCount = list.length
    try {
      applyList(await apiService.deleteMessage(id, messageId))
    } catch {
      // 忽略
    }
  }

  const clearMessages = async () => {
    const id = currentSessionId.value
    if (!id) return
    messageCache.value[id] = []
    hasMoreMap.value[id] = false
    loadingOlder.value[id] = false
    const session = getSession(id)
    if (session) {
      session.messageCount = 0
      session.lastPreview = ''
      session.updatedAt = Date.now()
    }
    try {
      applyList(await apiService.clearSessionMessages(id))
    } catch {
      // 忽略
    }
  }

  /**
   * 组装发送给模型的对话历史（去除占位助手消息，限制条数防止超长）
   */
  const buildHistory = (sessionId: string, assistantMsgId: string): ChatHistoryItem[] => {
    return getMessages(sessionId)
      .filter((m) => m.id !== assistantMsgId)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content, images: m.images }))
  }

  /**
   * 发送消息并获取AI回复（流式；会话与消息由后端 /api/chat 落库）
   */
  const sendMessageStream = async (content: string, images: string[] = []) => {
    if (!content.trim() && images.length === 0) return

    let sessionId = currentSessionId.value
    if (!sessionId || !getSession(sessionId)) {
      await createNewSession()
      sessionId = currentSessionId.value
    }
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const userMsg = addMessage(content, 'user', sessionId, images)
    const assistantMsg = addMessage('', 'assistant', sessionId)
    // 初始化为搜索状态
    const session = getSession(sessionId)
    if (session?.webSearch) {
      assistantMsg.isSearching = true
      assistantMsg.searchingText = i18n.global.t('chat.searching')
      assistantMsg.searchStartTime = Date.now()
    }
    setMessageLoading(assistantMsg.id, true, sessionId)
    requestIds.set(sessionId, requestId)
    setSessionLoading(sessionId, true)

    try {
      const session = getSession(sessionId)
      if (!session) return
      const history = buildHistory(sessionId, assistantMsg.id)
      let firstChunkReceived = false
      // 流式正文：本地累积，rAF 合帧刷新到消息（避免每个 token 都触发整块重渲染）
      let accContent = ''
      let contentRafId = 0
      const flushContent = () => {
        contentRafId = 0
        updateMessageContent(assistantMsg.id, accContent, sessionId)
      }
      await apiService.chatStream(
        history,
        (chunk) => {
          if (!firstChunkReceived) {
            firstChunkReceived = true
            // 收到第一个分片，切换到正常模式（搜索状态由 onSearch 终态事件负责清理）
            const msg = getMessages(sessionId).find((m) => m.id === assistantMsg.id)
            if (msg?.isSearching) {
              msg.isSearching = false
              msg.searchingText = ''
            }
          }
          accContent += chunk
          if (!contentRafId) contentRafId = requestAnimationFrame(flushContent)
        },
        requestId,
        resolveSessionModel(session),
        session.webSearch,
        {
          sessionId,
          userMessageId: userMsg.id,
          assistantMessageId: assistantMsg.id,
          onSearch: (search) => {
            const msg = getMessages(sessionId).find((m) => m.id === assistantMsg.id)
            if (!msg) return
            if (search.status === 'done') {
              msg.isSearching = false
              msg.searchingText = ''
              msg.searchStatus = search
              msg.citations = search.citations || []
            } else if (
              search.status === 'no_results' ||
              search.status === 'failed' ||
              search.status === 'unsupported'
            ) {
              msg.isSearching = false
              msg.searchingText = ''
              msg.searchStatus = search
            }
            // started 保持 isSearching（本地已显示"联网搜索中..."）
          },
          onReasoning: (text) => {
            const msg = getMessages(sessionId).find((m) => m.id === assistantMsg.id)
            if (!msg) return
            // 思考内容封顶 12K 字符：超长思考若无限拼接是 O(n²) 字符串操作，会把页面拖垮
            const merged = (msg.reasoning || '') + text
            msg.reasoning = merged.length > 12000 ? merged.slice(-12000) : merged
          }
        }
      )
      // 流结束：取消未落帧的刷新，做最终刷新
      if (contentRafId) {
        cancelAnimationFrame(contentRafId)
        contentRafId = 0
      }
      updateMessageContent(assistantMsg.id, accContent, sessionId)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      const errorMsg = error instanceof Error ? error.message : i18n.global.t('common.errorOccurred')
      updateMessage(assistantMsg.id, i18n.global.t('chat.error', { msg: errorMsg }), sessionId)
    } finally {
      // 无论成功/失败/中断，都必须清除搜索状态，避免一直卡在"联网搜索中"
      const msg = getMessages(sessionId).find((m) => m.id === assistantMsg.id)
      if (msg?.isSearching) {
        msg.isSearching = false
        msg.searchingText = ''
      }
      setMessageLoading(assistantMsg.id, false, sessionId)
      setSessionLoading(sessionId, false)
      requestIds.delete(sessionId)
      await refreshSessions()
    }
  }

  const sendMessage = async (content: string, images: string[] = []) => {
    await sendMessageStream(content, images)
  }

  /**
   * 取消当前会话的请求
   */
  const abortCurrentRequest = () => {
    if (!currentSessionId.value) return
    const requestId = requestIds.get(currentSessionId.value)
    if (requestId) {
      apiService.abort(requestId)
    }
  }

  const reset = () => {
    sessions.value = []
    messageCache.value = {}
    hasMoreMap.value = {}
    loadingOlder.value = {}
    currentSessionId.value = ''
    requestIds.clear()
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

  return {
    // 状态
    sessions,
    currentSessionId,
    currentTheme,
    currentModel,
    currentModelInfo,
    availableModels,
    isLoading,
    isSessionLoading,
    // 计算属性
    currentSession,
    sortedSessions,
    messages,
    availableThemes,
    // 方法
    init,
    refreshSessions,
    selectSession,
    createNewSession,
    deleteSession,
    togglePin,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    addMessage,
    updateMessage,
    setMessageLoading,
    deleteMessage,
    clearMessages,
    sendMessage,
    sendMessageStream,
    abortCurrentRequest,
    setModel,
    setWebSearch,
    updateSessionTitle,
    setTheme,
    loadTheme,
    loadModels,
    reset
  }
})
