<template>
  <div
    class="app-input"
    :class="[
      `app-input--${size}`,
      {
        'is-focused': focused,
        'is-disabled': disabled,
        'is-error': error,
        'has-prefix': prefixIcon || $slots.prefix,
        'has-suffix': showSuffix,
        'has-step': isNumber && !disabled,
        'has-value': hasValue
      }
    ]"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- 前缀图标 -->
    <span v-if="prefixIcon || $slots.prefix" class="app-input__prefix">
      <AppIcon v-if="prefixIcon" :name="prefixIcon" :size="iconSize" />
      <slot v-else name="prefix" />
    </span>

    <div class="app-input__input-wrap">
      <input
        ref="inputRef"
        class="app-input__inner"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :minlength="minlength"
        :min="inputMin"
        :max="inputMax"
        :step="inputStep"
        :readonly="readonly"
        :autocomplete="autocomplete"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
        @change="onChange"
      />
    </div>

    <!-- 后缀区域（清空/密码切换/后缀图标） -->
    <span v-if="showSuffix" class="app-input__suffix">
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="app-input__clear"
        :class="{ 'is-visible': focused || hovered }"
        :title="$t('common.clear')"
        @click="clearValue"
        @mousedown.prevent
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </button>

      <button
        v-if="showPasswordToggle"
        type="button"
        class="app-input__eye"
        :title="passwordVisible ? $t('common.hidePassword') : $t('common.showPassword')"
        @click="togglePassword"
        @mousedown.prevent
      >
        <svg v-if="passwordVisible" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <AppIcon v-if="suffixIcon" :name="suffixIcon" :size="iconSize" />
      <slot v-else name="suffix" />
    </span>

    <!-- 数字步进按钮 -->
    <span v-if="isNumber && !disabled" class="app-input__step">
      <button type="button" class="app-input__step-btn" :disabled="stepUpDisabled" @click="stepUp" @mousedown.prevent>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 15 12 9 18 15" />
        </svg>
      </button>
      <button type="button" class="app-input__step-btn" :disabled="stepDownDisabled" @click="stepDown" @mousedown.prevent>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'

const { t } = useI18n()

type InputSize = 'small' | 'default' | 'large'

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    type?: 'text' | 'number' | 'password' | 'url' | 'email' | 'tel' | 'search'
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    prefixIcon?: string
    suffixIcon?: string
    error?: boolean
    size?: InputSize
    maxlength?: number
    minlength?: number
    min?: number
    max?: number
    step?: number
    autocomplete?: string
  }>(),
  {
    type: 'text',
    disabled: false,
    readonly: false,
    clearable: true,
    error: false,
    size: 'default',
    autocomplete: 'off'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'change', event: Event): void
  (e: 'enter', event: KeyboardEvent): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const hovered = ref(false)
const passwordVisible = ref(false)

const isNumber = computed(() => props.type === 'number')
const inputType = computed(() => {
  if (props.type === 'password') return passwordVisible.value ? 'text' : 'password'
  return props.type === 'number' ? 'text' : props.type
})

const hasValue = computed(() => {
  const v = props.modelValue
  return v !== null && v !== undefined && v !== ''
})

const showPasswordToggle = computed(() => props.type === 'password' && hasValue.value)

const showSuffix = computed(() =>
  showPasswordToggle.value ||
  !!props.suffixIcon ||
  !!useSlots().suffix ||
  (props.clearable && hasValue.value && !props.disabled)
)

const iconSize = computed(() => {
  if (props.size === 'small') return 14
  if (props.size === 'large') return 18
  return 16
})

const inputMin = computed(() => (isNumber.value ? props.min : undefined))
const inputMax = computed(() => (isNumber.value ? props.max : undefined))
const inputStep = computed(() => (isNumber.value ? props.step ?? 1 : undefined))

const stepUpDisabled = computed(() => {
  if (!isNumber.value || props.max === undefined) return false
  const v = Number(props.modelValue)
  return !isNaN(v) && v >= props.max
})

