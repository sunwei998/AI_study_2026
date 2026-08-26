<template>
  <label
    class="app-radio"
    :class="[
      `app-radio--${size}`,
      {
        'is-checked': isChecked,
        'is-disabled': disabled,
        'is-button': button
      }
    ]"
  >
    <input
      type="radio"
      class="app-radio__input"
      :checked="isChecked"
      :disabled="disabled"
      :name="name || groupName"
      :value="value"
      @change="onChange"
    />
    <template v-if="button">
      <span class="app-radio__button-content">
        <slot>{{ label }}</slot>
      </span>
    </template>
    <template v-else>
      <span class="app-radio__circle">
        <span class="app-radio__dot"></span>
      </span>
      <span class="app-radio__label"><slot>{{ label }}</slot></span>
    </template>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

interface RadioGroupContext {
  modelValue: any
  disabled: boolean
  size: 'small' | 'default' | 'large'
  name: string
  buttonStyle: 'solid' | 'outline'
  change: (value: any) => void
}

const radioGroupKey = Symbol('radioGroup')

const props = withDefaults(
  defineProps<{
    modelValue?: any
    value?: any
    label?: string
    disabled?: boolean
    name?: string
    size?: 'small' | 'default' | 'large'
    button?: boolean
  }>(),
  {
    disabled: false,
    size: 'default',
    button: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', event: Event): void
}>()

const group = inject<RadioGroupContext | null>(radioGroupKey, null)

const isChecked = computed(() => {
  if (group) return group.modelValue === props.value
  return props.modelValue === props.value
})

const groupName = computed(() => group?.name || '')
const sizeVal = computed(() => group?.size || props.size)

function onChange(e: Event) {
  const value = props.value
  if (group) {
    group.change(value)
  } else {
    emit('update:modelValue', value)
  }
  emit('change', e)
}

// 暴露给 group 使用
defineOptions({ name: 'AppRadio' })
</script>

<style scoped>
.app-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: var(--transition-fast);
}

.app-radio__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* 圆形单选 */
.app-radio__circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  flex-shrink: 0;
  position: relative;
}

.app-radio__dot {
  width: 0;
  height: 0;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 6px var(--color-glow);
  transition: var(--transition-fast);
}

.app-radio.is-checked .app-radio__circle {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-radio.is-checked .app-radio__dot {
  width: 8px;
  height: 8px;
}

.app-radio:hover .app-radio__circle {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
}

.app-radio__label {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1;
}

/* 尺寸 */
.app-radio--small .app-radio__circle { width: 14px; height: 14px; }
.app-radio--small .app-radio__dot { width: 0; height: 0; }
.app-radio--small.is-checked .app-radio__dot { width: 6px; height: 6px; }
.app-radio--small .app-radio__label { font-size: 12px; }

.app-radio--large .app-radio__circle { width: 18px; height: 18px; }
.app-radio--large.is-checked .app-radio__dot { width: 10px; height: 10px; }
.app-radio--large .app-radio__label { font-size: 14px; }

/* 禁用 */
.app-radio.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 按钮样式 */
.app-radio.is-button {
  gap: 0;
}

.app-radio__button-content {
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

.app-radio.is-button:first-child .app-radio__button-content {
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.app-radio.is-button:last-child .app-radio__button-content {
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  border-left: none;
}

.app-radio.is-button:not(:first-child):not(:last-child) .app-radio__button-content {
  border-left: none;
}

.app-radio.is-button.is-checked .app-radio__button-content {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--color-primary) 10%, transparent);
  z-index: 1;
}

.app-radio.is-button:hover:not(.is-disabled):not(.is-checked) .app-radio__button-content {
  color: var(--color-text);
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
}

.app-radio--small .app-radio__button-content {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
}

.app-radio--large .app-radio__button-content {
  height: 48px;
  padding: 0 18px;
  font-size: 14px;
}
</style>
