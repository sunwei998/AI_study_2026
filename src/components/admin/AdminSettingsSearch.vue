<template>
  <div class="admin-settings-search">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
    </div>

    <div v-else class="search-settings-body">
      <div class="settings-section">
        <h3 class="section-title">
          <AppIcon name="lucide:search" :size="18" />
          {{ $t('console.searchProviders') }}
        </h3>
        <p class="section-desc">{{ $t('console.searchProvidersDesc') }}</p>

        <div class="providers-list">
          <div
            v-for="(provider, index) in providers"
            :key="provider.id"
            class="provider-item"
            :class="{ dragging: dragIndex === index }"
          >
            <div class="provider-drag-handle" @mousedown="onDragStart($event, index)">
              <AppIcon name="lucide:grip-vertical" :size="16" />
            </div>

            <div class="provider-info">
              <label class="provider-checkbox">
                <input
                  type="checkbox"
                  v-model="provider.enabled"
                  @change="onProviderToggle(provider)"
                >
                <span class="checkmark"></span>
              </label>

              <div class="provider-details">
                <span class="provider-name">{{ provider.label }}</span>
                <span class="provider-id">{{ provider.id }}</span>
              </div>
            </div>

            <div class="provider-actions">
              <button
                v-if="provider.id === 'searxng'"
                class="provider-btn provider-btn--test"
                @click="testSearxngConnection"
                :disabled="testingSearxng"
              >
                <AppLoading v-if="testingSearxng" :size="14" />
                <AppIcon v-else name="lucide:wifi" :size="15" />
                <span>{{ $t('console.testConnection') }}</span>
              </button>

              <div class="drag-handle" @mousedown="onDragStart($event, index)">
                <AppIcon name="lucide:grip-vertical" :size="16" />
              </div>
            </div>
          </div>

          <p v-if="providers.length === 0" class="empty-state">{{ $t('console.noProviders') }}</p>
        </div>

        <div class="section-actions">
          <button class="page-btn page-btn--primary" @click="saveProviders">
            <AppLoading v-if="saving" :size="14" color="#fff" glow />
            {{ $t('confirm.save') }}
          </button>
        </div>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-section" v-if="searxngProvider">
        <h3 class="section-title">
          <AppIcon name="lucide:server" :size="18" />
          {{ $t('console.searxngConfig') }}
        </h3>

        <div class="form-grid">
          <label class="form-field">
            <span class="form-label">{{ $t('console.searxngUrl') }}</span>
            <input
              v-model="searxngUrl"
              type="url"
              class="form-input"
              :placeholder="$t('console.searxngUrlPlaceholder')"
            />
          </label>

          <label class="form-field">
            <span class="form-label">{{ $t('console.searxngTimeout') }}</span>
            <input
              v-model.number="searxngTimeout"
              type="number"
              class="form-input"
              min="5"
              :max="60"
              :placeholder="$t('console.searxngTimeoutPlaceholder')"
            />
          </label>
        </div>

        <div class="section-actions">
          <button class="page-btn page-btn--primary" @click="saveSearxngConfig">
            <AppLoading v-if="savingSearxng" :size="14" color="#fff" glow />
            {{ $t('confirm.save') }}
          </button>
        </div>

        <div class="test-connection-area">
          <button
            class="page-btn page-btn--ghost"
            @click="testSearxngConnection"
            :disabled="testingSearxng"
          >
            <AppLoading v-if="testingSearxng" :size="14" />
            <AppIcon v-else name="lucide:wifi" :size="15" />
            <span>{{ $t('console.testConnection') }}</span>
          </button>

          <span v-if="testResult !== null" :class="['test-result', testResult ? 'success' : 'error']">
            <AppIcon :name="testResult ? 'lucide:check-circle' : 'lucide:x-circle'" :size="14" />
            <span>{{ testResult ? $t('console.testSuccess') : $t('console.testFailed') }}</span>
          </span>
        </div>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-section">
        <h3 class="section-title">
          <AppIcon name="lucide:cog" :size="18" />
          {{ $t('console.advancedSearchSettings') }}
        </h3>

        <div class="form-grid">
          <label class="form-field">
            <span class="form-label">{{ $t('console.maxResults') }}</span>
            <input
              v-model.number="maxResults"
              type="number"
              class="form-input"
              min="1"
              max="20"
            />
          </label>

          <label class="form-field">
            <span class="form-label">{{ $t('console.maxPagesFetch') }}</span>
            <input
              v-model.number="maxPagesFetch"
              type="number"
              class="form-input"
              min="1"
              max="10"
            />
          </label>

          <label class="form-field form-field--toggle">
            <span class="form-label">{{ $t('console.fetchContent') }}</span>
            <button
              type="button"
              class="toggle"
              :class="{ on: fetchContentEnabled }"
              @click="fetchContentEnabled = !fetchContentEnabled"
            >
              <span class="toggle-knob"></span>
            </button>
          </label>

          <label class="form-field">
            <span class="form-label">{{ $t('console.maxContentLength') }}</span>
            <input
              v-model.number="maxContentLength"
              type="number"
              class="form-input"
              min="2000"
              max="50000"
              step="1000"
            />
          </label>
        </div>

        <div class="section-actions">
          <button class="page-btn page-btn--primary" @click="saveAdvancedSettings">
            <AppLoading v-if="savingAdvanced" :size="14" color="#fff" glow />
            {{ $t('confirm.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchSettings, updateSetting } from '@/services/adminService'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { showToast } = useToast()

interface SearchProvider {
  id: string
  label: string
  enabled: boolean
}

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const savingSearxng = ref(false)
const savingAdvanced = ref(false)
const testingSearxng = ref(false)

const providers = ref<SearchProvider[]>([])
const searxngUrl = ref('')
const searxngTimeout = ref(10)
const testResult = ref<null | boolean>(null)
const dragIndex = ref<number | null>(null)

const maxResults = ref(6)
const maxPagesFetch = ref(3)
const fetchContentEnabled = ref(true)
const maxContentLength = ref(12000)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const settings = await fetchSettings()
    const row = settings.find((s) => s.key === 'websearch_providers')
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value)
        // 兼容旧数据：字符串数组 -> 归一化为对象数组 {id,label,enabled}
        providers.value = Array.isArray(parsed)
          ? parsed.map((p) =>
              typeof p === 'string'
                ? {
                    id: p,
                    label: providerOptions.find((o) => o.id === p)?.label || p,
                    enabled: true
                  }
                : p
            )
          : []
      } catch {
        // 使用默认值
      }
    }
    const urlRow = settings.find((s) => s.key === 'searxng_url')
    if (urlRow) searxngUrl.value = urlRow.value
    const timeoutRow = settings.find((s) => s.key === 'searxng_timeout')
    if (timeoutRow) searxngTimeout.value = parseInt(timeoutRow.value) || 10
    const contentRow = settings.find((s) => s.key === 'websearch_fetch_content')
    if (contentRow) fetchContentEnabled.value = contentRow.value === 'true'
    const pagesRow = settings.find((s) => s.key === 'websearch_max_pages')
    if (pagesRow) maxPagesFetch.value = parseInt(pagesRow.value) || 3
    const resultsRow = settings.find((s) => s.key === 'websearch_max_results')
    if (resultsRow) maxResults.value = parseInt(resultsRow.value) || 6
    const contentLenRow = settings.find((s) => s.key === 'websearch_max_content')
    if (contentLenRow) maxContentLength.value = parseInt(contentLenRow.value) || 12000
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const providerOptions = [
  { id: 'baidu', label: '百度 (中文最佳)' },
  { id: 'searxng', label: 'SearXNG (推荐)' },
  { id: 'bing', label: 'Bing RSS' },
  { id: 'ddg', label: 'DuckDuckGo HTML' }
]

