<template>
  <div class="admin-users">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="!error" class="users-table-wrap">
      <AppTable
        ref="tableRef"
        :columns="columns"
        :data="users"
        :loading="loading"
        loading-type="skeleton"
        :skeleton-rows="8"
        :empty-text="$t('console.noUsers')"
        row-key="id"
        size="small"
        custom-sort
        :sort-method="onServerSort"
        @filter-change="onFilterChange"
      >
        <!-- 导出 / 重置 作为表格附属物，位于表格标题栏右侧 -->
        <template v-if="auth.isSuperAdmin" #table-title-right>
          <AppExport
            icon-only
            size="middle"
            format="XLSX"
            :count="total"
            file-prefix="users"
            :loading="exporting"
            :button-title="$t('common.export')"
            @export="onExport"
          />
          <AppButton
            size="middle"
            type="default"
            :title="$t('console.resetFilters')"
            @click="onReset"
          >
            <AppIcon name="lucide:rotate-ccw" :size="15" />
          </AppButton>
        </template>

        <template #column-username="{ row }">
          <AppTooltip :content="row.username">
            <span class="cell-user">
              <span class="cell-user__name">{{ row.username }}</span>
              <span v-if="row.id === auth.user?.id" class="self-tag">{{ $t('console.self') }}</span>
            </span>
          </AppTooltip>
        </template>

        <template #column-role="{ row }">
          <span class="role-badge" :class="`role-${row.role}`">
            {{ t(roleLabelKey(row.role)) }}
          </span>
        </template>

        <template #column-is_active="{ row }">
          <button
            class="toggle"
            :class="{ on: row.is_active }"
            :disabled="row.id === auth.user?.id || !auth.isSuperAdmin"
            :title="row.is_active ? $t('console.disable') : $t('console.enable')"
            @click="askToggleActive(row)"
          >
            <span class="toggle-knob"></span>
          </button>
        </template>

        <template v-if="auth.isSuperAdmin" #column-actions="{ row }">
          <div class="row-actions">
            <button class="row-btn" :title="$t('console.roleSwitch')" @click="askToggleRole(row)">
              <AppIcon name="lucide:shield" :size="15" />
            </button>
            <button class="row-btn" :title="$t('console.editProfile')" @click="openEditRegion(row)">
              <AppIcon name="lucide:pencil" :size="15" />
            </button>
            <button class="row-btn" :title="$t('console.resetPassword')" @click="openResetPassword(row)">
              <AppIcon name="lucide:key-round" :size="15" />
            </button>
            <button class="row-btn" :title="$t('console.logs')" @click="openLogs(row)">
              <AppIcon name="lucide:history" :size="15" />
            </button>
            <button
              class="row-btn row-btn--danger"
              :class="{ 'is-disabled': !canDeleteUser(row) }"
              :disabled="!canDeleteUser(row)"
              :title="deleteDisabledTitle(row)"
              @click="askDeleteUser(row)"
            >
              <AppIcon name="lucide:trash-2" :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
    </div>

    <Pagination
      :total="total"
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
              <AppCascader v-model="regionValue" />
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
                <AppInput v-model="newPassword" type="password" clearable autocomplete="new-password" />
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

    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="roleVisible" class="form-overlay" @click.self="roleVisible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ $t('console.roleSwitch') }} — {{ roleTargetUser?.username }}</h3>

            <form class="form-body" @submit.prevent="submitRoleChange">
              <label class="form-field">
                <span class="form-label">{{ $t('console.role') }}</span>
                <AppSelect v-model="selectedRole" :options="roleOptions" size="default" />
              </label>

              <p v-if="roleError" class="form-error">{{ roleError }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="roleVisible = false">
                  {{ $t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="roleSubmitting">
                  <AppLoading v-if="roleSubmitting" :size="14" color="#fff" glow />
                  {{ $t('confirm.ok') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="logsVisible" class="form-overlay" @click.self="closeLogs">
          <div class="form-modal form-modal--logs" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ $t('console.logs') }}</h3>
            <div class="logs-subtitle">{{ logsKey }}</div>

            <div class="logs-table">
              <AppTable
                :columns="logColumns"
                :data="logs"
                :loading="logsLoading"
                loading-type="skeleton"
                :skeleton-rows="5"
                :empty-text="$t('console.noLogs')"
                row-key="id"
                size="small"
                show-index
                :max-height="360"
              />
              <Pagination
                :total="logsTotal"
                v-model:page="logsPage"
                v-model:page-size="logsPageSize"
              />
            </div>

            <div class="form-actions">
              <button type="button" class="form-btn form-btn--ghost" @click="closeLogs">
                {{ $t('confirm.close') }}
              </button>
            </div>
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
import { computed, onMounted, ref ,watch} from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminUser, UserRole, UserUpdatePayload } from '@/types/admin'
import {
  deleteUser,
  exportUsers,
  fetchAdminUser,
  fetchAdminUsers,
  fetchOperationLogs,
  resetUserPassword,
  updateAdminUser,
  type OperationLogItem
} from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/utils/format'
import { useToast } from '@/composables/useToast'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppCascader, { type CascaderValue } from '@/components/common/AppCascader.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppExport from '@/components/common/AppExport.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import AppTooltip from '@/components/common/AppTooltip.vue'
import { ALL_ROLES, ROLE_LABEL_KEYS } from '@/utils/roles'

const { t } = useI18n()
const auth = useAuthStore()
const { showToast } = useToast()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')
const total = ref(0)

const currentPage = ref(1)
const pageSize = ref(10)
const usernameFilter = ref('')
const genderFilter = ref<string[]>([])
const roleFilter = ref<string[]>([])
const isActiveFilter = ref<boolean | null>(null)
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })
// 表格实例：重置时清空表头筛选/排序高亮
const tableRef = ref<InstanceType<typeof AppTable> | null>(null)
// 重置进行中标志：避免重置分页时触发 watch 导致重复请求
let resetting = false

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchAdminUsers({
      page: currentPage.value,
      pageSize: pageSize.value,
      username: usernameFilter.value || undefined,
      genders: genderFilter.value.length ? genderFilter.value : undefined,
      roles: roleFilter.value.length ? roleFilter.value : undefined,
      isActive: isActiveFilter.value === null ? undefined : isActiveFilter.value,
      sort: sortFilter.value.order ? sortFilter.value.key : undefined,
      order: sortFilter.value.order ?? undefined
    })
    users.value = res.items
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

