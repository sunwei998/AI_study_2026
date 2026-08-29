<template>
  <Teleport to="body">
    <Transition name="aim" appear>
      <div v-if="visible" class="aim-overlay" @click.self="tryClose">
        <div
          ref="modalEl"
          class="aim-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="dialogTitle"
        >
          <span class="aim-corner aim-corner--tl"></span>
          <span class="aim-corner aim-corner--tr"></span>
          <span class="aim-corner aim-corner--bl"></span>
          <span class="aim-corner aim-corner--br"></span>
          <span class="aim-accent-line"></span>

          <header class="aim-head">
            <div class="aim-head__icon">
              <AppIcon name="lucide:upload-cloud" :size="19" />
            </div>
            <h3 class="aim-head__title">{{ dialogTitle }}</h3>
            <button
              type="button"
              class="aim-close"
              :title="$t('common.close')"
              :disabled="processing"
              @click="tryClose"
            >
              <AppIcon name="lucide:x" :size="16" />
            </button>
          </header>

          <!-- 约束提示：支持格式 / 大小上限 / 文件模式 -->
          <div class="aim-constraints">
            <div class="aim-constraint">
              <span class="aim-constraint__label">{{ $t('common.importFormats') }}</span>
              <span v-if="typeChips.length" class="aim-chips">
                <i v-for="c in typeChips" :key="c" class="aim-chip">{{ c }}</i>
              </span>
              <span v-else class="aim-constraint__value">—</span>
            </div>
            <div class="aim-constraint">
              <span class="aim-constraint__label">{{ $t('common.importSizeLimit') }}</span>
              <span class="aim-constraint__value">
                {{ props.maxSize > 0 ? `≤ ${formatFileSize(props.maxSize)}` : '—' }}
              </span>
            </div>
            <div class="aim-constraint">
              <span class="aim-constraint__label">{{ $t('common.importMode') }}</span>
              <span class="aim-constraint__value">
                {{ modeText }}
              </span>
            </div>
          </div>

          <!-- 拖拽区 -->
          <div
            class="aim-dropzone"
            :class="{ 'is-dragover': dragover, 'is-disabled': disabled || processing }"
            role="button"
            tabindex="0"
            :aria-label="$t('common.importDropTitle')"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="dragover = false"
            @drop.prevent="onDrop"
            @click="openPicker"
            @keydown.enter.prevent="openPicker"
          >
            <div class="aim-dropzone__icon">
              <AppIcon name="lucide:file-up" :size="28" />
            </div>
            <p class="aim-dropzone__title">{{ $t('common.importDropTitle') }}</p>
            <p class="aim-dropzone__hint">{{ hint || $t('common.importDropHint') }}</p>
            <input
              ref="fileRef"
              type="file"
              class="aim-hidden"
              :accept="effectiveAccept"
              :multiple="multiple"
              :disabled="disabled || processing"
              @change="onPick"
            />
          </div>

          <!-- 文件列表：逐文件校验状态 -->
          <div v-if="items.length" class="aim-list">
            <div
              v-for="(it, idx) in items"
              :key="`${it.file.name}-${it.file.size}-${idx}`"
              class="aim-item"
              :class="`aim-item--${it.status}`"
            >
              <span class="aim-item__ext">{{ extOf(it.file) }}</span>
              <div class="aim-item__meta">
                <span class="aim-item__name">{{ it.file.name }}</span>
                <span class="aim-item__sub">
                  {{ formatFileSize(it.file.size) }}
                  <em class="aim-item__msg">· {{ it.message || statusText(it.status) }}</em>
                </span>
              </div>
              <AppLoading v-if="it.status === 'uploading'" :size="13" />
              <AppIcon v-else-if="it.status === 'success'" name="lucide:check-circle-2" :size="15" class="aim-item__ok" />
              <AppIcon v-else-if="it.status === 'warn'" name="lucide:alert-triangle" :size="15" class="aim-item__warn" />
              <AppIcon v-else-if="it.status === 'error'" name="lucide:x-circle" :size="15" class="aim-item__err" />
              <button
                v-if="!processing"
                type="button"
                class="aim-item__remove"
                :title="$t('common.remove')"
                @click="remove(idx)"
              >
                <AppIcon name="lucide:x" :size="13" />
              </button>
            </div>
          </div>

          <footer class="aim-foot">
            <span class="aim-foot__summary">
              {{ summary || (items.length ? `${items.length} ${$t('common.importFilesUnit')}` : $t('common.importEmpty')) }}
            </span>
            <div class="aim-foot__actions">
              <button
                v-if="items.length && !processing && !allDone"
                type="button"
                class="aim-btn aim-btn--ghost"
                @click="clear"
              >
                {{ $t('common.importClearAll') }}
              </button>
              <button
                type="button"
                class="aim-btn aim-btn--ghost"
                :disabled="processing"
                @click="tryClose"
              >
                {{ $t('confirm.cancel') }}
              </button>
              <button
                type="button"
                class="aim-btn aim-btn--primary"
                :disabled="processing || (!allDone && readyCount === 0)"
                @click="start"
              >
                <AppLoading v-if="processing" :size="13" color="#fff" glow />
                <AppIcon v-else :name="allDone ? 'lucide:check' : 'lucide:play'" :size="14" />
                {{ processing ? $t('common.importUploading') : allDone ? $t('common.importDone') : $t('common.importStart') }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import AppLoading from '@/components/common/AppLoading.vue'
import { useToast } from '@/composables/useToast'
import { formatFileSize } from '@/utils/download'

/** 单文件处理结果：字符串 = 成功详情；warn = 部分成功 */
export type ImportProcessorResult = string | { message: string; warn?: boolean }
export type ImportProcessor = (file: File) => Promise<ImportProcessorResult>

interface ImportItem {
  file: File
  status: 'ready' | 'uploading' | 'success' | 'warn' | 'error'
  message?: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    hint?: string
    accept?: string
    multiple?: boolean
    maxCount?: number
    maxSize?: number
    disabled?: boolean
    table?: boolean
    processor?: ImportProcessor
  }>(),
  {
    title: '',
    hint: '',
    accept: '',
    multiple: false,
    maxCount: 0,
    maxSize: 0,
    disabled: false,
    table: false,
    processor: undefined
  }
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', files: File[]): void
  (e: 'change', files: File[]): void
  (e: 'done'): void
}>()

