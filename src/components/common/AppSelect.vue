<template>
  <div
    class="app-select"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled, 'is-focused': isFocused, 'is-multiple': multiple }"
    ref="rootRef"
  >
    <button
      ref="triggerRef"
      type="button"
      class="as-trigger"
      :disabled="disabled"
      @click="toggle"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
      <!-- 单选：单值回显 -->
      <span v-if="!multiple" class="as-value" :class="{ placeholder: !hasValue }">{{ displayLabel }}</span>

      <!-- 多选：tag 回显 + 宽度折叠 -->
      <div v-else ref="tagsRef" class="as-tags">
        <span v-if="selectedOptions.length === 0" class="as-value placeholder">
          {{ placeholder || t('common.pleaseSelect') }}
        </span>
        <template v-else>
          <span v-for="opt in visibleSelected" :key="String(opt.value)" class="as-tag">
            <span class="as-tag-label">{{ opt.label }}</span>
            <svg
              class="as-tag-close"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              @click.stop="removeTag(opt.value)"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
          <span v-if="hiddenCount > 0" class="as-tag as-tag--more">+{{ hiddenCount }}</span>
        </template>
      </div>

      <svg
        class="as-arrow"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- 隐藏测量层：渲染全部 tag 用于测量宽度（visibility 隐藏仍可量 offsetWidth） -->
    <div v-if="multiple" ref="measureRef" class="as-measure" aria-hidden="true">
      <span v-for="opt in selectedOptions" :key="String(opt.value)" class="as-tag">
        <span class="as-tag-label">{{ opt.label }}</span>
        <svg class="as-tag-close" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </span>
      <span class="as-tag as-tag--more">+99</span>
    </div>

    <Transition name="as-dropdown">
      <Teleport to="body">
        <div v-if="isOpen" ref="panelRef" class="as-panel" :style="panelStyle" role="listbox">
          <div class="as-panel-inner">
            <button
              v-for="opt in normalizedOptions"
              :key="String(opt.value)"
              type="button"
              class="as-option"
              :class="{ active: multiple ? isChecked(opt) : modelValue === opt.value }"
              role="option"
              :aria-selected="multiple ? isChecked(opt) : modelValue === opt.value"
              @click="select(opt)"
            >
              <!-- 多选 checkbox -->
              <span v-if="multiple" class="as-checkbox" :class="{ checked: isChecked(opt) }">
                <svg
                  v-if="isChecked(opt)"
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span class="as-option-label">{{ opt.label }}</span>
              <!-- 单选对勾 -->
              <svg
                v-if="!multiple && modelValue === opt.value"
                class="as-check"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <div v-if="normalizedOptions.length === 0" class="as-empty">{{ $t('common.noOptions') }}</div>
          </div>
          <div class="as-scanline"></div>
        </div>
      </Teleport>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface SelectOption {
  label: string
  value: string | number | boolean
}

type SelectValue = string | number | boolean

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: SelectValue | null | undefined | SelectValue[]
    options?: Array<SelectOption | string | number>
    placeholder?: string
    disabled?: boolean
    multiple?: boolean
  }>(),
  {
    options: () => [],
    placeholder: '',
    disabled: false,
    multiple: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectValue | SelectValue[]): void
  (e: 'change', value: SelectValue | SelectValue[]): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const tagsRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isFocused = ref(false)

// 下拉面板定位：Teleport 到 body，fixed 定位，避免被父容器 overflow/滚动裁剪
const PANEL_MAX_HEIGHT = 260
const panelStyle = ref<Record<string, string>>({})

