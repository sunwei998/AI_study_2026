<template>
  <div class="admin-users">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <TableLoading :rows="8" :cols="6" :text="$t('common.loading')" />
    </div>

    <div v-else class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>{{ $t('console.username') }}</th>
            <th>{{ $t('console.role') }}</th>
            <th>{{ $t('console.birthday') }}</th>
            <th>{{ $t('console.gender') }}</th>
            <th>{{ $t('console.enabled') }}</th>
            <th>{{ $t('console.region') }}</th>
            <th>{{ $t('console.logins') }}</th>
            <th>{{ $t('console.totalTokens') }}</th>
            <th>{{ $t('console.lastSeen') }}</th>
            <th>{{ $t('console.createdAt') }}</th>
            <th>{{ $t('console.updatedAt') }}</th>
            <th>{{ $t('console.updatedBy') }}</th>
            <th class="actions-th">{{ $t('console.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pagedUsers" :key="u.id">
            <td class="cell-user">
              {{ u.username }}
              <span v-if="u.id === auth.user?.id" class="self-tag">{{ $t('console.self') }}</span>
            </td>
            <td>
              <span class="role-badge" :class="u.role === 'admin' ? 'role-admin' : 'role-user'">
                {{ u.role }}
              </span>
            </td>
            <td class="cell-num">{{ u.birthday || '-' }}</td>
            <td>{{ genderLabel(u.gender) }}</td>
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
            <td class="cell-region">{{ formatRegion(u) }}</td>
            <td class="cell-num">{{ u.logins }}</td>
            <td class="cell-num">{{ formatNum(u.total_tokens) }}</td>
            <td class="cell-time">{{ formatTime(u.last_seen_at) }}</td>
            <td class="cell-time">{{ formatTime(u.created_at) }}</td>
            <td class="cell-time">{{ formatTime(u.updated_at) }}</td>
            <td class="cell-time">{{ u.updated_by || '-' }}</td>
            <td class="actions-td">
              <div class="row-actions">
                <button class="row-btn" :title="$t('console.roleSwitch')" @click="askToggleRole(u)">
                  <AppIcon
                    :name="u.role === 'admin' ? 'lucide:user' : 'lucide:shield'"
                    :size="15"
                  />
                </button>
                <button
                  class="row-btn"
                  :title="$t('console.editProfile')"
                  @click="openEditRegion(u)"
                >
                  <AppIcon name="lucide:pencil" :size="15" />
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
            <td colspan="13" class="cell-empty">{{ $t('console.noUsers') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      :total="users.length"
      v-model:page="currentPage"
      v-model:page-size="pageSize"
    />

    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="regionVisible" class="form-overlay" @click.self="regionVisible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ $t('console.editProfile') }} — {{ regionUser?.username }}</h3>

            <div class="form-body">
              <div class="form-stack">
                <div class="form-field">
                  <span class="form-label">{{ $t('console.birthday') }}</span>
                  <DatePicker
                    v-model="editBirthday"
                    :max="maxBirthday"
                    :placeholder="$t('profile.birthdayPlaceholder')"
                  />
                </div>
                <div class="form-field">
                  <span class="form-label">{{ $t('console.gender') }}</span>
                  <div class="form-gender">
                    <button
                      v-for="g in genderOptions"
                      :key="g.value"
                      type="button"
                      class="form-gender-option"
                      :class="{ active: editGender === g.value }"
                      @click="editGender = g.value"
                    >
                      {{ g.label }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="region-preview" v-if="regionPreview">{{ regionPreview }}</div>
              <RegionSelect v-model="regionValue" vertical />
              <p v-if="regionError" class="form-error">{{ regionError }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="regionVisible = false">
                  {{ $t('confirm.cancel') }}
                </button>
                <button
                  type="button"
                  class="form-btn form-btn--primary"
                  :disabled="regionSubmitting"
                  @click="submitRegion"
                >
                  <AppLoading v-if="regionSubmitting" :size="14" color="#fff" glow />
                  {{ $t('confirm.ok') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
                  {{ $t('console.resetPasswordConfirm') }}
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminUser, UserRole, UserUpdatePayload } from '@/types/admin'
import { fetchAdminUser, fetchAdminUsers, resetUserPassword, updateAdminUser } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import TableLoading from '@/components/common/TableLoading.vue'
import Pagination from '@/components/common/Pagination.vue'
import RegionSelect, { type RegionValue } from '@/components/common/RegionSelect.vue'
import DatePicker from '@/components/common/DatePicker.vue'

const { t } = useI18n()
const auth = useAuthStore()
const { showToast } = useToast()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')

const currentPage = ref(1)
const pageSize = ref(10)

const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return users.value.slice(start, start + pageSize.value)
})

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatRegion(u: AdminUser): string {
  const parts = [u.province, u.city, u.district].filter(Boolean)
  return parts.length ? parts.join('') : '-'
}

const genderOptions = [
  { value: 'male', label: t('auth.genderMale') },
  { value: 'female', label: t('auth.genderFemale') },
  { value: 'other', label: t('auth.genderOther') }
]

function genderLabel(gender: string): string {
  if (!gender) return '-'
  const opt = genderOptions.find((o) => o.value === gender)
  return opt ? opt.label : gender
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
      touchUpdated(u)
      showToast(target ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
    }
  )
}

const touchUpdated = (u: AdminUser) => {
  u.updated_at = Date.now()
  u.updated_by = auth.user?.username ?? ''
}

const askToggleRole = (u: AdminUser) => {
  const target: UserRole = u.role === 'admin' ? 'user' : 'admin'
  openConfirm(
    t('console.roleSwitch'),
    t('console.roleSwitchMessage', { name: u.username, role: target }),
    async () => {
      await updateAdminUser(u.id, { role: target })
      u.role = target
      touchUpdated(u)
      showToast(t('console.roleUpdated'), 'success')
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
    showToast(t('console.passwordUpdated'), 'success')
  } catch (err) {
    resetError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    resetSubmitting.value = false
  }
}

const regionVisible = ref(false)
const regionSubmitting = ref(false)
const regionError = ref('')
const regionUser = ref<AdminUser | null>(null)
const regionValue = ref<RegionValue>({ province: '', city: '', district: '' })
const editBirthday = ref('')
const editGender = ref('')

const maxBirthday = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})

const regionPreview = computed(() => {
  const v = regionValue.value
  const parts = [v.province, v.city, v.district].filter(Boolean)
  return parts.join('')
})

const openEditRegion = async (u: AdminUser) => {
  regionUser.value = u
  regionError.value = ''
  regionVisible.value = true
  try {
    const detail = await fetchAdminUser(u.id)
    regionValue.value = {
      province: detail.province || '',
      city: detail.city || '',
      district: detail.district || ''
    }
    editBirthday.value = detail.birthday || ''
    editGender.value = detail.gender || ''
    regionUser.value = detail
  } catch (err) {
    regionError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  }
}

const submitRegion = async () => {
  if (regionSubmitting.value || !regionUser.value) return
  regionError.value = ''
  if (!regionValue.value.province || !regionValue.value.city || !regionValue.value.district) {
    regionError.value = t('auth.regionRequired')
    return
  }
  const birthday = editBirthday.value
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    regionError.value = t('profile.birthdayInvalid')
    return
  }
  regionSubmitting.value = true
  try {
    const payload: UserUpdatePayload = {
      province: regionValue.value.province,
      city: regionValue.value.city,
      district: regionValue.value.district,
      gender: editGender.value || undefined
    }
    if (birthday) payload.birthday = birthday
    await updateAdminUser(regionUser.value.id, payload)
    const u = regionUser.value
    u.province = regionValue.value.province
    u.city = regionValue.value.city
    u.district = regionValue.value.district
    u.birthday = birthday || u.birthday
    u.gender = editGender.value
    touchUpdated(u)
    regionVisible.value = false
    showToast(t('console.updated'), 'success')
  } catch (err) {
    regionError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    regionSubmitting.value = false
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
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  box-shadow: inset 0 1px 0 var(--glass-edge), inset 0 -1px 0 rgba(0, 0, 0, 0.08);
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

.users-table th.actions-th,
.users-table td.actions-td {
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: -6px 0 12px rgba(0, 0, 0, 0.18);
}

.users-table th.actions-th {
  top: 0;
  z-index: 3;
  background: var(--color-glass);
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

.cell-region {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-primary);
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

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-gender {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.form-gender-option {
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.form-gender-option:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.form-gender-option.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 10px var(--color-glow);
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

.region-preview {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: center;
  box-shadow: 0 0 10px var(--color-glow);
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