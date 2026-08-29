import type { MessageRole, ModelInfo, ChatSession, SessionPatch, ChatStreamMeta, Message, SearchStatus } from '@/types/chat'
import { i18n } from '@/locales'
import { clearToken, getToken } from './token'
import { notifyUnauthorized } from './unauthorized'
import { withAcceptLanguage } from './headers'
import { notifyForbidden } from './forbidden'

export interface ChatHistoryItem {
  role: MessageRole
  content: string
  images?: string[]
}

export interface ChatHotWord {
  word: string
  count: number
}

export interface SessionMessagePage {
  messages: Message[]
  hasMore: boolean
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>
  error?: string
  meta?: ChatStreamMeta
  search?: SearchStatus
}

export interface ChatStreamOptions {
  sessionId?: string
  userMessageId?: string
  assistantMessageId?: string
  onMeta?: (meta: ChatStreamMeta) => void
  onSearch?: (search: SearchStatus) => void
  onReasoning?: (text: string) => void
}

// 超时配置：改为活动/增量超时机制
// 首包等待超时（连接建立后等待首个分片）
const FIRST_CHUNK_TIMEOUT = 30_000
// 活动/空闲超时：收到分片后重置，若在该时间内无新分片则超时。
// 90s 是为了给联网搜索阶段（多源搜索+正文抓取最坏约 50s）留足余量，避免刚搜完就被掐
const IDLE_TIMEOUT = 90_000
// 兜底总超时（极端兜底，防止死锁；长思考 + 长回答模型放宽到 10 分钟）
const MAX_TOTAL_TIMEOUT = 10 * 60_000

const API_BASE = '/api'

/**
 * 通用请求：带 token（若有）
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return withAcceptLanguage(headers)
}

/**
 * 解析单个 SSE 行（后端透传 OpenAI 兼容格式：data: {json}）
 * 返回 null 表示无可解析内容；content 表示增量文本；error 表示错误事件；
 * search 表示联网搜索状态事件；reasoning 表示模型思考过程分片（如 DeepSeek reasoning_content）
 */
function parseStreamLine(
  line: string
): { content: string; error?: string; meta?: ChatStreamMeta; search?: SearchStatus; reasoning?: string } | null {
  const text = line.trim()
  if (!text || !text.startsWith('data:')) return null
  const data = text.slice(5).trim()
  if (!data || data === '[DONE]') return null
  try {
    const json = JSON.parse(data) as StreamChunk
    if (typeof json.error === 'string' && json.error) {
      return { content: '', error: json.error }
    }
    if (json.search && typeof json.search.status === 'string') {
      return { content: '', search: json.search }
    }
    if (json.meta && typeof json.meta.assistant_id === 'string') {
      return { content: '', meta: json.meta }
    }
    const delta = json.choices?.[0]?.delta
    if (!delta) return null
    const content = delta.content
    if (typeof content === 'string' && content) return { content }
    // 思考过程分片：无正文，但必须计为流活动（否则长思考期间被空闲超时误杀）
    const reasoning = delta.reasoning_content
    if (typeof reasoning === 'string' && reasoning) return { content: '', reasoning }
    // 有 delta 但暂无内容（如仅 role 分片）：也视为有效活动
    return { content: '' }
  } catch {
    return null
  }
}

/**
 * 读取模型列表（后端 models 表，管理员可在控制台配置）
 */
export async function fetchModels(): Promise<ModelInfo[]> {
  const resp = await fetch(`${API_BASE}/models`, { headers: withAcceptLanguage() })
  if (!resp.ok) {
    throw new Error(i18n.global.t('api.failed'))
  }
  const data: ModelInfo[] = await resp.json()
  return data
}

async function handleJson(resp: Response): Promise<unknown> {
  if (!resp.ok) {
    if (resp.status === 401) {
      clearToken()
      notifyUnauthorized()
      throw new Error(i18n.global.t('auth.expired'))
    }
    if (resp.status === 403) {
      notifyForbidden()
    }
    let detail = ''
    try {
      const err = await resp.json()
      detail = err?.detail || ''
    } catch {
      // ignore
    }
    throw new Error(detail || i18n.global.t('api.requestFailed', { status: resp.status }))
  }
  return resp.json()
}

function mapSession(raw: Record<string, unknown>): ChatSession {
  return {
    id: String(raw.id),
    title: (raw.title as string) ?? '',
    model: (raw.model as string) ?? '',
    webSearch: !!raw.web_search,
    pinned: !!raw.pinned,
    pinnedAt: (raw.pinned_at as number | null) ?? null,
    createdAt: raw.created_at as number,
    updatedAt: raw.updated_at as number,
    messageCount: (raw.message_count as number) ?? 0,
    lastPreview: (raw.last_preview as string) ?? ''
  }
}

function mapSessionList(raw: unknown): ChatSession[] {
  return Array.isArray(raw) ? raw.map((r) => mapSession(r as Record<string, unknown>)) : []
}

export async function fetchSessions(): Promise<ChatSession[]> {
  return mapSessionList(await handleJson(await fetch(`${API_BASE}/sessions`, { headers: authHeaders() })))
}

export async function createSession(): Promise<ChatSession[]> {
  return mapSessionList(
    await handleJson(
      await fetch(`${API_BASE}/sessions`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({}) })
    )
  )
}

export async function patchSession(sessionId: string, patch: SessionPatch): Promise<ChatSession[]> {
  return mapSessionList(
    await handleJson(
      await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(patch)
      })
    )
  )
}

export async function deleteSession(sessionId: string): Promise<ChatSession[]> {
  return mapSessionList(
    await handleJson(
      await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', headers: authHeaders() })
    )
  )
}

