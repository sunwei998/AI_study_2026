<template>
  <div class="admin-settings-base">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div class="settings-body">
      <div class="settings-table-wrap">
        <AppTable
          ref="tableRef"
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
          <!-- 新增 / 导出 / 导入 / 模板 / 重置 作为表格附属物，位于表格标题栏右侧 -->
          <template v-if="canManageSettings" #table-title-right>
            <AppButton
              size="middle"
              type="default"
              :title="$t('console.addSetting')"
              @click="openAdd"
            >
              <AppIcon name="lucide:plus" :size="15" />
            </AppButton>
            <AppExport
              icon-only
              size="middle"
              format="XLSX"
              :count="total"
              file-prefix="settings"
              :loading="exporting"
              :button-title="$t('common.export')"
              @export="onExport"
            />
            <AppButton
              size="middle"
              type="default"
              :title="$t('common.import')"
              @click="importVisible = true"
            >
              <AppIcon name="lucide:upload" :size="15" />
            </AppButton>
            <AppButton
              size="middle"
              type="default"
              :loading="templating"
              :title="$t('console.downloadTemplate')"
              @click="onDownloadTemplate"
            >
              <AppIcon name="lucide:file-down" :size="15" />
            </AppButton>
            <AppButton
              size="middle"
              type="default"
              :title="$t('console.resetFilters')"
              @click="onReset"
            >
              <AppIcon name="lucide:rotate-ccw" :size="15" />
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
              <button class="row-btn" :title="$t('console.logs')" @click="openLogs(row)">
                <AppIcon name="lucide:history" :size="15" />
              </button>
              <button
                class="row-btn row-btn--danger"
                :class="{ 'is-disabled': row.enabled }"
                :disabled="row.enabled"
                :title="row.enabled ? $t('console.disableBeforeDeleteSetting') : $t('console.delete')"
                @click="remove(row)"
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

      <AppImport
        v-model:visible="importVisible"
        :title="$t('common.import')"
        table
        multiple
        :max-count="5"
        :max-size="10 * 1024 * 1024"
        :processor="processImportFile"
        @done="onImportDone"
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

      <Teleport to="body">
        <Transition name="confirm" appear>
          <div v-if="logsVisible" class="form-overlay" @click.self="closeLogs">
            <div class="form-modal form-modal--logs" role="dialog" aria-modal="true">
              <span class="form-accent-line"></span>
              <h3 class="form-title">{{ $t('console.settingLogsTitle') }}</h3>
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
                  :current-page="logsPage"
                  :page-size="logsPageSize"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SettingItem } from '@/types/admin'
import {
  deleteSetting,
  downloadSettingsTemplate,
  exportSettings,
  fetchSettingLogs,
  fetchSettings,
  importSettings,
  updateSetting,
  type SettingLogItem
} from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/utils/format'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppExport from '@/components/common/AppExport.vue'
import AppImport, { type ImportSummary } from '@/components/common/AppImport.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import { useToast } from '@/composables/useToast'
import { useRowValidation } from '@/composables/useRowValidation'

const { t } = useI18n()
const { showToast } = useToast()
const auth = useAuthStore()