const { t } = useI18n()
const { showToast } = useToast()

const dragover = ref(false)
const processing = ref(false)
const processedOnce = ref(false)
const items = ref<ImportItem[]>([])
const fileRef = ref<HTMLInputElement | null>(null)
const modalEl = ref<HTMLElement | null>(null)

const dialogTitle = computed(() => props.title || t('common.importDialogTitle'))

// 表格模式：默认接受 CSV/Excel 表格文件
const effectiveAccept = computed(() => {
  if (props.accept) return props.accept
  if (props.table)
    return '.csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return ''
})

const modeText = computed(() => {
  if (!props.multiple) return t('common.importSingle')
  if (props.maxCount > 0) return `${t('common.importMultiple')} · ${t('common.importMaxCountTip', { n: props.maxCount })}`
  return t('common.importMultiple')
})

// 从 accept 解析格式提示 chips：.xlsx → XLSX，MIME 做常见映射
const typeChips = computed(() => {
  const acc = effectiveAccept.value
  if (!acc) return [] as string[]
  const chips: string[] = []
  for (const raw of acc.split(',')) {
    const tok = raw.trim()
    if (!tok) continue
    let chip: string | null = null
    if (tok.startsWith('.')) chip = tok.slice(1).toUpperCase()
    else {
      const m = tok.toLowerCase()
      if (m.includes('csv')) chip = 'CSV'
      else if (m.includes('spreadsheetml')) chip = 'XLSX'
      else if (m.includes('ms-excel')) chip = 'XLS'
      else if (m.includes('json')) chip = 'JSON'
      else if (m.startsWith('text/')) chip = 'TEXT'
      else chip = (m.split('/')[1] ?? '').toUpperCase() || null
    }
    if (chip && !chips.includes(chip)) chips.push(chip)
  }
  return chips
})

const readyCount = computed(() => items.value.filter((i) => i.status === 'ready').length)
const allDone = computed(
  () =>
    processedOnce.value &&
    items.value.length > 0 &&
    items.value.every((i) => i.status === 'success' || i.status === 'warn' || i.status === 'error')
)

const summary = computed(() => {
  if (!processedOnce.value) return ''
  const ok = items.value.filter((i) => i.status === 'success' || i.status === 'warn').length
  const fail = items.value.filter((i) => i.status === 'error').length
  return t('common.importSummary', { ok, fail })
})

