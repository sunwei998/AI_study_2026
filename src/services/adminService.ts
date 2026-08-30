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
import { withAcceptLanguage } from './headers'

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
  vision?: boolean
  supportsSearch?: boolean
  name?: string
  modelKey?: string
  statuses?: string[]
  usernames?: string[]
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
  return withAcceptLanguage(headers)
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

/** 对象转 query string：跳过 undefined/null/空串 */
function qsFrom(obj: object): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  return q.toString()
}

/** GET 获取二进制流（导出 / 模板下载共用） */
async function fetchBlob(path: string): Promise<Blob> {
  const resp = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  if (resp.status === 401) {
    clearToken()
    notifyUnauthorized()
    throw new Error('unauthorized')
  }
  if (resp.status === 403) {
    notifyForbidden()
  }
  if (!resp.ok) throw new Error(await parseError(resp))
  return resp.blob()
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
  if (params.name) query.set('name', params.name)
  if (params.modelKey) query.set('model_key', params.modelKey)
  if (params.enabled !== undefined && params.enabled !== null) {
    query.set('enabled', params.enabled ? 'true' : 'false')
  }
  if (params.free !== undefined && params.free !== null) {
    query.set('free', params.free ? 'true' : 'false')
  }
  if (params.vision !== undefined && params.vision !== null) {
    query.set('vision', params.vision ? 'true' : 'false')
  }
  if (params.supportsSearch !== undefined && params.supportsSearch !== null) {
    query.set('supports_search', params.supportsSearch ? 'true' : 'false')
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

/** 导出范围：filtered = 当前筛选与排序；all = 全量 */
export interface ExportScopeParam {
  scope: 'filtered' | 'all'
}

/** 模型导出参数：与列表筛选/排序一致 */
export interface ModelsExportParams extends ExportScopeParam {
  search?: string
  name?: string
  model_key?: string
  enabled?: string
  free?: string
  vision?: string
  supports_search?: string
  provider?: string
  sort?: string
  order?: string
}

export function exportModelsCsv(params: ModelsExportParams): Promise<Blob> {
  return fetchBlob(`/models/export?${qsFrom(params)}`)
}

/** 导出面板"全部数据量"：不受筛选影响的模型总数 */
export function fetchModelsTotal(): Promise<number> {
  return request<{ total: number }>('/models/count').then((r) => r.total)
}

export function downloadModelTemplate(): Promise<Blob> {
  return fetchBlob('/models/template')
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
  withAcceptLanguage(headers)
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

export interface ModelUniquenessResult {
  model_key_exists: boolean
  name_exists: boolean
  name_en_exists: boolean
}

/** 失焦轻量查重：model_key 同提供商内唯一；name / name_en 全局唯一；exclude_id 编辑时排除自身 */
export function checkModelUniqueness(params: {
  model_key?: string
  name?: string
  name_en?: string
  provider?: string
  exclude_id?: number
}): Promise<ModelUniquenessResult> {
  const q = new URLSearchParams()
  if (params.model_key) q.set('model_key', params.model_key)
  if (params.name) q.set('name', params.name)
  if (params.name_en) q.set('name_en', params.name_en)
  if (params.provider) q.set('provider', params.provider)
  if (params.exclude_id) q.set('exclude_id', String(params.exclude_id))
  return request<ModelUniquenessResult>(`/models/check?${q.toString()}`)
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

export function deleteUser(userId: number): Promise<{ ok: boolean }> {
  return request(`/users/${userId}`, { method: 'DELETE' })
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

export interface SettingLogItem {
  id: number
  setting_key: string
  content: string
  operator: string
  created_at: number
}

export function deleteSetting(key: string): Promise<{ ok: boolean }> {
  return request(`/settings/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

/** 设置导出参数：与列表筛选/排序一致 */
export interface SettingsExportParams extends ExportScopeParam {
  search?: string
  enabled?: string
  sort?: string
  order?: string
}

export function exportSettings(params: SettingsExportParams): Promise<Blob> {
  return fetchBlob(`/settings/export?${qsFrom(params)}`)
}

/** 导出面板"全部数据量"：不受筛选影响的配置项总数 */
export function fetchSettingsTotal(): Promise<number> {
  return request<{ total: number }>('/settings/count').then((r) => r.total)
}

export function downloadSettingsTemplate(): Promise<Blob> {
  return fetch(`${API_BASE}/settings/template`, { headers: authHeaders() }).then(async (resp) => {
    if (resp.status === 401) {
      clearToken()
      notifyUnauthorized()
      throw new Error('unauthorized')
    }
    if (!resp.ok) throw new Error(await parseError(resp))
    return resp.blob()
  })
}

export interface SettingsImportResult {
  ok: boolean
  created: number
  updated: number
  errors: string[]
}

export async function importSettings(file: File): Promise<SettingsImportResult> {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  withAcceptLanguage(headers)
  const resp = await fetch(`${API_BASE}/settings/import`, { method: 'POST', headers, body: form })
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

export interface OperationLogItem {
  id: number
  entity: string
  entity_id: number
  content: string
  operator: string
  created_at: number
}

export function fetchOperationLogs(
  entity: string,
  entityId: number,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<OperationLogItem>> {
  const query = new URLSearchParams()
  query.set('entity', entity)
  query.set('entity_id', String(entityId))
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  return request<PaginatedResult<OperationLogItem>>(`/operation-logs?${query.toString()}`)
}

/** 用户导出参数：与列表筛选/排序一致 */
export interface UsersExportParams extends ExportScopeParam {
  search?: string
  username?: string
  gender?: string
  role?: string
  is_active?: string
  sort?: string
  order?: string
}

export function exportUsers(params: UsersExportParams): Promise<Blob> {
  return fetchBlob(`/users/export?${qsFrom(params)}`)
}

/** 导出面板"全部数据量"：不受筛选影响的用户总数 */
export function fetchUsersTotal(): Promise<number> {
  return request<{ total: number }>('/users/count').then((r) => r.total)
}

export function fetchSettingLogs(
  key: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<SettingLogItem>> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  const qs = query.toString()
  return request<PaginatedResult<SettingLogItem>>(
    `/settings/${encodeURIComponent(key)}/logs${qs ? `?${qs}` : ''}`
  )
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

/** 维表取值导出参数：与列表筛选/排序一致 */
export interface DimValuesExportParams extends ExportScopeParam {
  search?: string
  enabled?: string
  sort?: string
  order?: string
}

/** 导出维表取值为 xlsx（scope=filtered 按当前筛选与排序） */
export function exportDimValues(tableId: number, params: DimValuesExportParams): Promise<Blob> {
  return fetchBlob(`/dim-tables/${tableId}/export?${qsFrom(params)}`)
}

/** 导出面板"全部数据量"：不受筛选影响的维表取值总数 */
export function fetchDimValuesTotal(tableId: number): Promise<number> {
  return request<{ total: number }>(`/dim-tables/${tableId}/values/count`).then((r) => r.total)
}

/** 下载某维表的导入模板 xlsx */
export function downloadDimTemplate(tableId: number): Promise<Blob> {
  return fetch(`${API_BASE}/dim-tables/${tableId}/template`, { headers: authHeaders() }).then(async (resp) => {
    if (resp.status === 401) {
      clearToken()
      notifyUnauthorized()
      throw new Error('unauthorized')
    }
    if (!resp.ok) throw new Error(await parseError(resp))
    return resp.blob()
  })
}

export interface DimImportResult {
  ok: boolean
  created: number
  updated: number
  errors: string[]
}

/** 从 xlsx 批量导入维表取值（同表 code 已存在则更新，否则新增） */
export async function importDimValues(tableId: number, file: File): Promise<DimImportResult> {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  withAcceptLanguage(headers)
  const resp = await fetch(`${API_BASE}/dim-tables/${tableId}/import`, {
    method: 'POST',
    headers,
    body: form
  })
  if (resp.status === 401) {
    clearToken()
    notifyUnauthorized()
    throw new Error('unauthorized')
  }
  if (!resp.ok) throw new Error(await parseError(resp))
  return resp.json()
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
): Promise<PaginatedResult<TransferRecord> & { retention_hours?: number; export_retention_hours?: number }> {
  const query = new URLSearchParams()
  query.set('type', type)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('page_size', String(params.pageSize))
  if (params.statuses?.length) query.set('status', params.statuses.join(','))
  if (params.usernames?.length) query.set('username', params.usernames.join(','))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  return request<PaginatedResult<TransferRecord> & { retention_hours?: number; export_retention_hours?: number }>(`/transfers?${qs}`)
}

export function deleteTransfer(recordId: number): Promise<{ ok: boolean }> {
  return request(`/transfers/${recordId}`, { method: 'DELETE' })
}

/** 所有管理员用户名列表（供导入/导出记录的操作人筛选下拉框） */
export function fetchAdmins(): Promise<string[]> {
  return request<string[]>('/admins')
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
