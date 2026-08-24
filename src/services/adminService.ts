import type {
  AdminModel,
  AdminOverview,
  AdminStats,
  AdminUsage,
  AdminUser,
  HeatPeriod,
  ModelPayload,
  RegionStatsData,
  SettingItem,
  SuggestionItem,
  SuggestionPayload,
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
  return request('/models')
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

export function fetchAdminSuggestions(): Promise<SuggestionItem[]> {
  return request('/suggestions')
}

export function createAdminSuggestion(payload: SuggestionPayload): Promise<{ ok: boolean }> {
  return request('/suggestions', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAdminSuggestion(
  suggestionId: number,
  payload: SuggestionPayload
): Promise<{ ok: boolean }> {
  return request(`/suggestions/${suggestionId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteAdminSuggestion(suggestionId: number): Promise<{ ok: boolean }> {
  return request(`/suggestions/${suggestionId}`, { method: 'DELETE' })
}

export type { UserRole }