// 服务端排序：AppTable 通过 sort-method 回调，把排序状态交给后端查询
function onServerSort(key: string, order: 'asc' | 'desc' | null) {
  sortFilter.value = { key, order }
  if (currentPage.value === 1) {
    load()
  } else {
    currentPage.value = 1
  }
}

function onFilterChange(filters: Record<string, any[]>) {
  const username = filters.username?.[0]
  usernameFilter.value = typeof username === 'string' ? username : ''
  genderFilter.value = (filters.gender ?? []).map(String)
  roleFilter.value = (filters.role ?? []).map(String)
  const rawActive = filters.is_active?.[0]
  isActiveFilter.value = typeof rawActive === 'boolean' ? rawActive : null
  if (currentPage.value === 1) {
    load()
  } else {
    currentPage.value = 1
  }
}

/** 重置：清除全部筛选与排序、分页回默认，重新查询 */
function onReset() {
  resetting = true
  try {
    usernameFilter.value = ''
    genderFilter.value = []
    roleFilter.value = []
    isActiveFilter.value = null
    sortFilter.value = { key: '', order: null }
    pageSize.value = 10
    currentPage.value = 1
    tableRef.value?.resetState()
  } finally {
    resetting = false
  }
  load()
}

watch(currentPage, () => {
  if (!resetting) load()
})
watch(pageSize, () => {
  if (resetting) return
  currentPage.value = 1
  load()
})



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