// ============ 行内编辑校验 ============
// key 只能英文+下划线、长度 < 64；value 长度 < 5000；remark 长度 ≤ 255
const KEY_RE = /^[A-Za-z_]+$/
// 导入源文件保留时长（小时）：仅接受 >0 的正整数
const RETENTION_KEY = 'import_file_retention_hours'
const POSITIVE_INT_RE = /^[1-9]\d*$/
const validateRow = (s: SettingItem) => {
  const e: Partial<Record<'value' | 'remark', string>> = {}
  // value 允许为空（部分设置项可空），仅限长度
  if (String(s.value ?? '').length >= 5000) e.value = t('console.valueTooLong')
  if (s.key === RETENTION_KEY && !POSITIVE_INT_RE.test(String(s.value ?? '').trim())) {
    e.value = t('console.retentionHoursInvalid')
  }
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
// 表格实例：重置时清空表头筛选/排序高亮
const tableRef = ref<InstanceType<typeof AppTable> | null>(null)
// 重置进行中标志：避免重置分页时触发 watch 导致重复请求
let resetting = false

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

/** 重置：清除启用筛选与排序、分页回默认，重新查询 */
function onReset() {
  resetting = true
  try {
    enabledFilter.value = null
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

const remove = async (s: SettingItem) => {
  if (s.enabled) return
  if (!window.confirm(t('console.deleteSettingConfirm', { key: s.key }))) return
  try {
    await deleteSetting(s.key)
    showToast(t('console.deleted'), 'success')
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  }
}

// ============ 操作日志 ============
const logsVisible = ref(false)
const logsLoading = ref(false)
const logsKey = ref('')
const logs = ref<SettingLogItem[]>([])
const logsTotal = ref(0)
const logsPage = ref(1)
const logsPageSize = ref(10)

const logColumns = computed<TableColumn[]>(() => [
  { key: 'content', title: t('console.logContent'), width: 320 },
  { key: 'operator', title: t('console.operator'), width: 120 },
  { key: 'created_at', title: t('console.operateTime'), width: 180, formatter: (row) => formatDateTime(row.created_at) },
])

const loadLogs = async () => {
  if (!logsKey.value) return
  logsLoading.value = true
  try {
    const res = await fetchSettingLogs(logsKey.value, {
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

const openLogs = (s: SettingItem) => {
  logsKey.value = s.key
  logsPage.value = 1
  logsPageSize.value = 10
  logs.value = []
  logsTotal.value = 0
  logsVisible.value = true
  void loadLogs()
}

const closeLogs = () => {
  logsVisible.value = false
  logsKey.value = ''
  logs.value = []
}

watch(logsPage, loadLogs)
watch(logsPageSize, () => {
  logsPage.value = 1
  loadLogs()
})

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
  // 键名：必填 + 格式 + 长度
  if (!key) {
    addError.value = t('console.keyRequired')
    return
  }
  if (key.length >= 64) {
    addError.value = t('console.keyTooLong')
    return
  }
  if (!KEY_RE.test(key)) {
    addError.value = t('console.keyFormat')
    return
  }
  // 配置值 / 备注：长度限制
  if (String(newValue.value ?? '').length >= 5000) {
    addError.value = t('console.valueTooLong')
    return
  }
  if (key === RETENTION_KEY && !POSITIVE_INT_RE.test(String(newValue.value ?? '').trim())) {
    addError.value = t('console.retentionHoursInvalid')
    return
  }
  if (String(newRemark.value ?? '').trim().length > 255) {
    addError.value = t('console.remarkTooLong')
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

// ============ 导出 / 模板 / 导入 ============
const exporting = ref(false)
const templating = ref(false)
const importVisible = ref(false)

/** 触发浏览器下载一个 Blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const onExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const blob = await exportSettings()
    downloadBlob(blob, `settings_${Date.now()}.xlsx`)
    showToast(t('console.exportSuccess'), 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    exporting.value = false
  }
}

const onDownloadTemplate = async () => {
  if (templating.value) return
  templating.value = true
  try {
    const blob = await downloadSettingsTemplate()
    downloadBlob(blob, 'settings_template.xlsx')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    templating.value = false
  }
}

const processImportFile = async (file: File) => {
  const res = await importSettings(file)
  if (res.errors?.length) {
    return {
      message: t('console.importPartial', { n: res.errors.length }),
      warn: true,
      created: res.created,
      updated: res.updated
    }
  }
  return {
    message: t('console.importSuccess', { created: res.created, updated: res.updated }),
    created: res.created,
    updated: res.updated
  }
}

function onImportDone(s: ImportSummary) {
  if (s.failed === 0 && s.warn === 0) {
    showToast(t('console.importSuccess', { created: s.created, updated: s.updated }), 'success')
  } else if (s.failed === 0) {
    showToast(t('console.importPartialDone', { created: s.created, updated: s.updated }), 'info')
  } else if (s.success + s.warn > 0) {
    showToast(
      t('console.importMixedDone', { created: s.created, updated: s.updated, failed: s.failed }),
      'error'
    )
  } else {
    showToast(t('console.importAllFailed', { failed: s.failed }), 'error')
  }
  if (s.success + s.warn > 0) {
    if (currentPage.value !== 1) currentPage.value = 1
    else load()
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

.row-btn--danger:hover {
  color: #ff5b6a;
  border-color: #ff5b6a;
  box-shadow: 0 0 8px rgba(255, 77, 94, 0.4);
}

.row-btn.is-disabled,
.row-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  filter: saturate(0.4);
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

.form-modal--logs {
  width: min(780px, 100%);
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
