<template>
  <Icon
    :icon="name"
    :width="size"
    :height="size"
    :class="['app-icon', { glow: glow, 'theme-fill': themeFill }]"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    /** Iconify 图标名，如 'lucide:users'、'lucide:chart-bar' */
    name: string
    size?: number | string
    /** 跟随主题辉光（多用于激活/悬停状态） */
    glow?: boolean
    /** 使用主题渐变色填充（大图标用） */
    themeFill?: boolean
  }>(),
  {
    size: 18,
    glow: false,
    themeFill: false
  }
)
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  color: inherit;
  transition: filter 0.2s ease;
}

.app-icon.glow {
  color: var(--color-primary);
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.app-icon.theme-fill {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
