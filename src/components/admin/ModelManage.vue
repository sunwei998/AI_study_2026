<template>
  <div class="model-manage">
    <div class="page-toolbar">
      <AppButton v-if="canManageModels" size="middle" @click="openCreate">
        <AppIcon name="lucide:plus" :size="15" />
        {{ $t('console.addModel') }}
      </AppButton>
    </div>

    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="!error" class="model-table-wrap">
      <AppTable
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
                <span class="form-label">model_key</span>
                <AppInput v-model="form.model_key" type="text" :placeholder="'Qwen/Qwen2.5-7B'" />
              </label>
              <label class="form-field">
                <span class="form-label">{{ $t('console.name') }}</span>
                <AppInput v-model="form.name" type="text" :placeholder="$t('console.namePlaceholder')" />
              </label>
              <div class="form-row">
                <label class="form-field">
                  <span class="form-label">{{ $t('console.provider') }}</span>
                  <select v-model="form.provider" class="form-input">
                    <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminModel, ModelPayload } from '@/types/admin'
import {
  createAdminModel,
  deleteAdminModel,
  fetchAdminModel,
  fetchAdminModels,
  fetchSettings,
  updateAdminModel
} from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import { DEFAULT_PROVIDERS, type ModelProvider } from '@/config/models'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
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

// 模型提供方数据字典：默认取本地字典，若后台 settings.model_providers 已配置则覆盖
const providers = ref<ModelProvider[]>(DEFAULT_PROVIDERS)

const currentPage = ref(1)
const pageSize = ref(10)
const enabledFilter = ref<boolean | null>(null)
const freeFilter = ref<boolean | null>(null)
const providerFilter = ref<string[]>([])
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [res, settings] = await Promise.all([
      fetchAdminModels({
        page: currentPage.value,
        pageSize: pageSize.value,
        enabled: enabledFilter.value === null ? undefined : enabledFilter.value,
        free: freeFilter.value === null ? undefined : freeFilter.value,
        providers: providerFilter.value.length ? providerFilter.value : undefined,
        sort: sortFilter.value.order ? sortFilter.value.key : undefined,
        order: sortFilter.value.order ?? undefined
      }),
      fetchSettings({ search: 'model_providers' })
    ])
    models.value = res.items
    total.value = res.total
    const row = settings.items.find((s) => s.key === 'model_providers')
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as unknown
        if (Array.isArray(parsed)) {
          providers.value = parsed as ModelProvider[]
        }
      } catch {
        // JSON 解析失败时保留默认字典
      }
    }
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

// 服务端筛选：enabled/free 单选，provider 多选
function onFilterChange(filters: Record<string, any[]>) {
  const rawEnabled = filters.enabled?.[0]
  enabledFilter.value = typeof rawEnabled === 'boolean' ? rawEnabled : null
  const rawFree = filters.free?.[0]
  freeFilter.value = typeof rawFree === 'boolean' ? rawFree : null
  providerFilter.value = (filters.provider ?? []).map(String)
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
  { key: 'model_key', title: 'model_key', width: 210, ellipsis: true, sortable: true, className: 'cell-key' },
  { key: 'name', title: t('console.name'), width: 150, ellipsis: true, sortable: true },
  {
    key: 'provider',
    title: t('console.provider'),
    width: 120,
    ellipsis: true,
    sortable: true,
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
  { key: 'vision', title: t('console.vision'), width: 80, align: 'center' },
  { key: 'supports_search', title: t('console.supportsSearch'), width: 90, align: 'center' },
  { key: 'is_default', title: t('console.default'), width: 90, align: 'center' },
  { key: 'sort_order', title: t('console.sortOrder'), width: 100, align: 'right', sortable: true, className: 'cell-order' },
  ...(canManageModels.value
    ? [
        {
          key: 'actions',
          title: t('console.actions'),
          width: 100,
          align: 'center',
          fixed: 'right'
        } as TableColumn
      ]
    : [])
])

const toggleEnabled = async (m: AdminModel) => {
  const target = { ...m, enabled: !m.enabled }
  try {
    await updateAdminModel(m.id, toPayload(target))
    m.enabled = target.enabled
    showToast(target.enabled ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
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
    provider: 'openai',
    free: false,
    vision: false,
    supports_search: true,
    enabled: true,
    sort_order: 100,
    is_default: false
  }
}

function providerName(id: string): string {
  const p = providers.value.find((x) => x.id === id)
  return p?.name ?? id
}

function toPayload(m: AdminModel): ModelPayload {
  return {
    model_key: m.model_key,
    name: m.name,
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
  formVisible.value = true
}

const openEdit = async (m: AdminModel) => {
  formMode.value = 'edit'
  editingId.value = m.id
  formError.value = ''
  formVisible.value = true
  try {
    const detail = await fetchAdminModel(m.id)
    form.value = toPayload(detail)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
    formVisible.value = false
  }
}

const submitForm = async () => {
  if (formSubmitting.value) return
  formError.value = ''
  if (!form.value.model_key.trim() || !form.value.name.trim()) {
    formError.value = t('console.fillRequired')
    return
  }
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
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
    confirmVisible.value = false
  } finally {
    confirmLoading.value = false
  }
}
</script>

<style scoped>
.model-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  /* 父容器 gap:14px 基础上收紧，让按钮组与表格间距统一为 6px */
  margin-bottom: -8px;
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

  .page-toolbar {
    justify-content: stretch;
  }
}
</style>