function updatePanelPos() {
  const el = rootRef.value
  if (!el || !isOpen.value) return
  const rect = el.getBoundingClientRect()
  const panelH = panelRef.value?.offsetHeight || PANEL_MAX_HEIGHT
  let top = rect.bottom
  if (top + panelH > window.innerHeight && rect.top > panelH + 12) {
    top = Math.max(4, rect.top - panelH)
  }
  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`
  }
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    updatePanelPos()
    window.addEventListener('scroll', updatePanelPos, true)
    window.addEventListener('resize', updatePanelPos)
  } else {
    window.removeEventListener('scroll', updatePanelPos, true)
    window.removeEventListener('resize', updatePanelPos)
  }
})

const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return { label: String(opt.label), value: opt.value }
    }
    return { label: String(opt), value: opt as SelectValue }
  })
})

// 多选选中值列表
const selectedList = computed<SelectValue[]>(() => {
  if (!props.multiple) return []
  return Array.isArray(props.modelValue) ? (props.modelValue as SelectValue[]) : []
})

// 多选回显的 option（按选中顺序，未匹配到 options 时用 value 兜底）
const selectedOptions = computed<SelectOption[]>(() => {
  return selectedList.value.map((v) => {
    const found = normalizedOptions.value.find((o) => o.value === v)
    return found || { label: String(v), value: v }
  })
})

const hasValue = computed(() => {
  if (props.multiple) return selectedList.value.length > 0
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const displayLabel = computed(() => {
  if (!hasValue.value) return props.placeholder || t('common.pleaseSelect')
  const found = normalizedOptions.value.find((o) => o.value === props.modelValue)
  return found ? found.label : String(props.modelValue)
})

function isChecked(opt: SelectOption): boolean {
  return selectedList.value.includes(opt.value)
}

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function select(opt: SelectOption) {
  if (props.multiple) {
    const arr = [...selectedList.value]
    const idx = arr.indexOf(opt.value)
    if (idx > -1) arr.splice(idx, 1)
    else arr.push(opt.value)
    emit('update:modelValue', arr)
    emit('change', arr)
    // 多选不关闭下拉，继续勾选
  } else {
    emit('update:modelValue', opt.value)
    emit('change', opt.value)
    isOpen.value = false
  }
}

function removeTag(value: SelectValue) {
  if (!props.multiple) return
  const arr = selectedList.value.filter((v) => v !== value)
  emit('update:modelValue', arr)
  emit('change', arr)
}

// ============ 多选 tag 宽度折叠（借鉴 element-plus collapse-tags） ============
const TAG_GAP = 4
const visibleCount = ref(9999)

function computeVisible() {
  if (!props.multiple) return
  const container = tagsRef.value
  const measure = measureRef.value
  if (!container || !measure) return
  const tags = Array.from(measure.querySelectorAll('.as-tag:not(.as-tag--more)')) as HTMLElement[]
  if (tags.length === 0) {
    visibleCount.value = 0
    return
  }
  // 可用宽度 = tag 容器宽度；逐个累加 tag 宽度直到放不下
  const available = container.clientWidth
  let acc = 0
  let n = 0
  for (let i = 0; i < tags.length; i++) {
    const w = tags[i].offsetWidth + (i === 0 ? 0 : TAG_GAP)
    if (acc + w > available) break
    acc += w
    n++
  }
  visibleCount.value = Math.max(1, n)
}

const visibleSelected = computed(() => selectedOptions.value.slice(0, visibleCount.value))
const hiddenCount = computed(() => Math.max(0, selectedOptions.value.length - visibleCount.value))

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (props.multiple && triggerRef.value) {
    resizeObserver = new ResizeObserver(() => computeVisible())
    resizeObserver.observe(triggerRef.value)
    computeVisible()
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())

watch(
  () => selectedOptions.value.map((o) => String(o.value)).join('|'),
  async () => {
    await nextTick()
    computeVisible()
  }
)

function onDocClick(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  const insideRoot = rootRef.value?.contains(target)
  const insidePanel = panelRef.value?.contains(target)
  if (!insideRoot && !insidePanel) {
    isOpen.value = false
  }
}

document.addEventListener('click', onDocClick)
onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePanelPos, true)
  window.removeEventListener('resize', updatePanelPos)
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.app-select {
  position: relative;
  display: inline-block;
  min-width: 80px;
}

.as-trigger {
  width: 100%;
  height: 30px;
  padding: 0 28px 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  transition: var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.as-trigger:hover:not(:disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-select.is-open .as-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.app-select.is-focused .as-trigger {
  border-color: var(--color-primary);
}

.as-trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.as-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
}

.as-value.placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.as-arrow {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.app-select.is-open .as-arrow {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* —— 多选 tag —— */
.as-tags {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.as-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  color: var(--color-primary);
  font-size: 11px;
  max-width: 96px;
}

.as-tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-tag-close {
  flex-shrink: 0;
  cursor: pointer;
  opacity: 0.55;
  transition: var(--transition-fast);
}

.as-tag-close:hover {
  opacity: 1;
}

.as-tag--more {
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-color: var(--color-border);
}

/* 隐藏测量层：屏幕外 + visibility 隐藏（保留布局可量宽度） */
.as-measure {
  position: absolute;
  left: -9999px;
  top: -9999px;
  visibility: hidden;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* —— 多选 checkbox —— */
.as-checkbox {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: var(--transition-fast);
}

.as-checkbox.checked {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  box-shadow: 0 0 6px var(--color-glow);
}

/* 下拉面板（Teleport 到 body，fixed 定位由 JS 计算） */
.as-panel {
  /* 需高于 AppTable 筛选面板的 10001，否则筛选面板内的下拉选项会被盖住 */
  z-index: 11000;
  background: var(--color-glass);
  backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.4),
    0 0 20px var(--color-glow);
  overflow: hidden;
}

.as-panel-inner {
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-primary) 40%, transparent) transparent;
}

.as-option {
  width: 100%;
  margin: 2px 0;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
  text-align: left;
}

.as-option:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.as-option.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent);
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.as-option-label {
  flex: 1;
}

.as-check {
  flex-shrink: 0;
  color: var(--color-primary);
  filter: drop-shadow(0 0 4px var(--color-glow));
}

.as-empty {
  padding: 16px;
  text-align: center;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  opacity: 0.5;
}

/* 科技风扫描线 */
.as-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.5;
  animation: as-scan 2.5s linear infinite;
  pointer-events: none;
}

@keyframes as-scan {
  0% { top: 0; opacity: 0; }
  15% { opacity: 0.5; }
  85% { opacity: 0.5; }
  100% { top: 100%; opacity: 0; }
}

/* 下拉动画 */
.as-dropdown-enter-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.as-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.as-dropdown-enter-from,
.as-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
