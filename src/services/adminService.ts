import type {
  AdminModel,
  AdminOverview,
  AdminStats,
  AdminUsage,
  AdminUser,
  HeatPeriod,
  HotWordItem,
  ModelPayload,
  RegionStatsData,
  SettingItem,
  UserRole,
  UserUpdatePayload
} from '@/types/admin'
import { clearToken, getToken } from './token'
import { notifyUnauthorized } from './unauthorized'

const API_BASE = '/api/admin'

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function parseError(resp: Response): Promise<string> {
  try {
    const body = await resp.json()
    return body?.detail || `HTTP ${resp.status}`
  } catch {
    return `HTTP ${resp.status}`
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers: authHeaders() })
  if (resp.status === 401) {
    clearToken()
    notifyUnauthorized()
    throw new Error('unauthorized')
  }
  if (!resp.ok) {
    throw new Error(await parseError(resp))
  }
  return resp.json()
}

export function fetchStats(): Promise<AdminStats> {
  return request('/stats')
}

export function fetchOverview(): Promise<AdminOverview> {
  return request('/overview')
}

export function fetchAdminModels(): Promise<AdminModel[]> {
  // 后端 SQLite 的布尔列以整数 0/1 返回，需转成真正的布尔，
  // 否则模板 <input type="checkbox" v-model> 因 looseEqual(value, true) 对 1 判定为 false，
  // 导致编辑表单里 checkbox 无法正确回显（该勾选的反而未勾选）。
  return request<unknown[]>('/models').then((rows) =>
    (rows as Array<Record<string, unknown>>).map((r) => ({
      ...(r as unknown as AdminModel),
      free: !!r.free,
      vision: !!r.vision,
      supports_search: !!r.supports_search,
      enabled: !!r.enabled,
      is_default: !!r.is_default
    }))
  )
}

export function fetchAdminModel(modelId: number): Promise<AdminModel> {
  return request<unknown>(`/models/${modelId}`).then((r) => {
    const row = r as Record<string, unknown>
    return {
      ...(row as unknown as AdminModel),
      free: !!row.free,
      vision: !!row.vision,
      supports_search: !!row.supports_search,
      enabled: !!row.enabled,
      is_default: !!row.is_default
    }
  })
}

export function createAdminModel(payload: ModelPayload): Promise<{ ok: boolean }> {
  return request('/models', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAdminModel(modelId: number, payload: ModelPayload): Promise<{ ok: boolean }> {
  return request(`/models/${modelId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteAdminModel(modelId: number): Promise<{ ok: boolean }> {
  return request(`/models/${modelId}`, { method: 'DELETE' })
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return request('/users')
}

export function fetchAdminUser(userId: number): Promise<AdminUser> {
  return request(`/users/${userId}`)
}

export function updateAdminUser(userId: number, payload: UserUpdatePayload): Promise<{ ok: boolean }> {
  return request(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function resetUserPassword(userId: number, password: string): Promise<{ ok: boolean }> {
  return request(`/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) })
}

export function fetchUsage(): Promise<AdminUsage> {
  return request('/usage')
}

export function fetchRegionStats(period: HeatPeriod = 'month'): Promise<RegionStatsData> {
  return request(`/region-stats?period=${period}`)
}

export interface SettingPatch {
  value?: string
  remark?: string
  enabled?: boolean
}

export function fetchSettings(): Promise<SettingItem[]> {
  return request('/settings')
}

export function updateSetting(key: string, patch: SettingPatch): Promise<{ ok: boolean }> {
  return request(`/settings/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function fetchHotWords(period: HeatPeriod = 'month', limit = 20): Promise<HotWordItem[]> {
  return request(`/hot-words?period=${period}&limit=${limit}`)
}

export type { UserRole }