function statusText(status: ImportItem['status']): string {
  switch (status) {
    case 'ready':
      return t('common.importStatusReady')
    case 'uploading':
      return t('common.importStatusUploading')
    case 'success':
      return t('common.importStatusSuccess')
    case 'warn':
      return t('common.importStatusWarn')
    default:
      return t('common.importStatusError')
  }
}

function extOf(f: File): string {
  const ext = f.name.split('.').pop() ?? ''
  return (ext && ext.length <= 5 ? ext : 'file').toUpperCase()
}

function typeOk(file: File): boolean {
  const acc = effectiveAccept.value
  if (!acc) return true
  return acc.split(',').some((a) => {
    const tok = a.trim().toLowerCase()
    if (tok.startsWith('.')) return file.name.toLowerCase().endsWith(tok)
    if (tok.endsWith('/*')) return file.type.startsWith(tok.slice(0, -1))
    return file.type.toLowerCase() === tok
  })
}

function addFiles(list: FileList | File[] | null) {
  if (!list || processing.value) return
  const incoming = Array.from(list)
  for (const f of incoming) {
    if (props.multiple && props.maxCount > 0 && items.value.length >= props.maxCount) {
      showToast(t('common.importCountExceeded', { n: props.maxCount }), 'error')
      break
    }
    // 去重：同名同大小视为同一文件
    if (items.value.some((i) => i.file.name === f.name && i.file.size === f.size)) continue
    if (!typeOk(f)) {
      items.value.push({ file: f, status: 'error', message: t('common.importTypeMismatch') })
      continue
    }
    if (props.maxSize > 0 && f.size > props.maxSize) {
      items.value.push({
        file: f,
        status: 'error',
        message: `${t('common.importTooLarge')}（> ${formatFileSize(props.maxSize)}）`
      })
      continue
    }
    if (!props.multiple) items.value = []
    items.value.push({ file: f, status: 'ready' })
  }
  processedOnce.value = false
  emit('change', items.value.filter((i) => i.status === 'ready').map((i) => i.file))
}

function onDragOver() {
  if (props.disabled || processing.value) return
  dragover.value = true
}

function onDrop(e: DragEvent) {
  dragover.value = false
  if (props.disabled || processing.value) return
  addFiles(e.dataTransfer?.files ?? null)
}

function openPicker() {
  if (props.disabled || processing.value) return
  fileRef.value?.click()
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

function remove(idx: number) {
  items.value.splice(idx, 1)
  if (!items.value.length) processedOnce.value = false
  emit('change', items.value.filter((i) => i.status === 'ready').map((i) => i.file))
}

function clear() {
  items.value = []
  processedOnce.value = false
  emit('change', [])
}

async function start() {
  if (processing.value) return
  if (allDone.value) {
    tryClose()
    return
  }
  const ready = items.value.filter((i) => i.status === 'ready')
  if (!ready.length) {
    showToast(t('common.importNoReady'), 'error')
    return
  }
  // 无 processor：交给父组件处理（保持旧契约）
  if (!props.processor) {
    const files = ready.map((i) => i.file)
    emit('confirm', files)
    emit('change', files)
    tryClose()
    return
  }
  processing.value = true
  for (const item of ready) {
    item.status = 'uploading'
    item.message = ''
    try {
      const res = await props.processor(item.file)
      const isWarn = typeof res === 'object' && res.warn === true
      item.status = isWarn ? 'warn' : 'success'
      item.message = typeof res === 'string' ? res : res.message
    } catch (err) {
      item.status = 'error'
      item.message = err instanceof Error ? err.message : t('common.errorOccurred')
    }
  }
  processing.value = false
  processedOnce.value = true
  emit('done')
}

function tryClose() {
  if (processing.value) return
  emit('update:visible', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') tryClose()
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      // 每次打开重置
      items.value = []
      processedOnce.value = false
      dragover.value = false
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

defineExpose({ clear, addFiles, start })
</script>

<style scoped>
.aim-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.aim-modal {
  position: relative;
  width: min(560px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 24px 20px;
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 40px var(--color-glow),
    inset 0 1px 0 var(--glass-edge);
}

.aim-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
  z-index: 1;
}

.aim-corner--tl {
  top: 8px;
  left: 8px;
  border-top: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-top-left-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.aim-corner--tr {
  top: 8px;
  right: 8px;
  border-top: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-top-right-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.aim-corner--bl {
  bottom: 8px;
  left: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-bottom-left-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.aim-corner--br {
  bottom: 8px;
  right: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-bottom-right-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.aim-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.7;
}

.aim-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.aim-head__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent),
    0 0 16px var(--color-glow);
}

.aim-head__title {
  flex: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 16px var(--color-glow);
}

.aim-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.aim-close:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.aim-close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* —— 约束提示条 —— */
.aim-constraints {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
}

.aim-constraint {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aim-constraint__label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.aim-constraint__value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text);
}

.aim-chips {
  display: flex;
  gap: 5px;
}

.aim-chip {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-glow) 60%, transparent);
}

/* —— 拖拽区 —— */
.aim-dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 26px 20px;
  border-radius: var(--radius-lg);
  border: 1.5px dashed color-mix(in srgb, var(--color-border) 85%, transparent);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    color-mix(in srgb, var(--color-surface) 45%, transparent);
  cursor: pointer;
  text-align: center;
  user-select: none;
  overflow: hidden;
  transition: var(--transition-normal);
}

