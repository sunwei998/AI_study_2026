import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser, ProfileUpdatePayload } from '@/types/admin'
import { fetchMe, login as apiLogin, register as apiRegister, updateProfile as apiUpdateProfile } from '@/services/authService'
import { clearToken, getToken, setToken } from '@/services/token'
import { isManagerRole, isSuperAdminRole } from '@/utils/roles'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  /** 管理角色（super_admin / system_admin / model_admin）：可进入管理控制台 */
  const isManager = computed(() => isManagerRole(user.value?.role))
  /** 仅超级管理员 */
  const isSuperAdmin = computed(() => isSuperAdminRole(user.value?.role))

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
    const { token } = await apiLogin(username, password)
    setToken(token)
    user.value = await fetchMe()
    return user.value
  }

  const register = async (username: string, password: string) => {
    const { token } = await apiRegister(username, password)
    setToken(token)
    user.value = await fetchMe()
    return user.value
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
    isManager,
    isSuperAdmin,
    init,
    login,
    register,
    logout,
    updateProfile,
    reset
  }
})