const searxngProvider = computed(() => providers.value.find((p) => p.id === 'searxng'))

function onDragStart(event: MouseEvent, index: number) {
  dragIndex.value = index
}

function ensureProvider(opt: { id: string; label: string }) {
  if (!providers.value.find((p) => p.id === opt.id)) {
    providers.value.push({ ...opt, enabled: false })
  }
}

onMounted(() => {
  providerOptions.forEach(ensureProvider)
  load()
})

function onProviderToggle(provider: SearchProvider) {
  if (!provider.enabled && providers.value.filter((p) => p.enabled).length === 0) {
    provider.enabled = true
    showToast(t('console.atLeastOneProvider'), 'error')
  }
}

async function saveProviders() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await updateSetting('websearch_providers', { value: JSON.stringify(providers.value) })
    showToast(t('console.saved'), 'success')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    saving.value = false
  }
}

async function testSearxngConnection() {
  if (testingSearxng.value) return
  testingSearxng.value = true
  testResult.value = null
  try {
    const url = searxngUrl.value.trim()
    if (!url) {
      throw new Error(t('console.searxngUrlRequired'))
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const resp = await fetch(`${url.replace(/\/$/, '')}/search?q=test&format=json`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    clearTimeout(timeoutId)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format')
    }
    testResult.value = true
    showToast(t('console.testSuccess'), 'success')
  } catch (err) {
    testResult.value = false
    showToast(err instanceof Error ? err.message : t('console.testFailed'), 'error')
  } finally {
    testingSearxng.value = false
  }
}

async function saveSearxngConfig() {
  if (savingSearxng.value) return
  savingSearxng.value = true
  error.value = ''
  try {
    await Promise.all([
      updateSetting('searxng_url', { value: searxngUrl.value }),
      updateSetting('searxng_timeout', { value: String(searxngTimeout.value) })
    ])
    showToast(t('console.saved'), 'success')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    savingSearxng.value = false
  }
}

async function saveAdvancedSettings() {
  if (savingAdvanced.value) return
  savingAdvanced.value = true
  error.value = ''
  try {
    await Promise.all([
      updateSetting('websearch_max_results', { value: String(maxResults.value) }),
      updateSetting('websearch_max_pages', { value: String(maxPagesFetch.value) }),
      updateSetting('websearch_fetch_content', { value: fetchContentEnabled.value ? 'true' : 'false' }),
      updateSetting('websearch_max_content', { value: String(maxContentLength.value) })
    ])
    showToast(t('console.saved'), 'success')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    savingAdvanced.value = false
  }
}
</script>

<script lang="ts">
import type { SearchProvider } from '@/types/admin'
</script>

<style scoped>
.admin-settings-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
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
  min-height: 240px;
}

