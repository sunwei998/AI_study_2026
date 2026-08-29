import type {
  AdminModel,
  AdminOverview,
  AdminStats,
  AdminUsage,
  AdminUser,
  DimOption,
  DimTable,
  DimTableCreate,
  DimValue,
  DimValueCreate,
  DimValueList,
  DimValueUpdate,
  HeatPeriod,
  HotWordItem,
  ModelPayload,
  RegionStatsData,
  SettingItem,
  TransferRecord,
  TransferType,
  UserRole,
  UserUpdatePayload
} from '@/types/admin'
import { clearToken, getToken } from './token'
import { notifyUnauthorized } from './unauthorized'
import { i18n } from '@/locales'
import { notifyForbidden } from './forbidden'

const API_BASE = '/api/admin'

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  username?: string
  genders?: string[]
  roles?: string[]
  isActive?: boolean
  enabled?: boolean
  free?: boolean
  providers?: string[]
  sort?: string
  order?: 'asc' | 'desc'
}

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
    const d = body?.detail
    // Pydantic 422 的 detail 是数组，直接透传会变成 [object Object]，统一转成友好文案
    if (Array.isArray(d)) return i18n.global.t('api.validationFailed')
    return typeof d === 'string' ? d : `HTTP ${resp.status}`
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
  if (resp.status === 403) {
    // 权限不足：全局 toast 提醒
    notifyForbidden()
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

export function fetchAdminModels(params: PaginationParams = {}): Promise<PaginatedResult<AdminModel>> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.enabled !== undefined && params.enabled !== null) {
    query.set('enabled', params.enabled ? 'true' : 'false')
  }
  if (params.free !== undefined && params.free !== null) {
    query.set('free', params.free ? 'true' : 'false')
  }
  if (params.providers?.length) query.set('provider', params.providers.join(','))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<{ items: unknown[]; total: number; page: number; pageSize: number }>(
    `/models${qs ? `?${qs}` : ''}`
  ).then((res) => ({
    items: res.items.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ...(row as unknown as AdminModel),
        free: !!row.free,
        vision: !!row.vision,
        supports_search: !!row.supports_search,
        enabled: !!row.enabled,
        is_default: !!row.is_default
      }
    }),
    total: res.total,
    page: res.page,
    pageSize: res.pageSize
  }))
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

export function exportModelsCsv(): Promise<Blob> {
  return fetch(`${API_BASE}/models/export`, { headers: authHeaders() }).then(async (resp) => {
    if (resp.status === 401) {
      clearToken()
      notifyUnauthorized()
      throw new Error('unauthorized')
    }
    if (!resp.ok) throw new Error(await parseError(resp))
    return resp.blob()
  })
}

export function downloadModelTemplate(): Promise<Blob> {
  return fetch(`${API_BASE}/models/template`, { headers: authHeaders() }).then(async (resp) => {
    if (resp.status === 401) {
      clearToken()
      notifyUnauthorized()
      throw new Error('unauthorized')
    }
    if (!resp.ok) throw new Error(await parseError(resp))
    return resp.blob()
  })
}

export interface ModelImportResult {
  ok: boolean
  created: number
  updated: number
  errors: string[]
}

export async function importModelsCsv(file: File): Promise<ModelImportResult> {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(`${API_BASE}/models/import`, { method: 'POST', headers, body: form })
  if (resp.status === 401) {
    clearToken()
    notifyUnauthorized()
    throw new Error('unauthorized')
  }
  if (resp.status === 403) {
    notifyForbidden()
  }
  if (!resp.ok) throw new Error(await parseError(resp))
  return resp.json()
}

export function fetchAdminUsers(params: PaginationParams = {}): Promise<PaginatedResult<AdminUser>> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.username) query.set('username', params.username)
  if (params.genders?.length) query.set('gender', params.genders.join(','))
  if (params.roles?.length) query.set('role', params.roles.join(','))
  if (params.isActive !== undefined && params.isActive !== null) {
    query.set('is_active', params.isActive ? 'true' : 'false')
  }
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<PaginatedResult<AdminUser>>(`/users${qs ? `?${qs}` : ''}`)
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

export function fetchSettings(params: PaginationParams = {}): Promise<PaginatedResult<SettingItem>> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.enabled !== undefined && params.enabled !== null) {
    query.set('enabled', params.enabled ? 'true' : 'false')
  }
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<PaginatedResult<SettingItem>>(`/settings${qs ? `?${qs}` : ''}`)
}

export function updateSetting(key: string, patch: SettingPatch): Promise<{ ok: boolean }> {
  return request(`/settings/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

// ============ 通用维表（dim_tables / dim_values） ============

export function fetchDimTables(): Promise<DimTable[]> {
  return request<DimTable[]>('/dim-tables')
}

export function createDimTable(payload: DimTableCreate): Promise<DimTable> {
  return request<DimTable>('/dim-tables', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDimTable(
  tableId: number,
  payload: { name?: string; description?: string; sort_order?: number }
): Promise<{ ok: boolean }> {
  return request(`/dim-tables/${tableId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteDimTable(tableId: number): Promise<{ ok: boolean }> {
  return request(`/dim-tables/${tableId}`, { method: 'DELETE' })
}

export interface DimValueQuery {
  page?: number
  pageSize?: number
  search?: string
  enabled?: boolean
  sort?: string
  order?: 'asc' | 'desc'
}

export function fetchDimValues(tableId: number, params: DimValueQuery = {}): Promise<PaginatedResult<DimValue>> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.enabled !== undefined && params.enabled !== null) {
    query.set('enabled', params.enabled ? 'true' : 'false')
  }
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<DimValueList>(`/dim-tables/${tableId}/values${qs ? `?${qs}` : ''}`).then((res) => ({
    items: res.items.map((r) => ({ ...r, enabled: !!r.enabled })),
    total: res.total,
    page: res.page,
    pageSize: res.pageSize
  }))
}

export function createDimValue(tableId: number, payload: DimValueCreate): Promise<{ ok: boolean }> {
  return request(`/dim-tables/${tableId}/values`, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDimValue(
  tableId: number,
  valueId: number,
  payload: DimValueUpdate
): Promise<{ ok: boolean }> {
  return request(`/dim-tables/${tableId}/values/${valueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function deleteDimValue(tableId: number, valueId: number): Promise<{ ok: boolean }> {
  return request(`/dim-tables/${tableId}/values/${valueId}`, { method: 'DELETE' })
}

export function fetchDimValuesByCode(code: string): Promise<DimOption[]> {
  return request<DimOption[]>(`/dim-tables/by-code/${encodeURIComponent(code)}/values`)
}

export function fetchHotWords(period: HeatPeriod = 'month', limit = 20): Promise<HotWordItem[]> {
  return request(`/hot-words?period=${period}&limit=${limit}`)
}

export function fetchTransfers(
  type: TransferType,
  params: PaginationParams = {}
): Promise<PaginatedResult<TransferRecord>> {
  const query = new URLSearchParams()
  query.set('type', type)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<PaginatedResult<TransferRecord>>(`/transfers?${qs}`)
}

export function transferDownloadUrl(recordId: number): string {
  return `${API_BASE}/transfers/${recordId}/download`
}

export async function downloadTransfer(recordId: number, filename: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/transfers/${recordId}/download`, { headers: authHeaders() })
  if (resp.status === 401) {
    clearToken()
    notifyUnauthorized()
    throw new Error('unauthorized')
  }
  if (resp.status === 403) {
    notifyForbidden()
    throw new Error(await parseError(resp))
  }
  if (!resp.ok) {
    throw new Error(await parseError(resp))
  }
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type { UserRole }