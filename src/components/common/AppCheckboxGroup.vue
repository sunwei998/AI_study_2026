<template>
  <div
    class="app-checkbox-group"
    :class="[
      `app-checkbox-group--${size}`,
      { 'app-checkbox-group--button': optionType === 'button' }
    ]"
    role="group"
  >
    <template v-if="options.length">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="app-checkbox"
        :class="[
          `app-checkbox--${size}`,
          {
            'is-checked': modelValue.includes(opt.value),
            'is-disabled': disabled || opt.disabled,
            'is-button': optionType === 'button'
          }
        ]"
      >
        <input
          type="checkbox"
          class="app-checkbox__input"
          :checked="modelValue.includes(opt.value)"
          :disabled="disabled || opt.disabled"
          :value="opt.value"
          @change="toggle(opt.value)"
        />
        <template v-if="optionType === 'button'">
          <span class="app-checkbox__button-content">{{ opt.label }}</span>
        </template>
        <template v-else>
          <span class="app-checkbox__box">
            <svg v-if="modelValue.includes(opt.value)" class="app-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span class="app-checkbox__label">{{ opt.label }}</span>
        </template>
      </label>
    </template>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { provide, toRefs } from 'vue'

export interface CheckboxOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

const checkboxGroupKey = Symbol('checkboxGroup')

const props = withDefaults(
  defineProps<{
    modelValue: any[]
    disabled?: boolean
    size?: 'small' | 'default' | 'large'
    options?: CheckboxOption[]
    optionType?: 'default' | 'button'
    min?: number
    max?: number
  }>(),
  {
    disabled: false,
    size: 'default',
    options: () => [],
    optionType: 'default'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void
  (e: 'change', value: any[]): void
}>()

function toggle(value: any) {
  if (props.disabled) return
  const values = [...props.modelValue]
  const idx = values.indexOf(value)
  if (idx > -1) {
    if (props.min !== undefined && values.length <= props.min) return
    values.splice(idx, 1)
  } else {
    if (props.max !== undefined && values.length >= props.max) return
    values.push(value)
  }
  emit('update:modelValue', values)
  emit('change', values)
}

provide(checkboxGroupKey, {
  modelValue: toRefs(props).modelValue,
  disabled: props.disabled,
  size: props.size,
  min: props.min,
  max: props.max,
  change: toggle
})
</script>

<style scoped>
.app-checkbox-group {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.app-checkbox-group--small { gap: 12px; }
.app-checkbox-group--large { gap: 20px; }

.app-checkbox-group--button {
  gap: 8px;
}
</style>
