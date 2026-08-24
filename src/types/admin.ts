export type UserRole = 'admin' | 'user'
export type Gender = 'male' | 'female' | 'other'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
  province?: string
  city?: string
  district?: string
  birthday?: string
  age?: number | null
  gender?: string
  avatar?: string
  username_changes_left?: number
}

export interface ProfileUpdatePayload {
  username?: string
  avatar?: string
  birthday?: string
  gender?: string
  province?: string
  city?: string
  district?: string
}

export interface AdminModel {
  id: number
  model_key: string
  name: string
  provider: string
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
  birthday: string
  gender: string
}

export interface ModelPayload {
  model_key: string
  name: string
  provider: string
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
  birthday?: string
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

export interface OverviewDaily {
  day: number
  requests: number
  total: number
}

export interface OverviewHourly {
  hour: number
  requests: number
  total: number
}

export interface OverviewNewUsers {
  day: number
  n: number
}

export interface OverviewTopModel {
  model_key: string
  requests: number
  total: number
}

export interface OverviewTopUser {
  username: string
  avatar: string
  province: string
  city: string
  total: number
  requests: number
}

export interface OverviewTopProvince {
  province: string
  active_users: number
  requests: number
  total_tokens: number
}

export interface OverviewRecentUser {
  username: string
  avatar: string
  province: string
  city: string
  district: string
  created_at: number
}

export interface AdminOverview {
  stats: AdminStats
  daily: OverviewDaily[]
  hourly: OverviewHourly[]
  new_users: OverviewNewUsers[]
  by_model: OverviewTopModel[]
  top_users: OverviewTopUser[]
  top_provinces: OverviewTopProvince[]
  recent_users: OverviewRecentUser[]
  age_dist: UsageDistItem[]
  gender_dist: UsageDistItem[]
}