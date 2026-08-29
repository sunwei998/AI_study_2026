<template>
  <span
    class="app-tag"
    :class="[`app-tag--${status}`, `app-tag--${size}`]"
    :style="color ? { '--tag-c': color } : undefined"
  >
    <i class="app-tag__dot" aria-hidden="true"></i>
    <span class="app-tag__text"><slot /></span>
    <button
      v-if="closable"
      type="button"
      class="app-tag__close"
      :title="$t('common.close')"
      @click.stop="emit('close')"
    >
      <AppIcon name="lucide:x" :size="size === 'small' ? 10 : 12" />
    </button>
  </span>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

export type AppTagStatus = 'none' | 'success' | 'warning' | 'error'

withDefaults(
  defineProps<{
    /** 状态：none / success / warning / error，颜色跟随主题语义色变量 */
    status?: AppTagStatus
    /** 尺寸：small / middle */
    size?: 'small' | 'middle'
    /** 是否可删除（显示关闭按钮，触发 close 事件） */
    closable?: boolean
    /** 自定义颜色覆盖（默认跟随主题） */
    color?: string
  }>(),
  {
    status: 'none',
    size: 'middle',
    closable: false,
    color: ''
  }
)

const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<style scoped>
.app-tag {
  /* --tag-c 由状态类或 color prop 注入 */
  --tag-c: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--tag-c) 45%, transparent);
  background: color-mix(in srgb, var(--tag-c) 10%, transparent);
  color: var(--tag-c);
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  white-space: nowrap;
  user-select: none;
  box-shadow: 0 0 6px color-mix(in srgb, var(--tag-c) 22%, transparent);
  transition: var(--transition-fast);
}

.app-tag--none {
  --tag-c: var(--color-text-secondary);
  box-shadow: none;
}

.app-tag--success {
  --tag-c: var(--color-success);
}

.app-tag--warning {
  --tag-c: var(--color-warning);
}

.app-tag--error {
  --tag-c: var(--color-danger);
}

.app-tag--small {
  height: 20px;
  padding: 0 7px;
  font-size: 10.5px;
}

.app-tag--middle {
  height: 24px;
  padding: 0 9px;
  font-size: 11.5px;
}

.app-tag__dot {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--tag-c);
  box-shadow: 0 0 5px var(--tag-c);
}

.app-tag--none .app-tag__dot {
  box-shadow: none;
  opacity: 0.7;
}

.app-tag__text {
  line-height: 1;
}

.app-tag__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 1px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.75;
  transition: var(--transition-fast);
}

.app-tag__close:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--tag-c) 22%, transparent);
}
</style>
