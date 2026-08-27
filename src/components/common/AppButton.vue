<template>
  <button
    type="button"
    class="app-btn"
    :class="[`app-btn--${size}`, `app-btn--${type}`, { 'is-disabled': disabled || loading, 'is-block': block }]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="app-btn__spinner" aria-hidden="true"></span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'mini' | 'small' | 'middle' | 'large'
    type?: 'primary' | 'default'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    size: 'middle',
    type: 'primary',
    disabled: false,
    loading: false,
    block: false
  }
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()
</script>

<style scoped>
.app-btn {
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
}

/* —— 尺寸：mini / small / middle / large —— */
.app-btn--mini {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: var(--radius-sm);
}

.app-btn--small {
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
}

.app-btn--middle {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
}

.app-btn--large {
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
}

/* —— 主按钮：主题渐变 + 霓虹发光 —— */
.app-btn--primary {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 4px 14px var(--color-glow);
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
}

.app-btn--primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 6px 22px var(--color-glow);
}

.app-btn--primary:active:not(:disabled) {
  filter: brightness(0.95);
  transform: translateY(0);
  box-shadow: 0 2px 8px var(--color-glow);
}

/* —— 默认按钮：液态玻璃 —— */
.app-btn--default {
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  color: var(--color-text);
  box-shadow: inset 0 1px 0 var(--glass-edge);
}

.app-btn--default:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow), inset 0 1px 0 var(--glass-edge);
}

.app-btn--default:active:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

/* —— 禁用 / loading —— */
.app-btn:disabled,
.app-btn.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.app-btn--block {
  width: 100%;
}

/* —— loading spinner（颜色继承 currentColor） —— */
.app-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: app-btn-spin 0.7s linear infinite;
}

@keyframes app-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
