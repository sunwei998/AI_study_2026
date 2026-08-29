<template>
  <div class="admin-settings-base">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div class="settings-body">
      <div class="settings-table-wrap">
        <AppTable
          :columns="columns"
          :data="settings"
          :loading="loading"
          loading-type="skeleton"
          :skeleton-rows="8"
          :empty-text="$t('console.noSettings')"
          row-key="key"
          size="small"
          custom-sort
          :sort-method="onServerSort"
          @filter-change="onFilterChange"
        >
          <!-- 新增按钮作为表格附属物，位于表格标题栏右侧 -->
          <template v-if="canManageSettings" #table-title-right>
            <AppButton
              size="middle"
              type="default"
              :title="$t('console.addSetting')"
              @click="openAdd"
            >
              <AppIcon name="lucide:plus" :size="15" />
            </AppButton>
          </template>

          <template #column-value="{ row }">
            <AppInput
              v-model="row.value"
              type="text"
              size="small"
              class="settings-cell-input"
              :disabled="!canManageSettings"
              :error="!!fieldError(row.key, 'value')"
              :title="fieldError(row.key, 'value') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template #column-remark="{ row }">
            <AppInput
              v-model="row.remark"
              type="text"
              size="small"
              class="settings-cell-input"
              :disabled="!canManageSettings"
              :placeholder="$t('console.remarkPlaceholder')"
              :error="!!fieldError(row.key, 'remark')"
              :title="fieldError(row.key, 'remark') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template #column-enabled="{ row }">
            <button
              class="switch"
              :class="{ on: row.enabled }"
              :disabled="!canManageSettings"
              :aria-pressed="row.enabled"
              :title="row.enabled ? $t('console.enabled') : $t('console.disabled')"
              @click="toggle(row)"
            >
              <span class="switch-knob"></span>
            </button>
          </template>

          <template v-if="canManageSettings" #column-actions="{ row }">
            <div class="row-actions">
              <button class="row-btn" :title="$t('console.save')" @click="save(row)">
                <AppIcon name="lucide:save" :size="15" />
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
          <div v-if="addVisible" class="form-overlay" @click.self="addVisible = false">
            <div class="form-modal" role="dialog" aria-modal="true">
              <span class="form-accent-line"></span>
              <h3 class="form-title">{{ $t('console.addSetting') }}</h3>

              <form class="form-body" @submit.prevent="submitAdd">
                <label class="form-field">
                  <span class="form-label">{{ $t('console.key') }}</span>
                  <input v-model="newKey" type="text" class="form-input" :placeholder="'site_name'" />
                </label>
                <label class="form-field">
                  <span class="form-label">{{ $t('console.value') }}</span>
                  <input v-model="newValue" type="text" class="form-input" />
                </label>
                <label class="form-field">
                  <span class="form-label">{{ $t('console.remark') }}</span>
                  <input v-model="newRemark" type="text" class="form-input" />
                </label>

                <p v-if="addError" class="form-error">{{ addError }}</p>

                <div class="form-actions">
                  <button type="button" class="form-btn form-btn--ghost" @click="addVisible = false">
                    {{ $t('confirm.cancel') }}
                  </button>
                  <button type="submit" class="form-btn form-btn--primary" :disabled="addSubmitting">
                    <AppLoading v-if="addSubmitting" :size="14" color="#fff" glow />
                    {{ $t('confirm.ok') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SettingItem } from '@/types/admin'
import { fetchSettings, updateSetting } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import { useToast } from '@/composables/useToast'
import { useRowValidation } from '@/composables/useRowValidation'

const { t } = useI18n()
const { showToast } = useToast()
const auth = useAuthStore()

// ============ 行内编辑校验 ============
const validateRow = (s: SettingItem) => {
  const e: Partial<Record<'value' | 'remark', string>> = {}
  // value 允许为空（部分设置项可空），仅限长度
  if (String(s.value ?? '').length > 2000) e.value = t('console.valueTooLong')
  if (String(s.remark ?? '').length > 255) e.remark = t('console.remarkTooLong')
  return e
}

const { errors: rowErrors, fieldError, clearRow, check } = useRowValidation(validateRow)

/** 系统设置权限：超级管理员 / 系统管理员 */
const canManageSettings = computed(
  () => auth.user?.role === 'super_admin' || auth.user?.role === 'system_admin'
)

const settings = ref<SettingItem[]>([])
const loading = ref(true)
const error = ref('')
const savingKey = ref('')
const total = ref(0)

const currentPage = ref(1)
const pageSize = ref(10)
const enabledFilter = ref<boolean | null>(null)
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchSettings({
      page: currentPage.value,
      pageSize: pageSize.value,
      enabled: enabledFilter.value === null ? undefined : enabledFilter.value,
      sort: sortFilter.value.order ? sortFilter.value.key : undefined,
      order: sortFilter.value.order ?? undefined
    })
    settings.value = res.items
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

// 服务端排序
function onServerSort(key: string, order: 'asc' | 'desc' | null) {
  sortFilter.value = { key, order }
  if (currentPage.value === 1) {
    load()
  } else {
    currentPage.value = 1
  }
}

// 服务端筛选：enabled 单选
function onFilterChange(filters: Record<string, any[]>) {
  const rawEnabled = filters.enabled?.[0]
  enabledFilter.value = typeof rawEnabled === 'boolean' ? rawEnabled : null
  if (currentPage.value === 1) {
    load()
  } else {
    currentPage.value = 1
  }
}

watch(currentPage, load)
watch(pageSize, () => {
  currentPage.value = 1
  load()
})

onMounted(load)

const columns = computed<TableColumn[]>(() => [
  { key: 'key', title: t('console.key'), width: 220, ellipsis: true, sortable: true, className: 'cell-key' },
  { key: 'value', title: t('console.value'), width: 300 },
  { key: 'remark', title: t('console.remark'), width: 220 },
  {
    key: 'enabled',
    title: t('console.status'),
    width: 100,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.enabled'), value: true },
      { text: t('console.disabled'), value: false }
    ],
    // 后端返回 1/0，筛选值是布尔，需宽松比较
    filterMethod: (v: any, row: SettingItem) => Boolean(row.enabled) === Boolean(v)
  },
  ...(canManageSettings.value
    ? [
        {
          key: 'actions',
          title: t('console.actions'),
          width: 90,
          align: 'center',
          fixed: 'right'
        } as TableColumn
      ]
    : [])
])