// AppTable 列定义：用户名/角色支持表头筛选，其余列用 formatter 渲染
const columns = computed<TableColumn[]>(() => [
  {
    key: 'username',
    title: t('console.username'),
    width: 220,
    ellipsis: true,
    filterable: true,
    filterType: 'input',
    filterPlaceholder: t('common.search'),
    filterMethod: (value: any, row: AdminUser) =>
      String(row.username ?? '').toLowerCase().includes(String(value ?? '').toLowerCase())
  },
  {
    key: 'role',
    title: t('console.role'),
    width: 130,
    align: 'center',
    filterable: true,
    filterType: 'checkbox',
    filters: ALL_ROLES.map((r) => ({ text: t(ROLE_LABEL_KEYS[r]), value: r }))
  },
  {
    key: 'birthday',
    title: t('console.birthday'),
    width: 200,
    ellipsis: true,
    sortable: true,
    className: 'cell-num',
    formatter: (row: AdminUser) => row.birthday || '-'
  },
  {
    key: 'gender',
    title: t('console.gender'),
    width: 150,
    align: 'center',
    filterable: true,
    filterType: 'checkbox',
    filters: [
      { text: t('auth.genderMale'), value: 'male' },
      { text: t('auth.genderFemale'), value: 'female' },
      { text: t('auth.genderOther'), value: 'other' }
    ],
    formatter: (row: AdminUser) => genderLabel(row.gender)
  },
  {
    key: 'is_active',
    title: t('console.enabled'),
    width: 150,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.enabled'), value: true },
      { text: t('console.disabled'), value: false }
    ],
    // 后端返回 1/0（数字），筛选值是 true/false（布尔），需宽松比较，否则会被前端 processedData 严格比较过滤掉
    filterMethod: (v: any, row: AdminUser) => Boolean(row.is_active) === Boolean(v)
  },
  {
    key: 'region',
    title: t('console.region'),
    width: 160,
    ellipsis: true,
    className: 'cell-region',
    formatter: (row: AdminUser) => formatRegion(row)
  },
  {
    key: 'logins',
    title: t('console.logins'),
    width: 150,
    align: 'right',
    sortable: true,
    className: 'cell-num',
    formatter: (row: AdminUser) => row.logins ?? 0
  },
  {
    key: 'total_tokens',
    title: t('console.totalTokens'),
    width: 150,
    align: 'right',
    sortable: true,
    className: 'cell-num',
    formatter: (row: AdminUser) => formatNum(row.total_tokens)
  },
  {
    key: 'last_seen_at',
    title: t('console.lastSeen'),
    width: 250,
    ellipsis: true,
    sortable: true,
    className: 'cell-time',
    formatter: (row: AdminUser) => formatTime(row.last_seen_at)
  },
  {
    key: 'created_at',
    title: t('console.createdAt'),
    width: 250,
    ellipsis: true,
    sortable: true,
    className: 'cell-time',
    formatter: (row: AdminUser) => formatTime(row.created_at)
  },
  {
    key: 'updated_at',
    title: t('console.updatedAt'),
    width: 250,
    ellipsis: true,
    sortable: true,
    className: 'cell-time',
    formatter: (row: AdminUser) => formatTime(row.updated_at)
  },
  {
    key: 'updated_by',
    title: t('console.updatedBy'),
    width: 170,
    className: 'cell-time',
    formatter: (row: AdminUser) => row.updated_by || '-'
  },
  ...(auth.isSuperAdmin
    ? [
        {
          key: 'actions',
          title: t('console.actions'),
          width: 190,
          align: 'center',
          fixed: 'right'
        } as TableColumn
      ]
    : [])
])

function genderLabel(gender: string): string {
  if (!gender) return '-'
  const opt = genderOptions.find((o) => o.value === gender)
  return opt ? opt.label : gender
}

function roleLabelKey(role: string): string {
  return ROLE_LABEL_KEYS[role as UserRole] || 'console.roleUser'
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
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
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
      await load()
      showToast(target ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
    }
  )
}

// 删除用户：仅能删除非自己且未启用的用户
const canDeleteUser = (u: AdminUser) => u.id !== auth.user?.id && !u.is_active

const deleteDisabledTitle = (u: AdminUser) => {
  if (u.id === auth.user?.id) return t('console.cannotDeleteSelf')
  if (u.is_active) return t('console.cannotDeleteActive')
  return t('console.delete')
}

const askDeleteUser = (u: AdminUser) => {
  if (!canDeleteUser(u)) return
  openConfirm(
    t('console.deleteUserTitle'),
    t('console.deleteUserMessage', { name: u.username }),
    async () => {
      await deleteUser(u.id)
      showToast(t('console.deleted'), 'success')
      await load()
    }
  )
}


const askToggleRole = (u: AdminUser) => {
  roleTargetUser.value = u
  selectedRole.value = u.role
  roleError.value = ''
  roleVisible.value = true
}

// 角色切换弹窗
const roleOptions = ALL_ROLES.map((r) => ({ label: t(ROLE_LABEL_KEYS[r]), value: r }))
const roleVisible = ref(false)
const roleSubmitting = ref(false)
const roleError = ref('')
const roleTargetUser = ref<AdminUser | null>(null)
const selectedRole = ref<UserRole>('user')

