<template>
  <div class="model-manage">
    <div class="page-toolbar">
      <div class="page-search">
        <input
          v-model="search"
          type="text"
          class="page-input"
          :placeholder="$t('console.searchModels')"
        />
      </div>
      <button class="page-btn page-btn--primary" @click="openCreate">
        <AppIcon name="lucide:plus" :size="15" />
        {{ $t('console.addModel') }}
      </button>
    </div>

    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <TableLoading :rows="6" :cols="5" :text="$t('common.loading')" />
    </div>

    <div v-else class="model-table-wrap">
      <table class="model-table">
        <thead>
          <tr>
            <th>{{ $t('console.enabled') }}</th>
            <th>model_key</th>
            <th>{{ $t('console.name') }}</th>
            <th>{{ $t('console.provider') }}</th>
            <th>{{ $t('console.free') }}</th>
            <th>{{ $t('console.vision') }}</th>
            <th>{{ $t('console.supportsSearch') }}</th>
            <th>{{ $t('console.default') }}</th>
            <th>{{ $t('console.sortOrder') }}</th>
            <th class="actions-th">{{ $t('console.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in pagedFiltered" :key="m.id">
            <td>
              <button
                class="toggle"
                :class="{ on: m.enabled }"
                :title="m.enabled ? $t('console.disable') : $t('console.enable')"
                @click="toggleEnabled(m)"
              >
                <span class="toggle-knob"></span>
              </button>
            </td>
            <td class="cell-key">{{ m.model_key }}</td>
            <td>{{ m.name }}</td>
            <td><span class="badge">{{ providerName(m.provider) }}</span></td>
            <td>
              <AppIcon
                :name="m.free ? 'lucide:check-circle' : 'lucide:circle'"
                :size="16"
                :glow="m.free"
              />
            </td>
            <td>
              <AppIcon
                :name="m.vision ? 'lucide:check-circle' : 'lucide:circle'"
                :size="16"
                :glow="m.vision"
              />
            </td>
            <td>
              <AppIcon
                :name="m.supports_search ? 'lucide:check-circle' : 'lucide:circle'"
                :size="16"
                :glow="m.supports_search"
              />
            </td>
            <td>
              <button
                class="default-btn"
                :class="{ on: m.is_default, off: !m.is_default, blocked: !m.enabled }"
                :title="
                  m.is_default
                    ? $t('console.defaultModel')
                    : m.enabled
                      ? $t('console.setDefault')
                      : $t('console.defaultDisabledHint')
                "
                :disabled="m.is_default || !m.enabled"
                @click="setDefault(m)"
              >
                <span v-if="m.is_default" class="star-char">★</span>
                <AppIcon v-else name="lucide:star" :size="16" />
              </button>
            </td>
            <td class="cell-order">{{ m.sort_order }}</td>
            <td class="actions-td">
              <div class="row-actions">
                <button class="row-btn" :title="$t('console.edit')" @click="openEdit(m)">
                  <AppIcon name="lucide:pencil" :size="15" />
                </button>
                <button class="row-btn row-btn--danger" :title="$t('console.delete')" @click="askDelete(m)">
                  <AppIcon name="lucide:trash-2" :size="15" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="10" class="cell-empty">{{ $t('console.noModels') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      :total="filtered.length"
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
                <input v-model="form.model_key" type="text" class="form-input" :placeholder="'Qwen/Qwen2.5-7B'" />
              </label>
              <label class="form-field">
                <span class="form-label">{{ $t('console.name') }}</span>
                <input v-model="form.name" type="text" class="form-input" :placeholder="$t('console.namePlaceholder')" />
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
                  <input v-model.number="form.sort_order" type="number" class="form-input" />
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
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import TableLoading from '@/components/common/TableLoading.vue'
import Pagination from '@/components/common/Pagination.vue'
import { DEFAULT_PROVIDERS, type ModelProvider } from '@/config/models'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { showToast } = useToast()

const models = ref<AdminModel[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')

// 模型提供方数据字典：默认取本地字典，若后台 settings.model_providers 已配置则覆盖
const providers = ref<ModelProvider[]>(DEFAULT_PROVIDERS)

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return models.value
  return models.value.filter(
    (m) => m.model_key.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw)
  )
})

const currentPage = ref(1)
const pageSize = ref(10)

const pagedFiltered = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch(search, () => {
  currentPage.value = 1
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [list, settings] = await Promise.all([fetchAdminModels(), fetchSettings()])
    models.value = list
    const row = settings.find((s) => s.key === 'model_providers')
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

onMounted(load)

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

// 设为默认模型：后端会校验“禁用模型不能设默认”，并自动取消其它默认，保证全局唯一。
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
  justify-content: space-between;
  gap: 12px;
}

.page-search {
  flex: 1;
  max-width: 320px;
}

.page-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  transition: var(--transition-normal);
}

.page-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
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

.page-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.model-table-wrap {
  flex: 1;
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 40%, transparent) transparent;
}

.model-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.model-table th {
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

.model-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.model-table tbody tr:hover {
  background: var(--color-glass);
}

.cell-key {
  font-family: var(--font-mono);
  color: var(--color-primary);
}

.cell-order {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.cell-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 32px !important;
}

.actions-th,
.actions-td {
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: -6px 0 12px rgba(0, 0, 0, 0.18);
}

.actions-th {
  top: 0;
  z-index: 3;
  background: var(--color-glass);
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
    flex-direction: column;
    align-items: stretch;
  }

  .page-search {
    max-width: none;
  }
}
</style>