const save = async (s: SettingItem) => {
  if (savingKey.value === s.key) return
  // 校验不过就不发请求
  const firstError = check(s)
  if (firstError) {
    showToast(firstError, 'error')
    return
  }
  savingKey.value = s.key
  error.value = ''
  try {
    await updateSetting(s.key, { value: s.value ?? '', remark: s.remark ?? '' })
    showToast(t('console.saved'), 'success')
    clearRow(s.key)
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    savingKey.value = ''
  }
}

const toggle = async (s: SettingItem) => {
  const next = !s.enabled
  s.enabled = next
  try {
    await updateSetting(s.key, { enabled: next })
    showToast(next ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
    await load()
  } catch (err) {
    s.enabled = !next
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  }
}

const addVisible = ref(false)
const addSubmitting = ref(false)
const addError = ref('')
const newKey = ref('')
const newValue = ref('')
const newRemark = ref('')

const openAdd = () => {
  newKey.value = ''
  newValue.value = ''
  newRemark.value = ''
  addError.value = ''
  addVisible.value = true
}

const submitAdd = async () => {
  if (addSubmitting.value) return
  addError.value = ''
  const key = newKey.value.trim()
  if (!key) {
    addError.value = t('console.keyRequired')
    return
  }
  addSubmitting.value = true
  try {
    await updateSetting(key, { value: newValue.value, remark: newRemark.value })
    addVisible.value = false
    showToast(t('console.created'), 'success')
    await load()
  } catch (err) {
    addError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    addSubmitting.value = false
  }
}
</script>

<style scoped>
.admin-settings-base {
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

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.page-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 14px var(--color-glow);
  transition: var(--transition-fast);
}

.page-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.settings-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.settings-table-wrap :deep(.app-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.settings-table-wrap :deep(.app-table-scroll) {
  flex: 1;
  min-height: 0;
}

:deep(.cell-key) {
  font-family: var(--font-mono);
  color: var(--color-primary);
}

:deep(.settings-cell-input) {
  width: 100%;
  min-width: 0;
}

.switch {
  width: 40px;
  height: 22px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  position: relative;
  cursor: pointer;
  transition: var(--transition-fast);
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.switch.on {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.switch.on .switch-knob {
  left: 20px;
  background: #fff;
}

.switch:disabled {
  opacity: 0.45;
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
  max-height: 90vh;
  overflow-y: auto;
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
