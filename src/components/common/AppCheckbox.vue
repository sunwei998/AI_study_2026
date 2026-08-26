<template>
  <label
    class="app-checkbox"
    :class="[
      `app-checkbox--${size}`,
      {
        'is-checked': isChecked,
        'is-indeterminate': indeterminate,
        'is-disabled': disabled,
        'is-button': button
      }
    ]"
  >
    <input
      type="checkbox"
      class="app-checkbox__input"
      :checked="isChecked"
      :disabled="disabled"
      :indeterminate.prop="indeterminate"
      :value="value"
      @change="onChange"
    />
    <template v-if="button">
      <span class="app-checkbox__button-content">
        <slot>{{ label }}</slot>
      </span>
    </template>
    <template v-else>
      <span class="app-checkbox__box">
        <svg v-if="indeterminate" class="app-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <svg v-else-if="isChecked" class="app-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span class="app-checkbox__label"><slot>{{ label }}</slot></span>
    </template>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

interface CheckboxGroupContext {
  modelValue: any[]
  disabled: boolean
  size: 'small' | 'default' | 'large'
  min: number
  max: number
  change: (value: any, checked: boolean) => void
}

const checkboxGroupKey = Symbol('checkboxGroup')

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    value?: any
    label?: string
    disabled?: boolean
    indeterminate?: boolean
    size?: 'small' | 'default' | 'large'
    button?: boolean
  }>(),
  {
    disabled: false,
    indeterminate: false,
    size: 'default',
    button: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

const group = inject<CheckboxGroupContext | null>(checkboxGroupKey, null)

const isChecked = computed(() => {
  if (group) return group.modelValue.includes(props.value)
  return props.modelValue === true
})

const sizeVal = computed(() => group?.size || props.size)
const isDisabled = computed(() => {
  if (props.disabled || group?.disabled) return true
  if (group) {
    if (group.max && group.modelValue.length >= group.max && !isChecked.value) return true
    if (group.min !== undefined && group.modelValue.length <= group.min && isChecked.value) return true
  }
  return false
})

function onChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (group) {
    group.change(props.value, checked)
  } else {
    emit('update:modelValue', checked)
  }
  emit('change', checked)
}
</script>

<style scoped>
.app-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: var(--transition-fast);
}

.app-checkbox__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* 方框 */
.app-checkbox__box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  flex-shrink: 0;
  color: #fff;
}

.app-checkbox__icon {
  width: 12px;
  height: 12px;
  opacity: 0;
  transform: scale(0.5);
  transition: var(--transition-fast);
}

.app-checkbox.is-checked .app-checkbox__box,
.app-checkbox.is-indeterminate .app-checkbox__box {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-checkbox.is-checked .app-checkbox__icon,
.app-checkbox.is-indeterminate .app-checkbox__icon {
  opacity: 1;
  transform: scale(1);
}

.app-checkbox:hover .app-checkbox__box {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
}

.app-checkbox__label {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1;
}

/* 尺寸 */
.app-checkbox--small .app-checkbox__box { width: 14px; height: 14px; }
.app-checkbox--small .app-checkbox__icon { width: 10px; height: 10px; }
.app-checkbox--small .app-checkbox__label { font-size: 12px; }

.app-checkbox--large .app-checkbox__box { width: 18px; height: 18px; }
.app-checkbox--large .app-checkbox__icon { width: 14px; height: 14px; }
.app-checkbox--large .app-checkbox__label { font-size: 14px; }

/* 禁用 */
.app-checkbox.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 按钮样式 */
.app-checkbox.is-button { gap: 0; }

.app-checkbox__button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  height: var(--control-h);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text-secondary);
  font-size: 13px;
  transition: var(--transition-fast);
  white-space: nowrap;
}

.app-checkbox.is-button .app-checkbox__button-content {
  border-radius: var(--radius-md);
}

.app-checkbox.is-button.is-checked .app-checkbox__button-content {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.app-checkbox.is-button:hover:not(.is-disabled):not(.is-checked) .app-checkbox__button-content {
  color: var(--color-text);
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
}

.app-checkbox--small .app-checkbox__button-content {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
}

.app-checkbox--large .app-checkbox__button-content {
  height: 48px;
  padding: 0 18px;
  font-size: 14px;
}
</style>
