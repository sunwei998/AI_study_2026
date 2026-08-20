import type { MessageRole, ModelInfo, ChatSession, SessionPatch, ChatStreamMeta, Message } from '@/types/chat'
import { i18n } from '@/locales'
import { clearToken, getToken } from './token'
import { notifyUnauthorized } from './unauthorized'

export interface ChatHistoryItem {
  role: MessageRole
  content: string
  images?: string[]
}

export interface ChatSuggestion {
  title_zh: string
  title_en: string
}

export interface SessionMessagePage {
  messages: Message[]
  hasMore: boolean
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string } }>
  error?: string
  meta?: ChatStreamMeta
}

export interface ChatStreamOptions {
  sessionId?: string
  userMessageId?: string
  assistantMessageId?: string
  onMeta?: (meta: ChatStreamMeta) => void
}

const STREAM_TIMEOUT = 90_000

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
  return headers
}

/**
 * 解析单个 SSE 行（后端透传 OpenAI 兼容格式：data: {json}）
 * 返回 null 表示无可解析内容；content 表示增量文本；error 表示错误事件
 */
function parseStreamLine(line: string): { content: string; error?: string; meta?: ChatStreamMeta } | null {
  const text = line.trim()
  if (!text || !text.startsWith('data:')) return null
  const data = text.slice(5).trim()
  if (!data || data === '[DONE]') return null
  try {
    const json = JSON.parse(data) as StreamChunk
    if (typeof json.error === 'string' && json.error) {
      return { content: '', error: json.error }
    }
    if (json.meta && typeof json.meta.assistant_id === 'string') {
      return { content: '', meta: json.meta }
    }
    const delta = json.choices?.[0]?.delta?.content
    return typeof delta === 'string' && delta ? { content: delta } : null
  } catch {
    return null
  }
}

/**
 * 读取模型列表（后端 models 表，管理员可在控制台配置）
 */
export async function fetchModels(): Promise<ModelInfo[]> {
  const resp = await fetch(`${API_BASE}/models`)
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
 * 首页推荐热词（后端可配置，取前 6 条）
 */
export async function fetchSuggestions(): Promise<ChatSuggestion[]> {
  const resp = await fetch(`${API_BASE}/suggestions`)
  if (!resp.ok) {
    throw new Error(i18n.global.t('api.failed'))
  }
  const data: ChatSuggestion[] = await resp.json()
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

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          const parsed = parseStreamLine(line)
          if (parsed?.error) {
            throw new Error(parsed.error)
          }
          if (parsed?.meta) {
            options.onMeta?.(parsed.meta)
          }
          if (parsed?.content) {
            onChunk(parsed.content)
          }
          newlineIndex = buffer.indexOf('\n')
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(i18n.global.t('api.timeout'))
      }
      throw error
    } finally {
      clearTimeout(timeout)
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
  fetchSuggestions,
  fetchSessions,
  createSession,
  patchSession,
  deleteSession,
  clearSessionMessages,
  deleteMessage,
  fetchSessionMessages
}