/* 扫描光带：hover / dragover 时出现，强化科技风反馈 */
.aim-dropzone::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -45%;
  height: 45%;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in srgb, var(--color-primary) 14%, transparent),
    transparent
  );
  animation: aim-scan 2.4s linear infinite;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.aim-dropzone:hover::after,
.aim-dropzone.is-dragover::after {
  opacity: 1;
}

.aim-dropzone:hover,
.aim-dropzone.is-dragover {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent),
    0 8px 30px var(--color-glow),
    inset 0 0 24px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.aim-dropzone.is-dragover {
  transform: scale(1.01);
}

.aim-dropzone.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.aim-dropzone__icon {
  color: var(--color-primary);
  filter: drop-shadow(0 0 10px var(--color-glow));
  animation: aim-float 2.8s ease-in-out infinite;
}

.aim-dropzone__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--color-text);
}

.aim-dropzone__hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.85;
}

.aim-hidden {
  display: none;
}

/* —— 文件列表 —— */
.aim-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 190px;
  overflow-y: auto;
  padding-right: 2px;
}

.aim-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  transition: var(--transition-fast);
}

.aim-item--error {
  border-color: rgba(255, 77, 94, 0.45);
  background: rgba(255, 77, 94, 0.07);
}

.aim-item--warn {
  border-color: rgba(255, 183, 77, 0.45);
  background: rgba(255, 183, 77, 0.07);
}

.aim-item--success {
  border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
}

.aim-item__ext {
  flex: none;
  min-width: 44px;
  padding: 4px 6px;
  text-align: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.aim-item--success .aim-item__ext {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
}

.aim-item--error .aim-item__ext {
  color: #ff5b6a;
  border-color: rgba(255, 77, 94, 0.45);
}

.aim-item__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aim-item__name {
  font-size: 12.5px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aim-item__sub {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aim-item__msg {
  font-style: normal;
}

.aim-item--error .aim-item__msg {
  color: #ff5b6a;
}

.aim-item--warn .aim-item__msg {
  color: #ffb74d;
}

.aim-item--success .aim-item__msg {
  color: var(--color-primary);
}

.aim-item__ok {
  color: var(--color-primary);
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.aim-item__warn {
  color: #ffb74d;
}

.aim-item__err {
  color: #ff5b6a;
}

.aim-item__remove {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.aim-item__remove:hover {
  color: #ff5b6a;
  background: rgba(255, 77, 94, 0.12);
}

/* —— 底部 —— */
.aim-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.aim-foot__summary {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

.aim-foot__actions {
  display: flex;
  gap: 10px;
}

.aim-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: var(--transition-fast);
}

.aim-btn--ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.aim-btn--ghost:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-text);
  box-shadow: 0 0 10px var(--color-glow);
}

.aim-btn--primary {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 6px 18px var(--color-glow);
}

.aim-btn--primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.aim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* —— 过渡动画 —— */
.aim-enter-active {
  transition: opacity 0.25s ease;
}

.aim-enter-active .aim-modal {
  transition:
    transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.aim-leave-active {
  transition: opacity 0.2s ease;
}

.aim-leave-active .aim-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.aim-enter-from {
  opacity: 0;
}

.aim-enter-from .aim-modal {
  transform: translateY(16px) scale(0.94);
  opacity: 0;
}

.aim-leave-to {
  opacity: 0;
}

.aim-leave-to .aim-modal {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}

@keyframes aim-scan {
  0% {
    top: -45%;
  }
  100% {
    top: 100%;
  }
}

@keyframes aim-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
</style>
