<template>
  <div class="admin-settings-base">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <TableLoading :rows="6" :cols="4" :text="$t('common.loading')" />
    </div>

    <div v-else class="settings-body">
      <div class="settings-toolbar">
        <button class="page-btn page-btn--primary" @click="openAdd">
          <AppIcon name="lucide:plus" :size="15" />
          {{ $t('console.addSetting') }}
        </button>
      </div>

      <div class="settings-table-wrap">
        <table class="settings-table">
          <thead>
            <tr>
              <th>{{ $t('console.key') }}</th>
              <th>{{ $t('console.value') }}</th>
              <th>{{ $t('console.remark') }}</th>
              <th>{{ $t('console.status') }}</th>
              <th>{{ $t('console.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in settings" :key="s.key">
              <td class="cell-key">{{ s.key }}</td>
              <td class="cell-value">
                <AppInput
                  v-model="s.value"
                  type="text"
                  size="small"
                  :data-key="s.key"
                  @keydown.enter="save(s)"
                />
              </td>
              <td class="cell-remark">
                <AppInput
                  v-model="s.remark"
                  type="text"
                  size="small"
                  :placeholder="$t('console.remarkPlaceholder')"
                  @keydown.enter="save(s)"
                />
              </td>
              <td class="cell-status">
                <button
                  class="switch"
                  :class="{ on: s.enabled }"
                  :aria-pressed="s.enabled"
                  :title="s.enabled ? $t('console.enabled') : $t('console.disabled')"
                  @click="toggle(s)"
                >
                  <span class="switch-knob"></span>
                </button>
              </td>
              <td>
                <div class="row-actions">
                  <button class="row-btn" :title="$t('console.save')" @click="save(s)">
                    <AppIcon name="lucide:save" :size="15" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="total === 0">
              <td colspan="5" class="cell-empty">{{ $t('console.noSettings') }}</td>
            </tr>
          </tbody>
        </table>
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
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SettingItem } from '@/types/admin'
import { fetchSettings, updateSetting } from '@/services/adminService'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import TableLoading from '@/components/common/TableLoading.vue'
import Pagination from '@/components/common/Pagination.vue'
import AppInput from '@/components/common/AppInput.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { showToast } = useToast()

const settings = ref<SettingItem[]>([])
const loading = ref(true)
const error = ref('')
const savingKey = ref('')
const total = ref(0)

const currentPage = ref(1)
const pageSize = ref(10)
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchSettings({ page: currentPage.value, pageSize: pageSize.value })
    settings.value = res.items
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}
watch(currentPage, load)
watch(pageSize, () => {
  currentPage.value = 1
  load()
})



onMounted(load)

const save = async (s: SettingItem) => {
  if (savingKey.value === s.key) return
  savingKey.value = s.key
  error.value = ''
  try {
    await updateSetting(s.key, { value: s.value, remark: s.remark })
    showToast(t('console.saved'), 'success')
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

.page-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.settings-toolbar {
  display: flex;
  justify-content: flex-end;
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
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  box-shadow: inset 0 1px 0 var(--glass-edge);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 40%, transparent) transparent;
}

.settings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.settings-table th {
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

.settings-table td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.cell-key {
  font-family: var(--font-mono);
  color: var(--color-primary);
  white-space: nowrap;
}

.cell-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 32px !important;
}

.value-input {
  width: 100%;
  min-width: 220px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  transition: var(--transition-normal);
}

.value-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.cell-remark .value-input,
.cell-value .value-input {
  min-width: 160px;
}

.cell-status {
  text-align: center;
}

.switch {
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: var(--transition-normal);
  flex-shrink: 0;
}

.switch .switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background var(--transition-fast);
}

.switch.on {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 10px var(--color-glow);
}

.switch.on .switch-knob {
  transform: translateX(20px);
  background: #fff;
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

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.25s ease;
}

.confirm-enter-active .form-modal,
.confirm-leave-active .form-modal {
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

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .form-modal,
.confirm-leave-to .form-modal {
  transform: translateY(16px) scale(0.92);
  opacity: 0;
}
</style>
