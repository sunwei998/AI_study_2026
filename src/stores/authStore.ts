import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser, ProfileUpdatePayload } from '@/types/admin'
import { fetchMe, login as apiLogin, register as apiRegister, updateProfile as apiUpdateProfile } from '@/services/authService'
import { clearToken, getToken, setToken } from '@/services/token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  let initPromise: Promise<void> | null = null

  const reset = () => {
    clearToken()
    user.value = null
  }

  const init = async () => {
    if (!initPromise) {
      initPromise = (async () => {
        if (!getToken()) return
        try {
          user.value = await fetchMe()
        } catch {
          reset()
        }
      })()
    }
    return initPromise
  }

  const login = async (username: string, password: string) => {
    const { token, user: u } = await apiLogin(username, password)
    setToken(token)
    user.value = u
    return u
  }

  const register = async (
    username: string,
    password: string,
    region?: { province: string; city: string; district: string },
    age?: number,
    gender?: string
  ) => {
    const { token, user: u } = await apiRegister(username, password, region, age, gender)
    setToken(token)
    user.value = u
    return u
  }

  const logout = () => {
    reset()
  }

  const updateProfile = async (payload: ProfileUpdatePayload) => {
    const updated = await apiUpdateProfile(payload)
    user.value = updated
    return updated
  }

  return {
    user,
    isLoggedIn,
    isAdmin,
    init,
    login,
    register,
    logout,
    updateProfile,
    reset
  }
})