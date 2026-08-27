<template>
  <button
    type="button"
    class="app-export"
    :class="[`app-export--${size}`, { 'is-disabled': disabled || loading, 'is-block': block }]"
    :disabled="disabled || loading"
    @click="onClick"
  >
    <span v-if="loading" class="app-export__spinner" aria-hidden="true"></span>
    <AppIcon v-else name="lucide:download" :size="iconSize" />
    <slot>{{ $t('common.export') }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    size?: 'mini' | 'small' | 'middle' | 'large'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    size: 'middle',
    disabled: false,
    loading: false,
    block: false
  }
)

const emit = defineEmits<{ (e: 'export', event: MouseEvent): void }>()

const { t } = useI18n()

const iconSize = computed(() => (props.size === 'mini' || props.size === 'small' ? 15 : 16))

function onClick(event: MouseEvent) {
  emit('export', event)
}
</script>

<style scoped>
.app-export {
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

.app-export--mini {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: var(--radius-sm);
}

.app-export--small {
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
}

.app-export--middle {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
}

.app-export--large {
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
}

.app-export:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow), inset 0 1px 0 var(--glass-edge);
  transform: translateY(-1px);
}

.app-export:active:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  transform: translateY(0);
}

.app-export:disabled,
.app-export.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.app-export--block {
  width: 100%;
}

.app-export__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: app-export-spin 0.7s linear infinite;
}

@keyframes app-export-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
