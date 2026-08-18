import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser } from '@/types/admin'
import { fetchMe, login as apiLogin, register as apiRegister } from '@/services/authService'
import { clearToken, getToken, setToken } from '@/services/token'
import { setUnauthorizedHandler } from '@/services/unauthorized'

export type AppView = 'chat' | 'console'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const view = ref<AppView>('chat')

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const reset = () => {
    clearToken()
    user.value = null
    view.value = 'chat'
  }

  const init = async () => {
    setUnauthorizedHandler(reset)
    if (!getToken()) return
    try {
      user.value = await fetchMe()
    } catch {
      reset()
    }
  }

  const login = async (username: string, password: string) => {
    const { token, user: u } = await apiLogin(username, password)
    setToken(token)
    user.value = u
    return u
  }

  const register = async (username: string, password: string) => {
    const { token, user: u } = await apiRegister(username, password)
    setToken(token)
    user.value = u
    return u
  }

  const logout = () => {
    reset()
  }

  const openConsole = () => {
    view.value = 'console'
  }

  const closeConsole = () => {
    view.value = 'chat'
  }

  return {
    user,
    view,
    isLoggedIn,
    isAdmin,
    init,
    login,
    register,
    logout,
    openConsole,
    closeConsole
  }
})