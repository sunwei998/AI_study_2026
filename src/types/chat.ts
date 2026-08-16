export type MessageRole = 'user' | 'assistant' | 'system'
export type ThemeType = 'dark' | 'light' | 'neon' | 'ocean'
export type ApiProvider = 'ollama' | 'openai'

export interface Message {
  id: string
  content: string
  role: MessageRole
  timestamp: number
  loading?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
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
}

export interface ApiConfig {
  provider: ApiProvider
  baseUrl: string
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
}
