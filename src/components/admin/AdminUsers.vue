<template>
  <div class="admin-users">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
    </div>

    <div v-else class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>{{ $t('console.username') }}</th>
            <th>{{ $t('console.role') }}</th>
            <th>{{ $t('console.enabled') }}</th>
            <th>{{ $t('console.logins') }}</th>
            <th>{{ $t('console.totalTokens') }}</th>
            <th>{{ $t('console.lastSeen') }}</th>
            <th>{{ $t('console.createdAt') }}</th>
            <th>{{ $t('console.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="cell-user">
              {{ u.username }}
              <span v-if="u.id === auth.user?.id" class="self-tag">{{ $t('console.self') }}</span>
            </td>
            <td>
              <span class="role-badge" :class="u.role === 'admin' ? 'role-admin' : 'role-user'">
                {{ u.role }}
              </span>
            </td>
            <td>
              <button
                class="toggle"
                :class="{ on: u.is_active }"
                :disabled="u.id === auth.user?.id"
                :title="u.is_active ? $t('console.disable') : $t('console.enable')"
                @click="askToggleActive(u)"
              >
                <span class="toggle-knob"></span>
              </button>
            </td>
            <td class="cell-num">{{ u.logins }}</td>
            <td class="cell-num">{{ formatNum(u.total_tokens) }}</td>
            <td class="cell-time">{{ formatTime(u.last_seen_at) }}</td>
            <td class="cell-time">{{ formatTime(u.created_at) }}</td>
            <td>
              <div class="row-actions">
                <button class="row-btn" :title="$t('console.roleSwitch')" @click="askToggleRole(u)">
                  <AppIcon
                    :name="u.role === 'admin' ? 'lucide:user' : 'lucide:shield'"
                    :size="15"
                  />
                </button>
                <button
                  class="row-btn"
                  :title="$t('console.resetPassword')"
                  @click="openResetPassword(u)"
                >
                  <AppIcon name="lucide:key-round" :size="15" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="8" class="cell-empty">{{ $t('console.noUsers') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="resetVisible" class="form-overlay" @click.self="resetVisible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ $t('console.resetPassword') }} — {{ resetUser?.username }}</h3>

            <form class="form-body" @submit.prevent="submitReset">
              <label class="form-field">
                <span class="form-label">{{ $t('auth.newPassword') }}</span>
                <input v-model="newPassword" type="password" class="form-input" autocomplete="new-password" />
              </label>

              <p v-if="resetError" class="form-error">{{ resetError }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="resetVisible = false">
                  {{ $t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="resetSubmitting">
                  <AppLoading v-if="resetSubmitting" :size="14" color="#fff" glow />
                  {{ $t('confirm.confirm') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmModal
      v-model:visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirming="confirmLoading"
      :danger="confirmDanger"
      @confirm="doConfirm"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminUser, UserRole } from '@/types/admin'
import { fetchAdminUsers, resetUserPassword, updateAdminUser } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    users.value = await fetchAdminUsers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function formatTime(ms: number | null): string {
  if (!ms) return '-'
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmDanger = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmAction: (() => Promise<void>) | null = null

const openConfirm = (title: string, message: string, action: () => Promise<void>, danger = true) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction = action
  confirmDanger.value = danger
  confirmVisible.value = true
}

const doConfirm = async () => {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    confirmVisible.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
    confirmVisible.value = false
  } finally {
    confirmLoading.value = false
  }
}

const askToggleActive = (u: AdminUser) => {
  const target = !u.is_active
  openConfirm(
    target ? t('console.enableUserTitle') : t('console.disableUserTitle'),
    t(target ? 'console.enableUserMessage' : 'console.disableUserMessage', { name: u.username }),
    async () => {
      await updateAdminUser(u.id, { is_active: target })
      u.is_active = target
    }
  )
}

const askToggleRole = (u: AdminUser) => {
  const target: UserRole = u.role === 'admin' ? 'user' : 'admin'
  openConfirm(
    t('console.roleSwitch'),
    t('console.roleSwitchMessage', { name: u.username, role: target }),
    async () => {
      await updateAdminUser(u.id, { role: target })
      u.role = target
    },
    false
  )
}

const resetVisible = ref(false)
const resetSubmitting = ref(false)
const resetError = ref('')
const resetUser = ref<AdminUser | null>(null)
const newPassword = ref('')

const openResetPassword = (u: AdminUser) => {
  resetUser.value = u
  newPassword.value = ''
  resetError.value = ''
  resetVisible.value = true
}

const submitReset = async () => {
  if (resetSubmitting.value || !resetUser.value) return
  resetError.value = ''
  if (newPassword.value.length < 6) {
    resetError.value = t('auth.passwordTooShort')
    return
  }
  resetSubmitting.value = true
  try {
    await resetUserPassword(resetUser.value.id, newPassword.value)
    resetVisible.value = false
  } catch (err) {
    resetError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    resetSubmitting.value = false
  }
}
</script>

<style scoped>
.admin-users {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.page-error {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 77, 94, 0.1);
  border: 1px solid rgba(255, 77, 94, 0.4);
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
}

.page-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.users-table-wrap {
  flex: 1;
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 40%, transparent) transparent;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 14px;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  background: var(--color-glass);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.users-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.users-table tbody tr:hover {
  background: var(--color-glass);
}

.cell-user {
  font-weight: 500;
}

.cell-num {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.cell-time {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.cell-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 32px !important;
}

.self-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  background: var(--color-glass);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.role-badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 11px;
}

.role-admin {
  background: rgba(255, 183, 77, 0.15);
  border: 1px solid #ffb74d;
  color: #ffb74d;
}

.role-user {
  background: var(--color-glass);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  position: relative;
  cursor: pointer;
  transition: var(--transition-fast);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.toggle.on {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.toggle.on .toggle-knob {
  left: 18px;
  background: #fff;
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.row-actions {
  display: flex;
  gap: 6px;
}

.row-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.row-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.form-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.form-modal {
  position: relative;
  width: min(420px, 100%);
  padding: 26px 26px 22px;
  background: var(--color-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 40px var(--color-glow);
}

.form-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.7;
}

.form-title {
  margin: 0 0 20px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 16px var(--color-glow);
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.form-input {
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  transition: var(--transition-normal);
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.form-error {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: #ff5b6a;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.form-btn {
  flex: 1;
  height: 40px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: var(--transition-fast);
}

.form-btn--ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.form-btn--ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
  box-shadow: 0 0 10px var(--color-glow);
}

.form-btn--primary {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 6px 18px var(--color-glow);
}

.form-btn--primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.form-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.confirm-enter-active {
  transition: opacity 0.25s ease;
}

.confirm-enter-active .form-modal {
  transition:
    transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-leave-active .form-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-enter-from {
  opacity: 0;
}

.confirm-enter-from .form-modal {
  transform: translateY(16px) scale(0.92);
  opacity: 0;
}

.confirm-leave-to {
  opacity: 0;
}

.confirm-leave-to .form-modal {
  transform: translateY(8px) scale(0.96);
  opacity: 0;
}
</style>