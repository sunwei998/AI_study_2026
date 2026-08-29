export type MessageRole = 'user' | 'assistant' | 'system'
export type ThemeType =
  | 'dark'
  | 'light'
  | 'neon'
  | 'magenta'
  | 'midnight'
  | 'amber'
  | 'mint'
  | 'sand'
export type ApiProvider = 'ollama' | 'openai'

export interface Citation {
  title: string
  link: string
  source?: string
}

export interface SearchStatus {
  status: 'started' | 'done' | 'no_results' | 'failed' | 'unsupported'
  query?: string
  count?: number
  duration_ms?: number
  sources?: string[]
  error?: string
  citations?: Citation[]
}

export interface Message {
  id: string
  content: string
  role: MessageRole
  timestamp: number
  loading?: boolean
  images?: string[]
  isSearching?: boolean
  searchingText?: string
  searchStartTime?: number
  searchStatus?: SearchStatus
  citations?: Citation[]
  /** 模型思考过程（DeepSeek 等 reasoning_content 流式拼接，仅当前会话内存展示） */
  reasoning?: string
}

export interface SendPayload {
  content: string
  images: string[]
}

export interface ChatSession {
  id: string
  title: string
  model: string
  webSearch: boolean
  pinned: boolean
  pinnedAt: number | null
  createdAt: number
  updatedAt: number
  messageCount: number
  lastPreview: string
}

export interface SessionPatch {
  title?: string
  model?: string
  web_search?: boolean
  pinned?: boolean
}

export interface ChatStreamMeta {
  assistant_id: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ThemeConfig {
  name: ThemeType
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  border: string
  glass: string
  overlay: string
  grid: string
  glow: string
  glassEdge: string
  glassSheen: string
  success: string
  warning: string
  danger: string
}

export interface ApiConfig {
  provider: ApiProvider
  baseUrl: string
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
}

export interface ModelInfo {
  id: string
  name: string
  free: boolean
  vision?: boolean
  /** 是否支持联网搜索（后端 models.supports_search，默认 true） */
  supportsSearch?: boolean
  /** 是否为后台配置的默认模型（后端 models.is_default） */
  is_default?: boolean
}
