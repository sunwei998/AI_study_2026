export type MessageRole = 'user' | 'assistant' | 'system'
export type ThemeType =
  | 'dark'
  | 'light'
  | 'neon'
  | 'ocean'
  | 'midnight'
  | 'amber'
  | 'mint'
  | 'sand'
export type ApiProvider = 'ollama' | 'openai'

export interface Message {
  id: string
  content: string
  role: MessageRole
  timestamp: number
  loading?: boolean
  images?: string[]
}

export interface SendPayload {
  content: string
  images: string[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
  model?: string
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
}
