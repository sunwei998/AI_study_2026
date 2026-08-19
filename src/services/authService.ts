import type { AuthUser } from '@/types/admin'
import { clearToken, getToken } from './token'
import { notifyUnauthorized } from './unauthorized'

const API_BASE = '/api'

function bearerHeaders(): Record<string, string> {
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

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!resp.ok) {
    throw new Error(await parseError(resp))
  }
  return resp.json()
}

export async function register(
  username: string,
  password: string,
  region?: { province: string; city: string; district: string }
): Promise<{ token: string; user: AuthUser }> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      province: region?.province ?? '',
      city: region?.city ?? '',
      district: region?.district ?? ''
    })
  })
  if (!resp.ok) {
    throw new Error(await parseError(resp))
  }
  return resp.json()
}

export async function fetchMe(): Promise<AuthUser> {
  const resp = await fetch(`${API_BASE}/auth/me`, { headers: bearerHeaders() })
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