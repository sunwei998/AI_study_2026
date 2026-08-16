import type { ApiConfig, MessageRole } from '@/types/chat'

export interface ChatHistoryItem {
  role: MessageRole
  content: string
}

interface StreamChunk {
  message?: { content?: string }
  response?: string
  choices?: Array<{ delta?: { content?: string } }>
}

interface ChatResponse {
  message?: { content?: string }
  response?: string
  choices?: Array<{ message?: { content?: string } }>
}

class APIService {
  private config: ApiConfig
  private abortController: AbortController | null = null

  constructor(config: ApiConfig) {
    this.config = config
  }

  /**
   * 请求地址：Ollama 用 /api/chat，OpenAI 兼容用 /chat/completions
   */
  private get endpoint(): string {
    const url = this.config.baseUrl.replace(/\/+$/, '')
    return this.config.provider === 'ollama' ? `${url}/api/chat` : `${url}/chat/completions`
  }

  private buildBody(messages: ChatHistoryItem[], stream: boolean): string {
    const { provider, model, temperature, maxTokens } = this.config
    const body =
      provider === 'ollama'
        ? {
            model,
            messages,
            stream,
            temperature,
            options: { num_predict: maxTokens }
          }
        : {
            model,
            messages,
            stream,
            temperature,
            max_tokens: maxTokens
          }
    return JSON.stringify(body)
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.provider !== 'ollama' && this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`
    }
    return headers
  }

  private assertApiKey(): void {
    if (this.config.provider !== 'ollama' && !this.config.apiKey) {
      throw new Error('未配置 API Key，请在 .env.local 中设置 VITE_LLM_API_KEY')
    }
  }

  /**
   * 解析单个流式数据行（兼容 Ollama NDJSON 与 OpenAI SSE）
   */
  private parseStreamLine(line: string): string {
    const text = line.trim()
    if (!text) return ''
    let json: StreamChunk
    if (text.startsWith('data:')) {
      const data = text.slice(5).trim()
      if (!data || data === '[DONE]') return ''
      json = JSON.parse(data) as StreamChunk
    } else {
      json = JSON.parse(text) as StreamChunk
    }
    // Ollama: { message: { content } }
    if (json.message?.content) return json.message.content
    // OpenAI: { choices: [{ delta: { content } }] }
    const delta = json.choices?.[0]?.delta?.content
    return typeof delta === 'string' ? delta : ''
  }

  /**
   * 解析完整响应（兼容 Ollama / OpenAI）
   */
  private parseResponse(data: ChatResponse): string {
    if (data.message?.content) return data.message.content
    if (data.response) return data.response
    const content = data.choices?.[0]?.message?.content
    return typeof content === 'string' ? content : ''
  }

  /**
   * 调用模型API获取回复（携带历史消息，模型具备上下文记忆）
   * @param messages - 对话历史（含最新用户消息）
   * @returns 模型回复文本
   */
  async chat(messages: ChatHistoryItem[]): Promise<string> {
    this.assertApiKey()
    const controller = new AbortController()
    this.abortController = controller
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildBody(messages, false),
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`)
      }
      return this.parseResponse(await response.json())
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      console.error('API调用失败:', error)
      throw new Error('无法获取AI回复，请检查API连接')
    } finally {
      this.abortController = null
    }
  }

  /**
   * 流式调用（fetch + ReadableStream 逐 chunk 输出）
   * @param messages - 对话历史（含最新用户消息）
   * @param onChunk - 每个数据块的回调
   */
  async chatStream(
    messages: ChatHistoryItem[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    this.assertApiKey()
    const controller = new AbortController()
    this.abortController = controller
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildBody(messages, true),
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`)
      }
      if (!response.body) {
        throw new Error('响应不支持流式读取')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // 按行解析（Ollama 为 NDJSON，OpenAI 为 SSE data: 行）
        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          try {
            const chunk = this.parseStreamLine(line)
            if (chunk) {
              onChunk(chunk)
            }
          } catch {
            // 忽略解析错误的行
          }
          newlineIndex = buffer.indexOf('\n')
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      console.error('流式API调用失败:', error)
      throw new Error('流式获取回复失败')
    } finally {
      this.abortController = null
    }
  }

  /**
   * 取消当前进行中的请求
   */
  abort(): void {
    this.abortController?.abort()
  }

  /**
   * 更新API配置
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ApiConfig {
    return { ...this.config }
  }
}

// 默认配置：SiliconFlow（OpenAI 兼容）。若改用本地 Ollama，把 provider 改为 'ollama'、
// baseUrl 改为 ''（走 vite proxy）或 'http://localhost:11434'，apiKey 留空即可。
const defaultConfig: ApiConfig = {
  provider: 'openai',
  baseUrl: 'https://api.siliconflow.cn/v1',
  model: 'deepseek-ai/DeepSeek-V3',
  apiKey: import.meta.env.VITE_LLM_API_KEY || '',
  temperature: 0.7,
  maxTokens: 2048
}

export default new APIService(defaultConfig)