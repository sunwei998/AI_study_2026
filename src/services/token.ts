// JWT token 存取（P3 登录页会在此基础上扩展 authStore）
const KEY = 'chatToken'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
}