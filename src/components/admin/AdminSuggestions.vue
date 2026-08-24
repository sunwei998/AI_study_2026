<template>
  <div class="admin-suggestions">
    <div class="sugg-head">
      <div class="sugg-head-left">
        <span class="sugg-count">
          {{ $t('console.suggCount', { count: suggestions.length, shown: Math.min(suggestions.length, 6) }) }}
        </span>
      </div>
      <button class="sugg-add" @click="openCreate">
        <AppIcon name="lucide:plus" :size="15" />
        <span>{{ $t('console.suggAdd') }}</span>
      </button>
    </div>

    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
    </div>

    <div v-else class="sugg-table-wrap">
      <table class="sugg-table">
        <thead>
          <tr>
            <th>{{ $t('console.suggOrder') }}</th>
            <th>{{ $t('console.suggZh') }}</th>
            <th>{{ $t('console.suggEn') }}</th>
            <th>{{ $t('console.enabled') }}</th>
            <th>{{ $t('console.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in suggestions" :key="s.id">
            <td class="cell-num">{{ s.sort_order }}</td>
            <td class="cell-zh">{{ s.title_zh }}</td>
            <td class="cell-en">{{ s.title_en }}</td>
            <td>
              <button
                class="toggle"
                :class="{ on: s.enabled }"
                :title="s.enabled ? $t('console.disable') : $t('console.enable')"
                @click="toggleEnabled(s)"
              >
                <span class="toggle-knob"></span>
              </button>
            </td>
            <td>
              <div class="row-actions">
                <button class="row-btn" :title="$t('console.edit')" @click="openEdit(s)">
                  <AppIcon name="lucide:pencil" :size="15" />
                </button>
                <button class="row-btn" :title="$t('common.delete')" @click="askDelete(s)">
                  <AppIcon name="lucide:trash-2" :size="15" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="suggestions.length === 0">
            <td colspan="5" class="cell-empty">{{ $t('console.noSuggestions') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <Transition name="confirm" appear>
        <div v-if="formVisible" class="form-overlay" @click.self="formVisible = false">
          <div class="form-modal" role="dialog" aria-modal="true">
            <span class="form-accent-line"></span>
            <h3 class="form-title">{{ editingId ? $t('console.suggEdit') : $t('console.suggAdd') }}</h3>

            <form class="form-body" @submit.prevent="submit">
              <label class="form-field">
                <span class="form-label">{{ $t('console.suggZh') }}</span>
                <input v-model="form.title_zh" class="form-input" maxlength="60" required />
              </label>
              <label class="form-field">
                <span class="form-label">{{ $t('console.suggEn') }}</span>
                <input v-model="form.title_en" class="form-input" maxlength="60" required />
              </label>
              <div class="form-row">
                <label class="form-field form-field--sort">
                  <span class="form-label">{{ $t('console.suggOrder') }}</span>
                  <input v-model.number="form.sort_order" type="number" min="0" class="form-input" />
                </label>
                <label class="form-field form-field--toggle">
                  <span class="form-label">{{ $t('console.enabled') }}</span>
                  <button
                    type="button"
                    class="toggle"
                    :class="{ on: form.enabled }"
                    @click="form.enabled = !form.enabled"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </label>
              </div>

              <p v-if="formError" class="form-error">{{ formError }}</p>

              <div class="form-actions">
                <button type="button" class="form-btn form-btn--ghost" @click="formVisible = false">
                  {{ $t('confirm.cancel') }}
                </button>
                <button type="submit" class="form-btn form-btn--primary" :disabled="submitting">
                  <AppLoading v-if="submitting" :size="14" color="#fff" glow />
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
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SuggestionItem, SuggestionPayload } from '@/types/admin'
import {
  createAdminSuggestion,
  deleteAdminSuggestion,
  fetchAdminSuggestions,
  updateAdminSuggestion
} from '@/services/adminService'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { showToast } = useToast()

const suggestions = ref<SuggestionItem[]>([])
const loading = ref(true)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    suggestions.value = await fetchAdminSuggestions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const formVisible = ref(false)
const submitting = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)
const form = ref<SuggestionPayload>({ title_zh: '', title_en: '', sort_order: 0, enabled: true })

const openCreate = () => {
  editingId.value = null
  form.value = {
    title_zh: '',
    title_en: '',
    sort_order: suggestions.value.length + 1,
    enabled: true
  }
  formError.value = ''
  formVisible.value = true
}

const openEdit = (s: SuggestionItem) => {
  editingId.value = s.id
  form.value = {
    title_zh: s.title_zh,
    title_en: s.title_en,
    sort_order: s.sort_order,
    enabled: s.enabled
  }
  formError.value = ''
  formVisible.value = true
}

const submit = async () => {
  if (submitting.value) return
  formError.value = ''
  if (!form.value.title_zh.trim() || !form.value.title_en.trim()) {
    formError.value = t('console.suggRequired')
    return
  }
  submitting.value = true
  try {
    const payload: SuggestionPayload = {
      title_zh: form.value.title_zh.trim(),
      title_en: form.value.title_en.trim(),
      sort_order: form.value.sort_order || 0,
      enabled: form.value.enabled
    }
    if (editingId.value) {
      await updateAdminSuggestion(editingId.value, payload)
    } else {
      await createAdminSuggestion(payload)
    }
    formVisible.value = false
    await load()
    showToast(editingId.value ? t('console.saved') : t('console.created'), 'success')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    submitting.value = false
  }
}

const toggleEnabled = async (s: SuggestionItem) => {
  try {
    await updateAdminSuggestion(s.id, {
      title_zh: s.title_zh,
      title_en: s.title_en,
      sort_order: s.sort_order,
      enabled: !s.enabled
    })
    s.enabled = !s.enabled
    showToast(s.enabled ? t('console.enableSuccess') : t('console.disableSuccess'), 'success')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  }
}

const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmAction: (() => Promise<void>) | null = null

const askDelete = (s: SuggestionItem) => {
  confirmTitle.value = t('common.delete')
  confirmMessage.value = t('console.suggDeleteMessage', { name: s.title_zh })
  confirmAction = async () => {
    await deleteAdminSuggestion(s.id)
    suggestions.value = suggestions.value.filter((x) => x.id !== s.id)
    showToast(t('console.deleted'), 'success')
  }
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
</script>

<style scoped>
.admin-suggestions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.sugg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sugg-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.sugg-add {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px var(--color-glow);
  transition: var(--transition-normal);
}

.sugg-add:hover {
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

.sugg-table-wrap {
  flex: 1;
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 40%, transparent) transparent;
}

.sugg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.sugg-table th {
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

.sugg-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.sugg-table tbody tr:hover {
  background: var(--color-glass);
}

.cell-num {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.cell-zh {
  font-weight: 500;
}

.cell-en {
  color: var(--color-text-secondary);
}

.cell-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 32px !important;
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
  width: min(440px, 100%);
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

.form-row {
  display: flex;
  gap: 14px;
}

.form-field--sort {
  flex: 1;
}

.form-field--toggle {
  width: 90px;
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
