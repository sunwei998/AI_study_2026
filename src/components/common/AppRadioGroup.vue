<template>
  <div
    class="app-radio-group"
    :class="[
      `app-radio-group--${size}`,
      { 'app-radio-group--button': optionType === 'button' }
    ]"
    role="radiogroup"
  >
    <template v-if="options.length">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="app-radio"
        :class="[
          `app-radio--${size}`,
          {
            'is-checked': modelValue === opt.value,
            'is-disabled': disabled || opt.disabled,
            'is-button': optionType === 'button'
          }
        ]"
      >
        <input
          type="radio"
          class="app-radio__input"
          :checked="modelValue === opt.value"
          :disabled="disabled || opt.disabled"
          :name="name"
          :value="opt.value"
          @change="select(opt.value)"
        />
        <template v-if="optionType === 'button'">
          <span class="app-radio__button-content">{{ opt.label }}</span>
        </template>
        <template v-else>
          <span class="app-radio__circle"><span class="app-radio__dot"></span></span>
          <span class="app-radio__label">{{ opt.label }}</span>
        </template>
      </label>
    </template>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, toRefs } from 'vue'

export interface RadioOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

const radioGroupKey = Symbol('radioGroup')

const props = withDefaults(
  defineProps<{
    modelValue: any
    disabled?: boolean
    size?: 'small' | 'default' | 'large'
    name?: string
    options?: RadioOption[]
    optionType?: 'default' | 'button'
    buttonStyle?: 'solid' | 'outline'
  }>(),
  {
    disabled: false,
    size: 'default',
    options: () => [],
    optionType: 'default',
    buttonStyle: 'outline',
    name: ''
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()

function select(value: any) {
  if (props.disabled) return
  emit('update:modelValue', value)
  emit('change', value)
}

// provide 给子 AppRadio
provide(radioGroupKey, {
  modelValue: toRefs(props).modelValue,
  disabled: props.disabled,
  size: props.size,
  name: props.name,
  buttonStyle: props.buttonStyle,
  change: select
})
</script>

<style scoped>
.app-radio-group {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.app-radio-group--small { gap: 12px; }
.app-radio-group--large { gap: 20px; }

.app-radio-group--button {
  gap: 0;
}

.app-radio-group--button .app-radio {
  margin: 0;
}
</style>