const submitRoleChange = async () => {
  if (roleSubmitting.value || !roleTargetUser.value) return
  if (selectedRole.value === roleTargetUser.value.role) {
    roleVisible.value = false
    return
  }
  roleSubmitting.value = true
  roleError.value = ''
  try {
    await updateAdminUser(roleTargetUser.value.id, { role: selectedRole.value })
    await load()
    showToast(t('console.roleUpdated'), 'success')
    roleVisible.value = false
  } catch (err) {
    roleError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    roleSubmitting.value = false
  }
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
const regionValue = ref<CascaderValue>({ province: '', city: '', district: '' })
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
    await load()
    regionVisible.value = false
    showToast(t('console.updated'), 'success')
  } catch (err) {
    regionError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    regionSubmitting.value = false
  }
}

// ============ 导出 ============
const exporting = ref(false)

const onExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const blob = await exportUsers()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${Date.now()}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(t('console.exportSuccess'), 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    exporting.value = false
  }
}

// ============ 操作日志 ============
const logsVisible = ref(false)
const logsLoading = ref(false)
const logsKey = ref('')
const logsId = ref<number | null>(null)
const logs = ref<OperationLogItem[]>([])
const logsTotal = ref(0)
const logsPage = ref(1)
const logsPageSize = ref(10)

const logColumns = computed<TableColumn[]>(() => [
  { key: 'content', title: t('console.logContent'), width: 320 },
  { key: 'operator', title: t('console.operator'), width: 120 },
  { key: 'created_at', title: t('console.operateTime'), width: 180, formatter: (row) => formatDateTime(row.created_at) },
])

const loadLogs = async () => {
  if (logsId.value == null) return
  logsLoading.value = true
  try {
    const res = await fetchOperationLogs('user', logsId.value, {
      page: logsPage.value,
      pageSize: logsPageSize.value,
    })
    logs.value = res.items
    logsTotal.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    logsLoading.value = false
  }
}

const openLogs = (u: AdminUser) => {
  logsId.value = u.id
  logsKey.value = u.username
  logsPage.value = 1
  logsPageSize.value = 10
  logs.value = []
  logsTotal.value = 0
  logsVisible.value = true
  void loadLogs()
}

const closeLogs = () => {
  logsVisible.value = false
  logsId.value = null
  logsKey.value = ''
  logs.value = []
}

watch(logsPage, loadLogs)
watch(logsPageSize, () => {
  logsPage.value = 1
  loadLogs()
})
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

.users-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.users-table-wrap :deep(.app-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.users-table-wrap :deep(.app-table-scroll) {
  flex: 1;
  min-height: 0;
}

.cell-user {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  font-weight: 500;
}

.cell-user__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.users-table-wrap :deep(.cell-num) {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.users-table-wrap :deep(.cell-region) {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-primary);
}

.users-table-wrap :deep(.cell-time) {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.self-tag {
  flex-shrink: 0;
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
  white-space: nowrap;
}

/* 超级管理员：金色 */
.role-super_admin {
  background: rgba(255, 183, 77, 0.15);
  border: 1px solid #ffb74d;
  color: #ffb74d;
}

/* 系统管理员：青色（主题主色） */
.role-system_admin {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

/* 模型管理员：紫色 */
.role-model_admin {
  background: rgba(167, 139, 250, 0.15);
  border: 1px solid #a78bfa;
  color: #a78bfa;
}

/* 订阅用户：绿色 */
.role-subscriber {
  background: rgba(52, 211, 153, 0.15);
  border: 1px solid #34d399;
  color: #34d399;
}

/* 普通用户：中性 */
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

.row-btn--danger:hover {
  color: #ff5b6a;
  border-color: #ff5b6a;
  box-shadow: 0 0 8px rgba(255, 77, 94, 0.45);
}

.row-btn.is-disabled,
.row-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.row-btn.is-disabled:hover,
.row-btn:disabled:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border);
  box-shadow: none;
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

.form-modal--logs {
  width: min(780px, 100%);
  max-height: 90vh;
  overflow-y: auto;
}

.logs-subtitle {
  margin: -10px 0 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-primary);
  text-shadow: 0 0 12px var(--color-glow);
  word-break: break-all;
}

.logs-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