const stepDownDisabled = computed(() => {
  if (!isNumber.value || props.min === undefined) return false
  const v = Number(props.modelValue)
  return !isNaN(v) && v <= props.min
})

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  let val: string | number = target.value
  if (isNumber.value) {
    if (val === '') {
      emit('update:modelValue', null)
      return
    }
    const num = Number(val)
    if (!isNaN(num)) {
      val = num
    } else {
      return
    }
  }
  emit('update:modelValue', val)
}

function onFocus(e: FocusEvent) {
  focused.value = true
  emit('focus', e)
}

function onBlur(e: FocusEvent) {
  focused.value = false
  emit('blur', e)
}

function onChange(e: Event) {
  emit('change', e)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    emit('enter', e)
  }
  if (isNumber.value) {
    const allowed = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.', 'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End']
    if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  }
}

function clearValue() {
  emit('update:modelValue', isNumber.value ? null : '')
  inputRef.value?.focus()
}

function togglePassword() {
  passwordVisible.value = !passwordVisible.value
  inputRef.value?.focus()
}

function stepUp() {
  if (stepUpDisabled.value) return
  const current = Number(props.modelValue) || 0
  const step = props.step ?? 1
  let next = current + step
  if (props.max !== undefined) next = Math.min(next, props.max)
  emit('update:modelValue', next)
}

function stepDown() {
  if (stepDownDisabled.value) return
  const current = Number(props.modelValue) || 0
  const step = props.step ?? 1
  let next = current - step
  if (props.min !== undefined) next = Math.max(next, props.min)
  emit('update:modelValue', next)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  input: inputRef
})
</script>

<style scoped>
/* ===== 容器 ===== */
.app-input {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  height: var(--control-h);
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}
.app-input:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
}

.app-input.is-focused {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.app-input.is-error {
  border-color: #ff5b6a;
}
.app-input.is-error.is-focused {
  box-shadow: 0 0 0 2px rgba(255, 91, 106, 0.15);
}

.app-input.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 尺寸 */
.app-input--small { height: 32px; border-radius: var(--radius-sm); }
.app-input--large { height: 48px; border-radius: var(--radius-md); }

/* ===== 前缀 ===== */
.app-input__prefix {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding-left: 12px;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}
.app-input.is-focused .app-input__prefix { color: var(--color-primary); }
.app-input--small .app-input__prefix { padding-left: 10px; }
.app-input--large .app-input__prefix { padding-left: 14px; }

/* ===== input 包裹层（关键：让 input 区域独立，右侧按钮不影响 focus 阴影） ===== */
.app-input__input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 12px;
}
.app-input.has-prefix .app-input__input-wrap { padding-left: 8px; }
.app-input--small .app-input__input-wrap { padding: 0 10px; }
.app-input--large .app-input__input-wrap { padding: 0 14px; }

.app-input__inner {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.4;
}

/* 覆盖 global.css 里的 input:focus 全局样式，避免聚焦时出现双重边框/发光环 */
.app-input__inner:focus {
  border: none;
  outline: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
}
.app-input--small .app-input__inner { font-size: 13px; }
.app-input--large .app-input__inner { font-size: 15px; }

.app-input__inner::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}
.app-input__inner:disabled { cursor: not-allowed; }

/* 隐藏原生数字 spinner */
.app-input__inner::-webkit-outer-spin-button,
.app-input__inner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.app-input__inner[type='number'] { -moz-appearance: textfield; }

/* ===== 后缀区域 ===== */
.app-input__suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  padding-right: 10px;
  color: var(--color-text-secondary);
}
.app-input--small .app-input__suffix { padding-right: 8px; }
.app-input--large .app-input__suffix { padding-right: 12px; }

/* 清空 / 密码按钮 */
.app-input__clear,
.app-input__eye {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, opacity 0.18s ease, transform 0.18s ease;
  flex-shrink: 0;
}
.app-input__clear:hover,
.app-input__eye:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

/* 清空按钮：有值时占位，hover/focus 时可见 */
.app-input__clear {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.6);
}
.app-input__clear.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

/* ===== 数字步进器 ===== */
.app-input__step {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: stretch;
  border-left: 1px solid var(--color-border);
  transition: border-color 0.2s ease;
}

.app-input__step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.app-input__step-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}
.app-input__step-btn:active:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
}
.app-input__step-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.app-input__step-btn:first-child {
  border-bottom: 1px solid var(--color-border);
}
</style>