.settings-section {
  padding: 20px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.section-desc {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: var(--transition-normal);
}

.provider-item.dragging {
  opacity: 0.6;
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow);
}

.provider-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  color: var(--color-text-secondary);
  cursor: grab;
}

.provider-drag-handle:hover {
  color: var(--color-primary);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.provider-checkbox {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.provider-checkbox input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-checkbox input:checked + .checkmark {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}

.provider-checkbox input:checked + .checkmark::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.provider-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.provider-name {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: var(--transition-fast);
}

.provider-btn--test {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
}

.provider-btn--test:hover:not(:disabled) {
  box-shadow: 0 0 10px var(--color-glow);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.provider-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
  cursor: grab;
  border-radius: 8px;
}

.drag-handle:hover {
  color: var(--color-primary);
  background: var(--color-glass);
}

.section-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.settings-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field--toggle {
  align-items: center;
}

.form-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.form-input {
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  outline: none;
  transition: var(--transition-normal);
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.toggle {
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

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.toggle {
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

.toggle .toggle-knob {
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

.toggle.on {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 10px var(--color-glow);
}

.toggle.on .toggle-knob {
  transform: translateX(20px);
  background: #fff;
}

.section-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.test-connection-area {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.test-result {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: var(--font-mono);
}

.test-result.success {
  color: #34d399;
}

.test-result.error {
  color: #ff5b6a;
}
</style>