import type { MessageRole, ModelInfo } from '@/types/chat'
import { i18n } from '@/locales'
import { getToken } from './token'

export interface ChatHistoryItem {
  role: MessageRole
  content: string
  images?: string[]
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string } }>
  error?: string
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
function parseStreamLine(line: string): { content: string; error?: string } | null {
  const text = line.trim()
  if (!text || !text.startsWith('data:')) return null
  const data = text.slice(5).trim()
  if (!data || data === '[DONE]') return null
  try {
    const json = JSON.parse(data) as StreamChunk
    if (typeof json.error === 'string' && json.error) {
      return { content: '', error: json.error }
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

/**
 * 流式调用后端 /api/chat（SSE 逐字输出）
 * @param model - 模型 ID（每个会话独立）
 * @param requestId - 请求唯一标识，用于取消
 */
async function chatStream(
  messages: ChatHistoryItem[],
  onChunk: (chunk: string) => void,
  requestId: string,
  model: string
): Promise<void> {
  const controller = new AbortController()
  abortControllers.set(requestId, controller)
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ model, messages }),
      signal: controller.signal
    })
    if (!response.ok) {
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
async function chat(messages: ChatHistoryItem[], requestId: string, model: string): Promise<string> {
  let full = ''
  await chatStream(messages, (chunk) => (full += chunk), requestId, model)
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
  fetchModels
}