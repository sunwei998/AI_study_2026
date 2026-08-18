export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export interface AdminModel {
  id: number
  model_key: string
  name: string
  provider: 'openai' | 'ollama'
  free: boolean
  vision: boolean
  enabled: boolean
  sort_order: number
  created_at: number
}

export interface AdminStats {
  users: number
  active_today: number
  active_7d: number
  total_tokens: number
  today_tokens: number
  requests: number
}

export interface AdminUser {
  id: number
  username: string
  role: UserRole
  is_active: boolean
  created_at: number
  last_seen_at: number | null
  logins: number
  total_tokens: number
}

export interface ModelPayload {
  model_key: string
  name: string
  provider: 'openai' | 'ollama'
  free: boolean
  vision: boolean
  enabled: boolean
  sort_order: number
}

export interface UserUpdatePayload {
  is_active?: boolean
  role?: UserRole
}

export interface UsageByUser {
  username: string
  total: number
  prompt: number
  completion: number
  requests: number
}

export interface UsageByModel {
  model_key: string
  requests: number
  prompt: number
  completion: number
  total: number
}

export interface UsageDaily {
  day: number
  requests: number
  total: number
}

export interface AdminUsage {
  by_user: UsageByUser[]
  by_model: UsageByModel[]
  daily: UsageDaily[]
}

export interface SettingItem {
  key: string
  value: string
}