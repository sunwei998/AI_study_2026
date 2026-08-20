export type UserRole = 'admin' | 'user'
export type Gender = 'male' | 'female' | 'other'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
  province?: string
  city?: string
  district?: string
  age?: number | null
  gender?: string
  avatar?: string
  username_changes_left?: number
}

export interface ProfileUpdatePayload {
  username?: string
  avatar?: string
  age?: number | null
  gender?: string
  province?: string
  city?: string
  district?: string
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
  updated_at: number | null
  updated_by: string
  logins: number
  total_tokens: number
  province: string
  city: string
  district: string
  age: number | null
  gender: string
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
  province?: string
  city?: string
  district?: string
  age?: number
  gender?: string
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

export interface UsageDistItem {
  key: string
  count: number
}

export interface AdminUsage {
  by_user: UsageByUser[]
  by_model: UsageByModel[]
  daily: UsageDaily[]
  age_dist: UsageDistItem[]
  gender_dist: UsageDistItem[]
}

export interface SettingItem {
  key: string
  value: string
  remark: string
  enabled: boolean
}

export interface SuggestionItem {
  id: number
  title_zh: string
  title_en: string
  sort_order: number
  enabled: boolean
  created_at: number
}

export interface SuggestionPayload {
  title_zh: string
  title_en: string
  sort_order: number
  enabled: boolean
}

export interface RegionTopUser {
  username: string
  avatar: string
  requests: number
  total_tokens: number
}

export interface RegionStat {
  province: string
  city: string
  district: string
  count: number
  top_users: RegionTopUser[]
}

export type HeatPeriod = 'day' | 'week' | 'month' | 'year'

export interface ProvinceMetric {
  province: string
  new_users: number
  active_users: number
  requests: number
  total_tokens: number
}

export interface RegionStatsData {
  period: HeatPeriod
  provinces: ProvinceMetric[]
  regions: RegionStat[]
}