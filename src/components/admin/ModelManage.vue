<template>
  <div class="model-manage">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="!error" class="model-table-wrap">
      <AppTable
        ref="tableRef"
        :columns="columns"
        :data="models"
        :loading="loading"
        loading-type="skeleton"
        :skeleton-rows="8"
        :empty-text="$t('console.noModels')"
        row-key="id"
        size="small"
        custom-sort
        :sort-method="onServerSort"
        @filter-change="onFilterChange"
      >
        <!-- 操作按钮作为表格附属物，位于表格标题栏右侧 -->
        <template v-if="canManageModels" #table-title-right>
          <AppButton
            size="middle"
            type="default"
            :title="$t('console.addModel')"
            @click="openCreate"
          >
            <AppIcon name="lucide:plus" :size="15" />
          </AppButton>
          <AppExport
            icon-only
            size="middle"
            format="XLSX"
            :count="total"
            :fetch-total="fetchModelsTotal"
            file-prefix="models"
            :loading="exporting"
            :button-title="$t('console.exportModels')"
            @export="onExport"
          />
          <AppButton
            size="middle"
            type="default"
            :title="$t('console.importModels')"
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
          <!-- 重置：清除所有筛选与排序、分页回到默认后重新查询 -->
          <AppButton
            size="middle"
            type="default"
            :title="$t('console.resetFilters')"
            @click="onReset"
          >
            <AppIcon name="lucide:rotate-ccw" :size="15" />
          </AppButton>
        </template>

        <template #column-enabled="{ row }">
          <button
            class="toggle"
            :class="{ on: row.enabled }"
            :disabled="!canManageModels"
            :title="row.enabled ? $t('console.disable') : $t('console.enable')"
            @click="toggleEnabled(row)"
          >
            <span class="toggle-knob"></span>
          </button>
        </template>

        <template #column-free="{ row }">
          <AppIcon :name="row.free ? 'lucide:check-circle' : 'lucide:circle'" :size="16" :glow="row.free" />
        </template>

        <template #column-vision="{ row }">
          <AppIcon :name="row.vision ? 'lucide:check-circle' : 'lucide:circle'" :size="16" :glow="row.vision" />
        </template>

        <template #column-supports_search="{ row }">
          <AppIcon
            :name="row.supports_search ? 'lucide:check-circle' : 'lucide:circle'"
            :size="16"
            :glow="row.supports_search"
          />
        </template>

        <template #column-is_default="{ row }">
          <button
            class="default-btn"
            :class="{ on: row.is_default, off: !row.is_default, blocked: !row.enabled || !canManageModels }"
            :title="
              row.is_default
                ? $t('console.defaultModel')
                : row.enabled
                  ? $t('console.setDefault')
                  : $t('console.defaultDisabledHint')
            "
            :disabled="row.is_default || !row.enabled || !canManageModels"
            @click="setDefault(row)"
          >
            <span v-if="row.is_default" class="star-char">★</span>
            <AppIcon v-else name="lucide:star" :size="16" />
          </button>
        </template>

        <template v-if="canManageModels" #column-actions="{ row }">
          <div class="row-actions">
            <button class="row-btn" :title="$t('console.edit')" @click="openEdit(row)">
              <AppIcon name="lucide:pencil" :size="15" />
            </button>
            <button class="row-btn" :title="$t('console.logs')" @click="openLogs(row)">
              <AppIcon name="lucide:history" :size="15" />
            </button>
            <button
              class="row-btn row-btn--danger"
              :class="{ 'is-disabled': row.enabled }"
              :disabled="row.enabled"
              :title="row.enabled ? $t('console.disableBeforeDelete') : $t('console.delete')"
              @click="askDelete(row)"
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
        <div v-if="formVisible" class="form-overlay" @click.self="formVisible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ formMode === 'create' ? $t('console.addModel') : $t('console.editModel') }}</h3>

            <form class="form-body" @submit.prevent="submitForm">
              <label class="form-field">
                <span class="form-label">{{ $t('console.modelKey') }}</span>
                <AppInput
                  v-model="form.model_key"
                  type="text"
                  :placeholder="'Qwen/Qwen2.5-7B'"
                  @blur="onKeyBlur"
                />
                <span v-if="keyError" class="form-error">{{ keyError }}</span>
              </label>
              <label class="form-field">
                <span class="form-label">{{ $t('console.nameZh') }}</span>
                <AppInput
                  v-model="form.name"
                  type="text"
                  :placeholder="$t('console.namePlaceholder')"
                  @blur="onNameBlur"
                />
                <span v-if="nameError" class="form-error">{{ nameError }}</span>
              </label>
              <label class="form-field">
                <span class="form-label">{{ $t('console.nameEn') }}</span>
                <AppInput
                  v-model="form.name_en"
                  type="text"
                  :placeholder="$t('console.nameEnPlaceholder')"
                  @blur="onNameEnBlur"
                />
                <span v-if="nameEnError" class="form-error">{{ nameEnError }}</span>
              </label>
              <div class="form-row">
                <label class="form-field">
                  <span class="form-label">{{ $t('console.provider') }}</span>
                  <AppSelect
                    v-model="form.provider"
                    :options="providerOptions"
                    :placeholder="$t('common.pleaseSelect')"
                  />
                </label>
                <label class="form-field">
                  <span class="form-label">{{ $t('console.sortOrder') }}</span>
                  <AppInput v-model="form.sort_order" type="number" :min="0" :step="1" />
                </label>
              </div>
              <div class="form-checks">
                <label class="form-check">
                  <input v-model="form.free" type="checkbox" />
                  <span>{{ $t('console.free') }}</span>
                </label>
                <label class="form-check">
                  <input v-model="form.vision" type="checkbox" />
                  <span>{{ $t('console.vision') }}</span>
                </label>
                <label class="form-check">
                  <input v-model="form.supports_search" type="checkbox" />
                  <span>{{ $t('console.supportsSearch') }}</span>
                </label>
                <label class="form-check">
                  <input v-model="form.enabled" type="checkbox" />
                  <span>{{ $t('console.enabled') }}</span>
                </label>
              </div>

              <p v-if="formError" class="form-error">{{ formError }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="formVisible = false">
                  {{ $t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="formSubmitting">
                  <AppLoading v-if="formSubmitting" :size="14" color="#fff" glow />
                  {{ $t('confirm.ok') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmModal
      v-model:visible="confirmVisible"
      :title="$t('console.deleteModelTitle')"
      :message="$t('console.deleteModelMessage', { key: deletingKey })"
      :confirming="confirmLoading"
      danger
      @confirm="doDelete"
      @cancel="confirmVisible = false"
    />

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

    <AppImport
      v-model:visible="importVisible"
      :title="$t('console.importModels')"
      table
      multiple
      :max-count="5"
      :max-size="10 * 1024 * 1024"
      :processor="processImportFile"
      @done="onImportDone"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminModel, ModelPayload } from '@/types/admin'
import {
  checkModelUniqueness,
  createAdminModel,
  deleteAdminModel,
  downloadModelTemplate,
  exportModelsCsv,
  fetchAdminModel,
  fetchAdminModels,
  fetchModelsTotal,
  fetchOperationLogs,
  importModelsCsv,
  updateAdminModel,
  type ModelsExportParams,
  type OperationLogItem
} from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/utils/format'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppImport, { type ImportSummary } from '@/components/common/AppImport.vue'
import AppExport from '@/components/common/AppExport.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import { useProviders } from '@/composables/useProviders'
import { useToast } from '@/composables/useToast'

const { t, locale } = useI18n()

/** 名称按语言环境渲染：英文优先 name_en，缺失回退中文名称 */
function displayName(m: { name: string; name_en?: string }): string {
  return locale.value === 'en' ? m.name_en || m.name : m.name
}
const { showToast } = useToast()
const auth = useAuthStore()

/** 模型管理权限：超级管理员 / 模型管理员 */
const canManageModels = computed(
  () => auth.user?.role === 'super_admin' || auth.user?.role === 'model_admin'
)

const models = ref<AdminModel[]>([])
const loading = ref(true)
const error = ref('')
const total = ref(0)

// 模型提供方数据字典：维表接口（按语言返回 name）优先，未配置时回退本地默认字典
const { providers, providerName } = useProviders()
// 表单提供商下拉选项（AppSelect 用 { label, value }）
const providerOptions = computed(() => providers.value.map((p) => ({ label: p.name, value: p.id })))

const currentPage = ref(1)
const pageSize = ref(10)
const enabledFilter = ref<boolean | null>(null)
const freeFilter = ref<boolean | null>(null)
const visionFilter = ref<boolean | null>(null)
const supportsSearchFilter = ref<boolean | null>(null)
const nameFilter = ref('')
const modelKeyFilter = ref('')
const providerFilter = ref<string[]>([])
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })

// 表格实例：用于重置表头筛选/排序高亮
const tableRef = ref<InstanceType<typeof AppTable> | null>(null)
// 重置进行中标志：避免重置分页时触发 watch 导致重复请求
let resetting = false

/** 重置：清除全部筛选与排序，分页回默认值，重新查询 */
function onReset() {
  resetting = true
  try {
    enabledFilter.value = null
    freeFilter.value = null
    visionFilter.value = null
    supportsSearchFilter.value = null
    nameFilter.value = ''
    modelKeyFilter.value = ''
    providerFilter.value = []
    sortFilter.value = { key: '', order: null }
    pageSize.value = 10
    currentPage.value = 1
    // 清除表格内部表头筛选/排序高亮
    tableRef.value?.resetState()
  } finally {
    resetting = false
  }
  load()
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchAdminModels({
      page: currentPage.value,
      pageSize: pageSize.value,
      enabled: enabledFilter.value === null ? undefined : enabledFilter.value,
      free: freeFilter.value === null ? undefined : freeFilter.value,
      vision: visionFilter.value === null ? undefined : visionFilter.value,
      supportsSearch: supportsSearchFilter.value === null ? undefined : supportsSearchFilter.value,
      name: nameFilter.value || undefined,
      modelKey: modelKeyFilter.value || undefined,
      providers: providerFilter.value.length ? providerFilter.value : undefined,
      sort: sortFilter.value.order ? sortFilter.value.key : undefined,
      order: sortFilter.value.order ?? undefined
    })
    models.value = res.items
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

// 服务端筛选：enabled/free/vision/supports_search 单选，provider 多选，name/model_key 模糊
function onFilterChange(filters: Record<string, any[]>) {
  const rawEnabled = filters.enabled?.[0]
  enabledFilter.value = typeof rawEnabled === 'boolean' ? rawEnabled : null
  const rawFree = filters.free?.[0]
  freeFilter.value = typeof rawFree === 'boolean' ? rawFree : null
  const rawVision = filters.vision?.[0]
  visionFilter.value = typeof rawVision === 'boolean' ? rawVision : null
  const rawSearch = filters.supports_search?.[0]
  supportsSearchFilter.value = typeof rawSearch === 'boolean' ? rawSearch : null
  const name = filters.name?.[0]
  nameFilter.value = typeof name === 'string' ? name : ''
  const modelKey = filters.model_key?.[0]
  modelKeyFilter.value = typeof modelKey === 'string' ? modelKey : ''
  providerFilter.value = (filters.provider ?? []).map(String)
  if (currentPage.value === 1) {
    load()
  } else {
    currentPage.value = 1
  }
}

watch(currentPage, () => {
  if (!resetting) load()
})
watch(pageSize, () => {
  if (!resetting) {
    currentPage.value = 1
    load()
  }
})

onMounted(load)

const columns = computed<TableColumn[]>(() => [
  {
    key: 'enabled',
    title: t('console.enabled'),
    width: 80,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.enabled'), value: true },
      { text: t('console.disabled'), value: false }
    ],
    // 后端返回 1/0，筛选值是布尔，需宽松比较
    filterMethod: (v: any, row: AdminModel) => Boolean(row.enabled) === Boolean(v)
  },
  {
    key: 'model_key',
    title: t('console.modelKey'),
    width: 210,
    ellipsis: true,
    sortable: true,
    className: 'cell-key',
    filterable: true,
    filterType: 'input',
    filterPlaceholder: t('common.search')
  },
  {
    key: 'name',
    title: t('console.name'),
    width: 150,
    ellipsis: true,
    sortable: true,
    formatter: (row: AdminModel) => displayName(row),
    filterable: true,
    filterType: 'input',
    filterPlaceholder: t('common.search')
  },
  {
    key: 'provider',
    title: t('console.provider'),
    width: 120,
    ellipsis: true,
    sortable: true,
    formatter: (row: AdminModel) => providerName(row.provider),
    filterable: true,
    filterType: 'checkbox',
    filters: providers.value.map((p) => ({ text: p.name, value: p.id }))
  },
  {
    key: 'free',
    title: t('console.free'),
    width: 80,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.free'), value: true },
      { text: t('console.paid'), value: false }
    ],
    filterMethod: (v: any, row: AdminModel) => Boolean(row.free) === Boolean(v)
  },
  {
    key: 'vision',
    title: t('console.vision'),
    width: 80,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.supports'), value: true },
      { text: t('console.notSupports'), value: false }
    ],
    filterMethod: (v: any, row: AdminModel) => Boolean(row.vision) === Boolean(v)
  },
  {
    key: 'supports_search',
    title: t('console.supportsSearch'),
    width: 90,
    align: 'center',
    filterable: true,
    filterType: 'radio',
    filters: [
      { text: t('console.supports'), value: true },
      { text: t('console.notSupports'), value: false }
    ],
    filterMethod: (v: any, row: AdminModel) => Boolean(row.supports_search) === Boolean(v)
  },
  { key: 'is_default', title: t('console.default'), width: 90, align: 'center' },
  { key: 'sort_order', title: t('console.sortOrder'), width: 100, align: 'right', sortable: true, className: 'cell-order' },
  ...(canManageModels.value
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

const toggleEnabled = async (m: AdminModel) => {
  // 默认模型不允许禁用：前端直接拦截，不打接口
  if (m.is_default && m.enabled) {
    showToast(t('console.defaultCannotDisable'), 'error')
    return
  }
  const target = { ...m, enabled: !m.enabled }
  try {
    await updateAdminModel(m.id, toPayload(target))
    m.enabled = target.enabled
    showToast(target.enabled ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  }
}

// 设为默认模型：后端会校验"禁用模型不能设默认"，并自动取消其它默认，保证全局唯一。
const setDefault = async (m: AdminModel) => {
  if (m.is_default || !m.enabled) return
  try {
    await updateAdminModel(m.id, { ...toPayload(m), is_default: true })
    models.value.forEach((x) => (x.is_default = x.id === m.id))
    showToast(t('console.defaultSet'), 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  }
}

const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formSubmitting = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)
const form = ref<ModelPayload>(emptyForm())

function emptyForm(): ModelPayload {
  return {
    model_key: '',
    name: '',
    name_en: '',
    provider: 'openai',
    free: false,
    vision: false,
    supports_search: true,
    enabled: true,
    sort_order: 100,
    is_default: false
  }
}

function toPayload(m: AdminModel): ModelPayload {
  return {
    model_key: m.model_key,
    name: m.name,
    name_en: m.name_en,
    provider: m.provider,
    free: m.free,
    vision: m.vision,
    supports_search: m.supports_search,
    enabled: m.enabled,
    sort_order: m.sort_order,
    is_default: m.is_default
  }
}

const openCreate = () => {
  formMode.value = 'create'
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  keyError.value = ''
  nameError.value = ''
  nameEnError.value = ''
  formVisible.value = true
}

const openEdit = async (m: AdminModel) => {
  formMode.value = 'edit'
  editingId.value = m.id
  formError.value = ''
  keyError.value = ''
  nameError.value = ''
  nameEnError.value = ''
  formVisible.value = true
  try {
    const detail = await fetchAdminModel(m.id)
    form.value = toPayload(detail)
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
    formVisible.value = false
  }
}

// —— 失焦轻量查重：model_key 同提供商内唯一；name / name_en 全局唯一（编辑排除自身）——
const keyError = ref('')
const nameError = ref('')
const nameEnError = ref('')

const CJK_RE = /[㐀-䶿一-鿿]/

async function onKeyBlur() {
  keyError.value = ''
  const key = form.value.model_key.trim()
  if (!key || /\s/.test(key)) return // 空值/含空白交给必填与后端 422 提示
  try {
    const r = await checkModelUniqueness({
      model_key: key,
      provider: form.value.provider,
      exclude_id: editingId.value ?? 0
    })
    if (r.model_key_exists) keyError.value = t('console.modelKeyExists')
  } catch {
    /* 网络异常不阻塞输入 */
  }
}

async function onNameBlur() {
  nameError.value = ''
  const name = form.value.name.trim()
  if (!name) return
  try {
    const r = await checkModelUniqueness({ name, exclude_id: editingId.value ?? 0 })
    if (r.name_exists) nameError.value = t('console.modelNameExists')
  } catch {
    /* 网络异常不阻塞输入 */
  }
}

async function onNameEnBlur() {
  nameEnError.value = ''
  const nameEn = form.value.name_en.trim()
  if (!nameEn) return
  if (CJK_RE.test(nameEn)) {
    nameEnError.value = t('console.nameEnHasChinese')
    return
  }
  if (nameEn.length > 100) {
    nameEnError.value = t('console.nameEnTooLong')
    return
  }
  try {
    const r = await checkModelUniqueness({ name_en: nameEn, exclude_id: editingId.value ?? 0 })
    if (r.name_en_exists) nameEnError.value = t('console.nameEnExists')
  } catch {
    /* 网络异常不阻塞输入 */
  }
}

watch(
  () => form.value.model_key,
  () => (keyError.value = '')
)
watch(
  () => form.value.name,
  () => (nameError.value = '')
)
watch(
  () => form.value.name_en,
  () => (nameEnError.value = '')
)

const submitForm = async () => {
  if (formSubmitting.value) return
  formError.value = ''
  form.value.model_key = form.value.model_key.trim()
  form.value.name = form.value.name.trim()
  form.value.name_en = form.value.name_en.trim()
  if (!form.value.model_key || !form.value.name) {
    formError.value = t('console.fillRequired')
    return
  }
  if (keyError.value || nameError.value || nameEnError.value) return
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await createAdminModel(form.value)
      showToast(t('console.addModelSuccess'), 'success')
    } else if (editingId.value != null) {
      await updateAdminModel(editingId.value, form.value)
      showToast(t('console.editModelSuccess'), 'success')
    }
    formVisible.value = false
    await load()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    formSubmitting.value = false
  }
}

const confirmVisible = ref(false)
const confirmLoading = ref(false)
const deletingKey = ref('')
const deletingId = ref<number | null>(null)

const askDelete = (m: AdminModel) => {
  deletingId.value = m.id
  deletingKey.value = m.model_key
  confirmVisible.value = true
}

const doDelete = async () => {
  if (deletingId.value == null) return
  confirmLoading.value = true
  try {
    await deleteAdminModel(deletingId.value)
    showToast(t('console.deleted'), 'success')
    confirmVisible.value = false
    await load()
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
    confirmVisible.value = false
  } finally {
    confirmLoading.value = false
  }
}

// —— 导入 / 导出 ——
const exporting = ref(false)
const templating = ref(false)
const importVisible = ref(false)

const onExport = async ({ scope }: { scope: 'filtered' | 'all' }) => {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: ModelsExportParams =
      scope === 'filtered'
        ? {
            scope,
            enabled: enabledFilter.value === null ? undefined : String(enabledFilter.value),
            free: freeFilter.value === null ? undefined : String(freeFilter.value),
            vision: visionFilter.value === null ? undefined : String(visionFilter.value),
            supports_search:
              supportsSearchFilter.value === null ? undefined : String(supportsSearchFilter.value),
            name: nameFilter.value || undefined,
            model_key: modelKeyFilter.value || undefined,
            provider: providerFilter.value.length ? providerFilter.value.join(',') : undefined,
            sort: sortFilter.value.order ? sortFilter.value.key : undefined,
            order: sortFilter.value.order ?? undefined
          }
        : { scope }
    const blob = await exportModelsCsv(params)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `models_${Date.now()}.xlsx`
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

const onDownloadTemplate = async () => {
  if (templating.value) return
  templating.value = true
  try {
    const blob = await downloadModelTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'models_template.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    templating.value = false
  }
}

// AppImport 逐文件处理器：返回详情文案 + 计数，供弹框状态与全局提示汇总
const processImportFile = async (file: File) => {
  const res = await importModelsCsv(file)
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

// 导入结束：全局提示；成功/部分成功 → page 置 1 刷新列表
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
    if (currentPage.value !== 1) currentPage.value = 1 // watch 触发 load
    else load()
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
    const res = await fetchOperationLogs('model', logsId.value, {
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

const openLogs = (m: AdminModel) => {
  logsId.value = m.id
  logsKey.value = `${displayName(m)} · ${m.model_key}`
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
.model-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.page-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: var(--transition-fast);
}

.page-btn--primary {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 4px 14px var(--color-glow);
}

.page-btn--primary:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
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

.model-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.model-table-wrap :deep(.app-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.model-table-wrap :deep(.app-table-scroll) {
  flex: 1;
  min-height: 0;
}

:deep(.cell-key) {
  font-family: var(--font-mono);
  color: var(--color-primary);
}

:deep(.cell-order) {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 11px;
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
  opacity: 0.45;
  cursor: not-allowed;
}

.default-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.default-btn.on {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
  cursor: default;
  opacity: 1 !important;
}

.star-char {
  color: var(--color-primary);
  text-shadow: 0 0 5px var(--color-primary), 0 0 10px var(--color-glow);
  font-size: 16px;
  line-height: 1;
  display: inline-block;
}

.default-btn.off:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.default-btn.blocked {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
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
  box-shadow: 0 0 8px rgba(255, 77, 94, 0.5);
}

.row-btn.is-disabled,
.row-btn.is-disabled:hover {
  opacity: 0.35;
  cursor: not-allowed;
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
  width: min(460px, 100%);
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
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
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

.form-checks {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.form-check input {
  accent-color: var(--color-primary);
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

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
