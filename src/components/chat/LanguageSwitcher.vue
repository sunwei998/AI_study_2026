<template>
  <button class="lang-switcher" title="切换语言 / Switch language" @click="toggleLocale">
    {{ isZh ? '中' : 'EN' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getLocale, setLocale, type AppLocale } from '@/locales'

const isZh = computed(() => getLocale() === 'zh-CN')

const toggleLocale = () => {
  const next: AppLocale = isZh.value ? 'en-US' : 'zh-CN'
  setLocale(next)
}
</script>

<style scoped>
.lang-switcher {
  width: var(--control-h);
  height: var(--control-h);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-switcher:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-1px);
}
</style>