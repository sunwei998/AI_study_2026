<template>
  <div class="aex" :class="{ 'aex--block': block }">
    <button
      ref="btnRef"
      type="button"
      class="aex-btn"
      :class="[`aex-btn--${size}`, { 'is-disabled': disabled || loading, 'is-block': block, 'is-active': open }]"
      :disabled="disabled || loading"
      :title="buttonTitle"
      @click="toggle"
    >
      <span v-if="loading" class="aex-btn__spinner" aria-hidden="true"></span>
      <slot v-else name="icon">
        <AppIcon name="lucide:download" :size="iconSize" />
      </slot>
      <span v-if="!iconOnly" class="aex-btn__label"><slot>{{ $t('common.export') }}</slot></span>
    </button>

    <Teleport to="body">
      <Transition name="aex-pop" appear>
        <div
          v-if="open"
          ref="panelRef"
          class="aex-panel"
          :style="panelStyle"
          role="dialog"
          :aria-label="$t('common.exportDialogTitle')"
        >
          <span class="aex-corner aex-corner--tl"></span>
          <span class="aex-corner aex-corner--br"></span>
          <span class="aex-accent-line"></span>

          <h4 class="aex-panel__title">
            <AppIcon name="lucide:file-output" :size="14" />
            {{ $t('common.exportDialogTitle') }}
          </h4>

          <div class="aex-row">
            <span class="aex-row__k">{{ $t('common.exportFormat') }}</span>
            <i class="aex-chip">{{ format }}</i>
          </div>
          <div v-if="count != null" class="aex-row">
            <span class="aex-row__k">{{ $t('common.exportCount') }}</span>
            <span class="aex-row__v">{{ count }} {{ $t('common.itemsUnit') }}</span>
          </div>
          <div class="aex-row">
            <span class="aex-row__k">{{ $t('common.exportFilename') }}</span>
            <span class="aex-row__v aex-row__v--mono" :title="fileName">{{ fileName }}</span>
          </div>

          <slot name="detail" />

          <button type="button" class="aex-confirm" :disabled="loading" @click="onConfirm">
            <AppLoading v-if="loading" :size="13" color="#fff" glow />
            <AppIcon v-else name="lucide:download" :size="14" />
            {{ loading ? $t('common.loading') : $t('common.exportConfirm') }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import AppLoading from '@/components/common/AppLoading.vue'

const props = withDefaults(
  defineProps<{
    /** 导出格式标识，展示用（如 XLSX / CSV） */
    format?: string
    /** 导出数据量（条），不传则不展示 */
    count?: number
    /** 文件名前缀，自动生成 前缀_时间戳.格式 */
    filePrefix?: string
    /** 仅图标按钮（表格工具栏场景） */
    iconOnly?: boolean
    buttonTitle?: string
    size?: 'mini' | 'small' | 'middle' | 'large'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    format: 'XLSX',
    count: undefined,
    filePrefix: 'export',
    iconOnly: false,
    buttonTitle: '',
    size: 'middle',
    disabled: false,
    loading: false,
    block: false
  }
)

const emit = defineEmits<{ (e: 'export'): void }>()

const { t } = useI18n()

const open = ref(false)
const fileName = ref('')
const panelStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
const btnRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const iconSize = computed(() => (props.size === 'mini' || props.size === 'small' ? 15 : 16))

const PANEL_W = 288

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function positionPanel() {
  const rect = btnRef.value?.getBoundingClientRect()
  if (!rect) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(Math.max(rect.right - PANEL_W, 8), vw - PANEL_W - 8)
  let top = rect.bottom + 8
  // 下方空间不足时翻转到上方
  nextTick(() => {
    const h = panelRef.value?.offsetHeight ?? 220
    if (top + h > vh - 8) top = Math.max(8, rect.top - h - 8)
    panelStyle.value = { top: `${top}px`, left: `${left}px` }
  })
  panelStyle.value = { top: `${top}px`, left: `${left}px` }
}

function toggle() {
  if (props.disabled || props.loading) return
  if (open.value) {
    open.value = false
    return
  }
  fileName.value = `${props.filePrefix}_${stamp()}.${props.format.toLowerCase()}`
  open.value = true
  positionPanel()
}

function onConfirm() {
  if (props.loading) return
  emit('export')
}

function onDocMousedown(e: MouseEvent) {
  const target = e.target as Node
  if (panelRef.value?.contains(target) || btnRef.value?.contains(target)) return
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

function onReposition() {
  if (open.value) positionPanel()
}

// 导出结束（loading 由 true → false）自动收起面板
watch(
  () => props.loading,
  (v, prev) => {
    if (!v && prev) open.value = false
  }
)

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDocMousedown)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
  } else {
    document.removeEventListener('mousedown', onDocMousedown)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onReposition)
    window.removeEventListener('scroll', onReposition, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMousedown)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
})
</script>

<style scoped>
.aex {
  display: inline-flex;
}

.aex--block {
  display: flex;
}

.aex-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-md);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: var(--transition-fast);
  font-family: inherit;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  color: var(--color-text);
  box-shadow: inset 0 1px 0 var(--glass-edge);
}

.aex-btn--mini {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: var(--radius-sm);
}

.aex-btn--small {
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
}

.aex-btn--middle {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
}

.aex-btn--large {
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
}

.aex-btn:hover:not(:disabled),
.aex-btn.is-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow), inset 0 1px 0 var(--glass-edge);
  transform: translateY(-1px);
}

.aex-btn:active:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  transform: translateY(0);
}

.aex-btn:disabled,
.aex-btn.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.aex-btn--block {
  width: 100%;
}

.aex-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: aex-spin 0.7s linear infinite;
}

/* —— 气泡面板 —— */
.aex-panel {
  position: fixed;
  z-index: 2100;
  width: 288px;
  padding: 16px 16px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(24px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(24px) saturate(var(--glass-saturate));
  box-shadow:
    0 16px 44px rgba(0, 0, 0, 0.4),
    0 0 28px var(--color-glow),
    inset 0 1px 0 var(--glass-edge);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aex-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.7;
}

.aex-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
}

.aex-corner--tl {
  top: 7px;
  left: 7px;
  border-top: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-top-left-radius: 3px;
  box-shadow: 0 0 6px var(--color-glow);
}

.aex-corner--br {
  bottom: 7px;
  right: 7px;
  border-bottom: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-bottom-right-radius: 3px;
  box-shadow: 0 0 6px var(--color-glow);
}

.aex-panel__title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.aex-panel__title :deep(.app-icon),
.aex-panel__title svg {
  color: var(--color-primary);
}

.aex-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  background: color-mix(in srgb, var(--color-surface) 55%, transparent);
}

.aex-row__k {
  flex: none;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.aex-row__v {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 12px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aex-row__v--mono {
  font-family: var(--font-mono);
  font-size: 11px;
}

.aex-chip {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-glow) 60%, transparent);
}

.aex-confirm {
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-family: var(--font-display);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 6px 18px var(--color-glow);
  transition: var(--transition-fast);
}

.aex-confirm:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.aex-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* —— 过渡 —— */
.aex-pop-enter-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.aex-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.aex-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.aex-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

@keyframes aex-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