export async function clearSessionMessages(sessionId: string): Promise<ChatSession[]> {
  return mapSessionList(
    await handleJson(
      await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: 'DELETE',
        headers: authHeaders()
      })
    )
  )
}

export async function deleteMessage(sessionId: string, messageId: string): Promise<ChatSession[]> {
  return mapSessionList(
    await handleJson(
      await fetch(
        `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}`,
        { method: 'DELETE', headers: authHeaders() }
      )
    )
  )
}

export async function fetchSessionMessages(
  sessionId: string,
  opts: { beforeId?: string } = {}
): Promise<SessionMessagePage> {
  const params = new URLSearchParams()
  if (opts.beforeId) params.set('before_id', opts.beforeId)
  const qs = params.toString()
  const raw = (await handleJson(
    await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages${qs ? `?${qs}` : ''}`, {
      headers: authHeaders()
    })
  )) as { messages: unknown[]; has_more: boolean }
  return {
    messages: (raw.messages || []) as Message[],
    hasMore: !!raw.has_more
  }
}

/**
 * 对话页推荐词：直接取用户提问高频词 TOP N（不分中英文，语言切换不影响）
 */
export async function fetchChatHotWords(limit = 4): Promise<ChatHotWord[]> {
  const resp = await fetch(`${API_BASE}/hot-words?limit=${limit}`, { headers: withAcceptLanguage() })
  if (!resp.ok) {
    throw new Error(i18n.global.t('api.failed'))
  }
  const data: ChatHotWord[] = await resp.json()
  return data
}

/**
 * 流式调用后端 /api/chat（SSE 逐字输出）
 * @param model - 模型 ID（每个会话独立）
 * @param requestId - 请求唯一标识，用于取消
 * @param options - 会话持久化相关（session_id 与消息 id，由后端落库）
 */
async function chatStream(
  messages: ChatHistoryItem[],
  onChunk: (chunk: string) => void,
  requestId: string,
  model: string,
  webSearch = false,
  options: ChatStreamOptions = {}
): Promise<void> {
  const controller = new AbortController()
  abortControllers.set(requestId, controller)
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model,
        messages,
        web_search: webSearch,
        session_id: options.sessionId,
        user_message_id: options.userMessageId,
        assistant_message_id: options.assistantMessageId
      }),
      signal: controller.signal
    })
    if (!response.ok) {
      if (response.status === 401) {
        clearToken()
        notifyUnauthorized()
        throw new Error(i18n.global.t('auth.expired'))
      }
      let detail = ''
      try {
        const err = await response.json()
        detail = err?.detail || ''
      } catch {
        // ignore
      }
      throw new Error(detail || i18n.global.t('api.requestFailed', { status: response.status }))
    }
    if (!response.body) {
      throw new Error(i18n.global.t('api.noStream'))
    }

    // 超时控制器
    let firstChunkTimer: ReturnType<typeof setTimeout> | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let totalTimer: ReturnType<typeof setTimeout> | undefined
    let firstChunkReceived = false

    const clearAllTimers = () => {
      clearTimeout(firstChunkTimer)
      clearTimeout(idleTimer)
      clearTimeout(totalTimer)
    }

    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT)
    }

    const startFirstChunkTimer = () => {
      firstChunkTimer = setTimeout(() => {
        if (!firstChunkReceived) {
          controller.abort()
        }
      }, FIRST_CHUNK_TIMEOUT)
    }

    const startTotalTimer = () => {
      totalTimer = setTimeout(() => controller.abort(), MAX_TOTAL_TIMEOUT)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      startFirstChunkTimer()
      startTotalTimer()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          const parsed = parseStreamLine(line)
          if (parsed) {
            // 任何有效分片都计为流活动：搜索事件/思考过程/仅 role 分片同样续命，
            // 避免模型长思考（DeepSeek reasoning_content）期间被 60s 空闲超时误杀
            if (!firstChunkReceived) {
              firstChunkReceived = true
              clearTimeout(firstChunkTimer)
            }
            resetIdleTimer()
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.meta) options.onMeta?.(parsed.meta)
            if (parsed.search) options.onSearch?.(parsed.search)
            if (parsed.reasoning) options.onReasoning?.(parsed.reasoning)
            if (parsed.content) onChunk(parsed.content)
          }
          // 无论是否可解析，都必须推进到下一行（否则遇到空行等会原地死循环）
          newlineIndex = buffer.indexOf('\n')
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // 区分是首包超时还是空闲超时，给出更明确的提示
        if (!firstChunkReceived) {
          throw new Error(i18n.global.t('api.timeout') + '（首包等待超时）')
        }
        throw new Error(i18n.global.t('api.timeout') + '（流式传输空闲超时）')
      }
      throw error
    } finally {
      clearAllTimers()
    }
  } finally {
    abortControllers.delete(requestId)
  }
}

/**
 * 非流式调用（重新生成等场景复用流式接口，收集完整内容）
 */
async function chat(
  messages: ChatHistoryItem[],
  requestId: string,
  model: string,
  webSearch = false,
  options: ChatStreamOptions = {}
): Promise<string> {
  let full = ''
  await chatStream(messages, (chunk) => (full += chunk), requestId, model, webSearch, options)
  return full
}

const abortControllers = new Map<string, AbortController>()

export function abortRequest(requestId: string): void {
  abortControllers.get(requestId)?.abort()
}

export default {
  chat,
  chatStream,
  abort: abortRequest,
  fetchModels,
  fetchChatHotWords,
  fetchSessions,
  createSession,
  patchSession,
  deleteSession,
  clearSessionMessages,
  deleteMessage,
  fetchSessionMessages
}