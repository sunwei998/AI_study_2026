<template>
  <div class="dim-config">
    <!-- 左侧维表列表 -->
    <aside class="dim-sidebar">
      <div class="dim-sidebar__head">
        <span class="dim-sidebar__title">{{ t('console.dimTable.title') }}</span>
        <button
          v-if="canManageSettings"
          class="dim-add-table"
          :title="t('console.dimTable.newTable')"
          @click="openNewTable"
        >
          <AppIcon name="lucide:plus" :size="15" />
        </button>
      </div>
      <div class="dim-list">
        <button
          v-for="tb in tables"
          :key="tb.id"
          class="dim-item"
          :class="{ active: tb.id === selectedId }"
          @click="selectTable(tb.id)"
        >
          <span class="dim-item__name">{{ tb.name }}</span>
          <span class="dim-item__meta">
            <span class="dim-item__count">{{ t('console.dimTable.valueCount', { n: tb.value_count }) }}</span>
            <span v-if="canManageSettings" class="dim-item__actions" @click.stop>
              <span class="dim-item__btn" :title="t('console.dimTable.editTable')" @click="openEditTable(tb)">
                <AppIcon name="lucide:pencil" :size="13" />
              </span>
              <span class="dim-item__btn dim-item__btn--danger" :title="t('console.delete')" @click="removeTable(tb)">
                <AppIcon name="lucide:trash-2" :size="13" />
              </span>
            </span>
          </span>
        </button>
        <p v-if="!loadingTables && tables.length === 0" class="dim-list__empty">
          {{ t('console.dimTable.empty') }}
        </p>
      </div>
    </aside>

    <!-- 右侧取值维护 -->
    <section class="dim-main">
      <div class="dim-table-wrap">
        <AppTable
          ref="tableRef"
          :key="selectedId || 'none'"
          :columns="columns"
          :data="values"
          :loading="loadingValues"
          loading-type="skeleton"
          :skeleton-rows="8"
          :empty-text="t('console.dimTable.empty')"
          row-key="id"
          size="small"
          custom-sort
          :sort-method="onServerSort"
          @filter-change="onFilterChange"
        >
          <!-- 标题栏左侧：维表名称 / 编码 / 说明，与表格连成一体 -->
          <template #table-title-left>
            <template v-if="selected">
              <h3 class="dim-title-name" :title="selected.name">{{ selected.name }}</h3>
              <code class="dim-title-code">{{ selected.code }}</code>
              <p
                v-if="selected.description"
                class="dim-title-desc"
                :title="selected.description"
              >
                {{ selected.description }}
              </p>
            </template>
            <p v-else class="dim-title-desc">{{ t('console.dimTable.newTableDesc') }}</p>
          </template>

          <!-- 标题栏右侧：新增 / 导出 / 导入 / 模板 / 重置 -->
          <template v-if="selected && canManageSettings" #table-title-right>
            <AppButton
              size="middle"
              type="default"
              :title="t('console.dimTable.new')"
              @click="openNewValue"
            >
              <AppIcon name="lucide:plus" :size="15" />
            </AppButton>
            <AppExport
              icon-only
              size="middle"
              format="XLSX"
              :count="total"
              :fetch-total="fetchDimTotal"
              :file-prefix="`dim_${selected.code}`"
              :loading="exporting"
              :button-title="t('common.export')"
              @export="onExport"
            />
            <AppButton
              size="middle"
              type="default"
              :title="t('common.import')"
              @click="importVisible = true"
            >
              <AppIcon name="lucide:upload" :size="15" />
            </AppButton>
            <AppButton
              size="middle"
              type="default"
              :loading="templating"
              :title="t('console.downloadTemplate')"
              @click="onDownloadTemplate"
            >
              <AppIcon name="lucide:file-down" :size="15" />
            </AppButton>
            <AppButton
              size="middle"
              type="default"
              :title="t('console.resetFilters')"
              @click="onReset"
            >
              <AppIcon name="lucide:rotate-ccw" :size="15" />
            </AppButton>
          </template>

          <template #column-code="{ row }">
            <AppInput
              v-model="row.code"
              type="text"
              size="small"
              class="dim-cell-input"
              :disabled="!canManageSettings"
              :error="!!fieldError(row.id, 'code')"
              :title="fieldError(row.id, 'code') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template #column-name="{ row }">
            <AppInput
              v-model="row.name"
              type="text"
              size="small"
              class="dim-cell-input"
              :disabled="!canManageSettings"
              :error="!!fieldError(row.id, 'name')"
              :title="fieldError(row.id, 'name') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template v-if="isModelProvider" #column-name_en="{ row }">
            <AppInput
              v-model="row.name_en"
              type="text"
              size="small"
              class="dim-cell-input"
              :disabled="!canManageSettings"
              :error="!!fieldError(row.id, 'name_en')"
              :title="fieldError(row.id, 'name_en') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template v-if="isModelProvider" #column-api_key="{ row }">
            <AppInput
              v-model="row.api_key"
              type="text"
              size="small"
              class="dim-cell-input dim-cell-input--key"
              :disabled="!canManageSettings || row.code === 'ollama'"
              :placeholder="row.code === 'ollama' ? t('console.dimTable.ollamaNoKey') : t('console.dimTable.apiKeyPlaceholder')"
              :error="!!fieldError(row.id, 'api_key')"
              :title="fieldError(row.id, 'api_key') || row.api_key || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template #column-sort_order="{ row }">
            <AppInput
              v-model="row.sort_order"
              type="text"
              size="small"
              class="dim-cell-input dim-cell-input--num"
              :disabled="!canManageSettings"
              :error="!!fieldError(row.id, 'sort_order')"
              :title="fieldError(row.id, 'sort_order') || undefined"
              @blur="check(row)"
              @keydown.enter="save(row)"
            />
          </template>

          <template #column-remark="{ row }">
            <AppInput
              v-model="row.remark"
              type="text"
              size="small"
              class="dim-cell-input"
              :disabled="!canManageSettings"
              :placeholder="t('console.remark')"
              :error="!!fieldError(row.id, 'remark')"
              :title="fieldError(row.id, 'remark') || undefined"
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
              :title="row.enabled ? t('console.enabled') : t('console.disabled')"
              @click="toggle(row)"
            >
              <span class="switch-knob"></span>
            </button>
          </template>

          <template v-if="canManageSettings" #column-actions="{ row }">
            <div class="row-actions">
              <button class="row-btn" :title="t('console.save')" @click="save(row)">
                <AppIcon name="lucide:save" :size="15" />
              </button>
              <button class="row-btn" :title="t('console.logs')" @click="openLogs(row)">
                <AppIcon name="lucide:history" :size="15" />
              </button>
              <button class="row-btn row-btn--danger" :title="t('console.delete')" @click="removeValue(row)">
                <AppIcon name="lucide:trash-2" :size="15" />
              </button>
            </div>
          </template>
        </AppTable>
      </div>

      <Pagination
        v-if="selected"
        :total="total"
        v-model:page="currentPage"
        v-model:page-size="pageSize"
      />
    </section>

    <!-- 批量导入取值 -->
    <AppImport
      v-model:visible="importVisible"
      :title="t('common.import')"
      table
      multiple
      :max-count="5"
      :max-size="10 * 1024 * 1024"
      :processor="processImportFile"
      @done="onImportDone"
    />

    <!-- 新建/编辑维表弹窗 -->
    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="tableForm.visible" class="form-overlay" @click.self="tableForm.visible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ tableForm.isEdit ? t('console.dimTable.editTable') : t('console.dimTable.newTable') }}</h3>

            <form class="form-body" @submit.prevent="submitTable">
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.tableCode') }}</span>
                <input
                  v-model="tableForm.code"
                  type="text"
                  class="form-input"
                  :disabled="tableForm.isEdit"
                  :placeholder="t('console.dimTable.tableCodePlaceholder')"
                />
              </label>
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.tableName') }}</span>
                <input v-model="tableForm.name" type="text" class="form-input" :placeholder="t('console.dimTable.tableNamePlaceholder')" />
              </label>
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.tableDesc') }}</span>
                <input v-model="tableForm.description" type="text" class="form-input" :placeholder="t('console.dimTable.tableDescPlaceholder')" />
              </label>

              <p v-if="tableForm.error" class="form-error">{{ tableForm.error }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="tableForm.visible = false">
                  {{ t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="tableForm.submitting">
                  <AppLoading v-if="tableForm.submitting" :size="14" color="#fff" glow />
                  {{ t('confirm.ok') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 新增取值弹窗 -->
    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="valueForm.visible" class="form-overlay" @click.self="valueForm.visible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ t('console.dimTable.new') }}</h3>

            <form class="form-body" @submit.prevent="submitValue">
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.code') }}</span>
                <input v-model="valueForm.code" type="text" class="form-input" :placeholder="t('console.dimTable.valueCodePlaceholder')" />
              </label>
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.name') }}</span>
                <input v-model="valueForm.name" type="text" class="form-input" :placeholder="t('console.dimTable.valueNamePlaceholder')" />
              </label>
              <label v-if="isModelProvider" class="form-field">
                <span class="form-label">{{ t('console.dimTable.nameEn') }}</span>
                <input v-model="valueForm.name_en" type="text" class="form-input" :placeholder="t('console.dimTable.nameEnPlaceholder')" />
              </label>
              <label v-if="isModelProvider" class="form-field">
                <span class="form-label">{{ t('console.dimTable.apiKey') }}</span>
                <input v-model="valueForm.api_key" type="text" class="form-input" :placeholder="t('console.dimTable.apiKeyPlaceholder')" autocomplete="off" />
              </label>
              <label class="form-field">
                <span class="form-label">{{ t('console.dimTable.sort') }}</span>
                <input v-model="valueForm.sort_order" type="text" class="form-input" inputmode="numeric" />
              </label>
              <label class="form-field form-field--row">
                <span class="form-label">{{ t('console.status') }}</span>
                <button
                  type="button"
                  class="switch"
                  :class="{ on: valueForm.enabled }"
                  :aria-pressed="valueForm.enabled"
                  @click="valueForm.enabled = !valueForm.enabled"
                >
                  <span class="switch-knob"></span>
                </button>
              </label>
              <label class="form-field">
                <span class="form-label">{{ t('console.remark') }}</span>
                <input v-model="valueForm.remark" type="text" class="form-input" />
              </label>

              <p v-if="valueForm.error" class="form-error">{{ valueForm.error }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="valueForm.visible = false">
                  {{ t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="valueForm.submitting">
                  <AppLoading v-if="valueForm.submitting" :size="14" color="#fff" glow />
                  {{ t('confirm.ok') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 取值操作日志弹窗 -->
    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="logsVisible" class="form-overlay" @click.self="closeLogs">
          <div class="form-modal form-modal--logs" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ t('console.logs') }}</h3>
            <div class="logs-subtitle">{{ logsKey }}</div>

            <div class="logs-table">
              <AppTable
                :columns="logColumns"
                :data="logs"
                :loading="logsLoading"
                loading-type="skeleton"
                :skeleton-rows="5"
                :empty-text="t('console.noLogs')"
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
                {{ t('confirm.close') }}
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
      danger
      @confirm="doConfirm"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DimTable, DimValue } from '@/types/admin'
import {
  createDimTable,
  createDimValue,
  deleteDimTable,
  deleteDimValue,
  downloadDimTemplate,
  exportDimValues,
  fetchDimTables,
  fetchDimValues,
  fetchDimValuesTotal,
  fetchOperationLogs,
  importDimValues,
  updateDimTable,
  updateDimValue,
  type DimValuesExportParams,
  type OperationLogItem
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
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import { useToast } from '@/composables/useToast'
import { useRowValidation } from '@/composables/useRowValidation'

const { t } = useI18n()
const { showToast } = useToast()
const auth = useAuthStore()

const canManageSettings = computed(
  () => auth.user?.role === 'super_admin' || auth.user?.role === 'system_admin'
)

const tables = ref<DimTable[]>([])
const loadingTables = ref(true)
const selectedId = ref<number | null>(null)
const selected = computed(() => tables.value.find((tb) => tb.id === selectedId.value) || null)
// 仅模型提供商维表展示英文名称列并做英文名校验
const isModelProvider = computed(() => selected.value?.code === 'model_provider')

const values = ref<DimValue[]>([])
const loadingValues = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const enabledFilter = ref<boolean | null>(null)
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })
// 表格实例：重置时清空表头筛选/排序高亮
const tableRef = ref<InstanceType<typeof AppTable> | null>(null)
// 重置进行中标志：避免重置分页时触发 watch 导致重复请求
let resetting = false

const loadTables = async () => {
  loadingTables.value = true
  try {
    tables.value = await fetchDimTables()
    if (selectedId.value === null && tables.value.length) {
      selectedId.value = tables.value[0].id
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    loadingTables.value = false
  }
}

const loadValues = async () => {
  if (!selectedId.value) {
    values.value = []
    total.value = 0
    return
  }
  loadingValues.value = true
  try {
    const res = await fetchDimValues(selectedId.value, {
      page: currentPage.value,
      pageSize: pageSize.value,
      enabled: enabledFilter.value === null ? undefined : enabledFilter.value,
      sort: sortFilter.value.order ? sortFilter.value.key : undefined,
      order: sortFilter.value.order ?? undefined
    })
    values.value = res.items
    total.value = res.total
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    loadingValues.value = false
  }
}

const selectTable = (id: number) => {
  if (id === selectedId.value) return
  selectedId.value = id
  currentPage.value = 1
  enabledFilter.value = null
  sortFilter.value = { key: '', order: null }
  loadValues()
}

function onServerSort(key: string, order: 'asc' | 'desc' | null) {
  sortFilter.value = { key, order }
  currentPage.value = 1
  loadValues()
}

function onFilterChange(filters: Record<string, any[]>) {
  const rawEnabled = filters.enabled?.[0]
  enabledFilter.value = typeof rawEnabled === 'boolean' ? rawEnabled : null
  currentPage.value = 1
  loadValues()
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
  loadValues()
}

watch(currentPage, () => {
  if (!resetting) loadValues()
})
watch(pageSize, () => {
  if (resetting) return
  currentPage.value = 1
  loadValues()
})

const columns = computed<TableColumn[]>(() => [
  { key: 'code', title: t('console.dimTable.code'), width: 200, ellipsis: true, sortable: true, className: 'cell-code' },
  { key: 'name', title: t('console.dimTable.name'), width: 240, ellipsis: true, sortable: true },
  ...(isModelProvider.value
    ? [
        { key: 'name_en', title: t('console.dimTable.nameEn'), width: 180, ellipsis: true, sortable: true } as TableColumn,
        { key: 'api_key', title: t('console.dimTable.apiKey'), width: 220, ellipsis: true, className: 'cell-apikey' } as TableColumn
      ]
    : []),
  { key: 'sort_order', title: t('console.dimTable.sort'), width: 90, align: 'center', sortable: true },
  {
    key: 'enabled',
    title: t('console.status'),
    width: 90,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.enabled'), value: true },
      { text: t('console.disabled'), value: false }
    ],
    filterMethod: (v: any, row: DimValue) => Boolean(row.enabled) === Boolean(v)
  },
  { key: 'remark', title: t('console.remark'), width: 220 },
  ...(canManageSettings.value
    ? [
        {
          key: 'actions',
          title: t('console.actions'),
          width: 130,
          align: 'center',
          fixed: 'right'
        } as TableColumn
      ]
    : [])
])

// ============ 行内编辑校验 ============
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
const SORT_RE = /^\d{1,6}$/
// 英文名称禁止出现汉字（CJK 统一表意文字）
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** 模型提供商维表的英文名校验：必填 + 不允许中文 */
const validateNameEn = (v: unknown): string | undefined => {
  if (!isModelProvider.value) return undefined
  const val = String(v ?? '').trim()
  if (!val) return t('console.dimTable.nameEnRequired')
  if (val.length > 128) return t('console.dimTable.nameTooLong')
  if (CJK_RE.test(val)) return t('console.dimTable.nameEnNoChinese')
  return undefined
}

/** 排序值收敛为 number；非法（字母/中文/负数/小数/超长/空）返回 null，调用方据此拒绝提交 */
const parseSort = (v: unknown): number | null =>
  SORT_RE.test(String(v ?? '').trim()) ? Number(v) : null

const validateRow = (row: DimValue) => {
  const e: Partial<Record<'code' | 'name' | 'name_en' | 'api_key' | 'sort_order' | 'remark', string>> = {}
  const code = String(row.code ?? '').trim()
  const name = String(row.name ?? '').trim()
  if (!code) e.code = t('console.dimTable.codeRequired')
  else if (code.length > 64) e.code = t('console.dimTable.codeTooLong')
  else if (!CODE_RE.test(code)) e.code = t('console.dimTable.codeFormat')
  if (!name) e.name = t('console.dimTable.nameRequired')
  else if (name.length > 128) e.name = t('console.dimTable.nameTooLong')
  const nameEnErr = validateNameEn(row.name_en)
  if (nameEnErr) e.name_en = nameEnErr
  if (isModelProvider.value) {
    const keyVal = String(row.api_key ?? '')
    if (keyVal.length > 512) {
      e.api_key = t('console.dimTable.apiKeyTooLong')
    } else if (row.enabled && needsApiKey(row.code) && !keyVal.trim()) {
      // 启用状态下（ollama 豁免）必须有密钥，否则不允许保存
      e.api_key = t('console.dimTable.apiKeyRequiredToEnable')
    }
  }
  if (!SORT_RE.test(String(row.sort_order ?? '').trim())) e.sort_order = t('console.dimTable.sortInvalid')
  if (String(row.remark ?? '').length > 255) e.remark = t('console.dimTable.remarkTooLong')
  return e
}

const { errors: rowErrors, fieldError, clearRow, check } = useRowValidation(validateRow)

const savingId = ref<number | null>(null)
const save = async (row: DimValue) => {
  if (savingId.value === row.id || !selectedId.value) return
  // 校验不过就不发请求：绝不把脏数据写进库（原 `Number(x) || 0` 会把非法值静默存成 0）
  const firstError = check(row)
  if (firstError) {
    showToast(firstError, 'error')
    return
  }
  savingId.value = row.id
  try {
    await updateDimValue(selectedId.value, row.id, {
      code: String(row.code).trim(),
      name: String(row.name).trim(),
      name_en: String(row.name_en ?? '').trim(),
      api_key: String(row.api_key ?? '').trim(),
      sort_order: parseSort(row.sort_order)!,
      enabled: row.enabled,
      remark: String(row.remark ?? '')
    })
    showToast(t('console.saved'), 'success')
    clearRow(row.id)
    await loadValues()
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    savingId.value = null
  }
}

/** 该提供商是否需要 API 密钥才能启用（ollama 本地部署豁免） */
const needsApiKey = (code: unknown) =>
  isModelProvider.value && String(code ?? '').trim() !== 'ollama'

const toggle = async (row: DimValue) => {
  if (!selectedId.value) return
  const next = !row.enabled
  // 打开启用前：非 ollama 提供商必须已填写 API 密钥（前端先拦截，后端也兜底）
  if (next && needsApiKey(row.code) && !String(row.api_key ?? '').trim()) {
    showToast(t('console.dimTable.apiKeyRequiredToEnable'), 'error')
    return
  }
  row.enabled = next
  try {
    await updateDimValue(selectedId.value, row.id, { enabled: next })
    showToast(next ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
  } catch (err) {
    row.enabled = !next
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  }
}

// ============ 二次确认（删除维表 / 删除取值共用） ============
const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmAction: (() => Promise<void>) | null = null

const openConfirm = (title: string, message: string, action: () => Promise<void>) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction = action
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
  } finally {
    confirmLoading.value = false
  }
}

const removeValue = (row: DimValue) => {
  if (!selectedId.value) return
  const tableId = selectedId.value
  openConfirm(t('console.delete'), t('console.dimTable.deleteValueConfirm'), async () => {
    await deleteDimValue(tableId, row.id)
    showToast(t('console.deleted'), 'success')
    await refreshTableCount()
    await loadValues()
  })
}

const refreshTableCount = async () => {
  // 取值增删后刷新左侧计数
  const fresh = await fetchDimTables()
  for (const tb of fresh) {
    const local = tables.value.find((x) => x.id === tb.id)
    if (local) local.value_count = tb.value_count
  }
}

// ============ 维表表单（新建/编辑） ============
const tableForm = ref({
  visible: false,
  isEdit: false,
  id: 0,
  code: '',
  name: '',
  description: '',
  error: '',
  submitting: false
})

const openNewTable = () => {
  tableForm.value = {
    visible: true,
    isEdit: false,
    id: 0,
    code: '',
    name: '',
    description: '',
    error: '',
    submitting: false
  }
}

const openEditTable = (tb: DimTable) => {
  tableForm.value = {
    visible: true,
    isEdit: true,
    id: tb.id,
    code: tb.code,
    name: tb.name,
    description: tb.description,
    error: '',
    submitting: false
  }
}

const submitTable = async () => {
  if (tableForm.value.submitting) return
  const f = tableForm.value
  // 维表编码：新建时必填 + 格式 + 长度（编辑时编码不可改，不校验）
  if (!f.isEdit) {
    if (!f.code.trim()) {
      f.error = t('console.dimTable.tableCodeRequired')
      return
    }
    if (f.code.trim().length > 64) {
      f.error = t('console.dimTable.codeTooLong')
      return
    }
    if (!CODE_RE.test(f.code.trim())) {
      f.error = t('console.dimTable.codeFormat')
      return
    }
  }
  // 维表名称：必填 + 长度
  if (!f.name.trim()) {
    f.error = t('console.dimTable.tableNameRequired')
    return
  }
  if (f.name.trim().length > 128) {
    f.error = t('console.dimTable.nameTooLong')
    return
  }
  // 说明：长度限制
  if (f.description.trim().length > 255) {
    f.error = t('console.dimTable.tableDescTooLong')
    return
  }
  f.submitting = true
  f.error = ''
  try {
    if (f.isEdit) {
      await updateDimTable(f.id, { name: f.name, description: f.description })
    } else {
      await createDimTable({ code: f.code.trim(), name: f.name.trim(), description: f.description.trim() })
    }
    f.visible = false
    showToast(t('console.created'), 'success')
    await loadTables()
    if (!f.isEdit) {
      // 选中刚创建的维表
      const created = tables.value.find((x) => x.code === f.code.trim())
      if (created) selectTable(created.id)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('common.errorOccurred')
    f.error = msg.includes('已存在') ? t('console.dimTable.tableDuplicate') : msg
  } finally {
    f.submitting = false
  }
}

const removeTable = (tb: DimTable) => {
  openConfirm(t('console.delete'), t('console.dimTable.deleteTableConfirm'), async () => {
    await deleteDimTable(tb.id)
    showToast(t('console.deleted'), 'success')
    if (selectedId.value === tb.id) selectedId.value = null
    await loadTables()
  })
}

// ============ 取值表单（新增） ============
const valueForm = ref({
  visible: false,
  code: '',
  name: '',
  name_en: '',
  api_key: '',
  sort_order: '0',
  enabled: true,
  remark: '',
  error: '',
  submitting: false
})

const openNewValue = () => {
  valueForm.value = {
    visible: true,
    code: '',
    name: '',
    name_en: '',
    api_key: '',
    sort_order: '0',
    enabled: true,
    remark: '',
    error: '',
    submitting: false
  }
}

const submitValue = async () => {
  if (valueForm.value.submitting || !selectedId.value) return
  const f = valueForm.value
  if (!f.code.trim()) {
    f.error = t('console.dimTable.codeRequired')
    return
  }
  if (f.code.trim().length > 64) {
    f.error = t('console.dimTable.codeTooLong')
    return
  }
  if (!CODE_RE.test(f.code.trim())) {
    f.error = t('console.dimTable.codeFormat')
    return
  }
  if (!f.name.trim()) {
    f.error = t('console.dimTable.nameRequired')
    return
  }
  if (f.name.trim().length > 128) {
    f.error = t('console.dimTable.nameTooLong')
    return
  }
  const nameEnErr = validateNameEn(f.name_en)
  if (nameEnErr) {
    f.error = nameEnErr
    return
  }
  if (isModelProvider.value) {
    if (String(f.api_key ?? '').length > 512) {
      f.error = t('console.dimTable.apiKeyTooLong')
      return
    }
    // 新增即启用时（ollama 豁免），必须填写 API 密钥
    if (f.enabled && needsApiKey(f.code) && !String(f.api_key ?? '').trim()) {
      f.error = t('console.dimTable.apiKeyRequiredToEnable')
      return
    }
  }
  if (!SORT_RE.test(String(f.sort_order ?? '').trim())) {
    f.error = t('console.dimTable.sortInvalid')
    return
  }
  if (f.remark.trim().length > 255) {
    f.error = t('console.dimTable.remarkTooLong')
    return
  }
  f.submitting = true
  f.error = ''
  try {
    await createDimValue(selectedId.value, {
      code: f.code.trim(),
      name: f.name.trim(),
      name_en: String(f.name_en ?? '').trim(),
      api_key: String(f.api_key ?? '').trim(),
      sort_order: Number(String(f.sort_order).trim()),
      enabled: f.enabled,
      remark: f.remark.trim()
    })
    f.visible = false
    showToast(t('console.created'), 'success')
    currentPage.value = 1
    await refreshTableCount()
    await loadValues()
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('common.errorOccurred')
    f.error = msg.includes('已存在') ? t('console.dimTable.valueDuplicate') : msg
  } finally {
    f.submitting = false
  }
}

// ============ 导入 / 导出 / 模板 ============
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

/** 导出面板"全部数据量"：当前维表不受筛选影响的取值总数 */
const fetchDimTotal = async () => {
  if (!selectedId.value) return 0
  return fetchDimValuesTotal(selectedId.value)
}

const onExport = async ({ scope }: { scope: 'filtered' | 'all' }) => {
  if (exporting.value || !selectedId.value || !selected.value) return
  exporting.value = true
  try {
    const params: DimValuesExportParams =
      scope === 'filtered'
        ? {
            scope,
            enabled: enabledFilter.value === null ? undefined : String(enabledFilter.value),
            sort: sortFilter.value.order ? sortFilter.value.key : undefined,
            order: sortFilter.value.order ?? undefined
          }
        : { scope }
    const blob = await exportDimValues(selectedId.value, params)
    downloadBlob(blob, `dim_${selected.value.code}_${Date.now()}.xlsx`)
    showToast(t('console.exportSuccess'), 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    exporting.value = false
  }
}

const onDownloadTemplate = async () => {
  if (templating.value || !selectedId.value || !selected.value) return
  templating.value = true
  try {
    const blob = await downloadDimTemplate(selectedId.value)
    downloadBlob(blob, `dim_${selected.value.code}_template.xlsx`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    templating.value = false
  }
}

const processImportFile = async (file: File) => {
  if (!selectedId.value) throw new Error('no table selected')
  const res = await importDimValues(selectedId.value, file)
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

async function onImportDone(s: ImportSummary) {
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
    await refreshTableCount()
    currentPage.value = 1
    await loadValues()
  }
}

// ============ 取值操作日志 ============
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
    const res = await fetchOperationLogs('dim_value', logsId.value, {
      page: logsPage.value,
      pageSize: logsPageSize.value,
    })
    logs.value = res.items
    logsTotal.value = res.total
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    logsLoading.value = false
  }
}

const openLogs = (row: DimValue) => {
  logsId.value = row.id
  logsKey.value = `${row.name} · ${row.code}`
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

loadTables().then(loadValues)
</script>

<style scoped>
.dim-config {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

/* 左侧维表列表 */
.dim-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  padding: 12px;
  min-height: 0;
}

.dim-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 8px;
  border-bottom: 1px solid var(--color-border);
}

.dim-sidebar__title {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.dim-add-table {
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

.dim-add-table:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.dim-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dim-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--color-surface) 40%, transparent);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: var(--transition-fast);
}

.dim-item:hover {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.dim-item.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  box-shadow: 0 0 10px var(--color-glow);
}

.dim-item__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.dim-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.dim-item__count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.dim-item__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: var(--transition-fast);
}

.dim-item:hover .dim-item__actions {
  opacity: 1;
}

.dim-item__btn {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.dim-item__btn:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.dim-item__btn--danger:hover {
  color: #ff5b6a;
  background: rgba(255, 77, 94, 0.12);
}

.dim-list__empty {
  margin: 12px 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 右侧主区 */
.dim-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

/* 表格标题栏内容：名称 / 编码 / 说明（左），操作按钮（右，由 AppTable 负责排版） */
.dim-title-name {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text);
  text-shadow: 0 0 14px var(--color-glow);
  /* 过长时省略，避免把编码和右侧按钮挤出去 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-title-code {
  flex: none;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  white-space: nowrap;
}

.dim-title-desc {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dim-table-wrap :deep(.app-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dim-table-wrap :deep(.app-table-scroll) {
  flex: 1;
  min-height: 0;
}

:deep(.cell-code) {
  font-family: var(--font-mono);
  color: var(--color-primary);
}

:deep(.cell-apikey) {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
}

:deep(.dim-cell-input--key input) {
  font-family: var(--font-mono);
  font-size: 11px;
  -webkit-text-security: none;
}

:deep(.dim-cell-input) {
  width: 100%;
  min-width: 0;
}

:deep(.dim-cell-input--num input) {
  text-align: center;
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
  justify-content: center;
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

/* 弹窗 */
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

.form-field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
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
