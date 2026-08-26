<template>
  <div
    class="app-select"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled, 'is-focused': isFocused }"
    ref="rootRef"
  >
    <button
      type="button"
      class="as-trigger"
      :disabled="disabled"
      @click="toggle"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
      <span class="as-value" :class="{ placeholder: !hasValue }">{{ displayLabel }}</span>
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

    <Transition name="as-dropdown">
      <div v-if="isOpen" class="as-panel" role="listbox">
        <div class="as-panel-inner">
          <button
            v-for="opt in normalizedOptions"
            :key="String(opt.value)"
            type="button"
            class="as-option"
            :class="{ active: modelValue === opt.value }"
            role="option"
            :aria-selected="modelValue === opt.value"
            @click="select(opt)"
          >
            <span class="as-option-label">{{ opt.label }}</span>
            <svg
              v-if="modelValue === opt.value"
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface SelectOption {
  label: string
  value: string | number | boolean
}

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: string | number | boolean | null | undefined
    options?: Array<SelectOption | string | number>
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    options: () => [],
    placeholder: '',
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | boolean): void
  (e: 'change', value: string | number | boolean): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isFocused = ref(false)

const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return { label: String(opt.label), value: opt.value }
    }
    return { label: String(opt), value: opt as string | number }
  })
})

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const displayLabel = computed(() => {
  if (!hasValue.value) return props.placeholder || t('common.pleaseSelect')
  const found = normalizedOptions.value.find((o) => o.value === props.modelValue)
  return found ? found.label : String(props.modelValue)
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function select(opt: SelectOption) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  isOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!isOpen.value) return
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

document.addEventListener('click', onDocClick)
onBeforeUnmount(() => {
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

/* 下拉面板 */
.as-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  z-index: 1000;
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
