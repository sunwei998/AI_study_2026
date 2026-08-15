<template>
  <div class="theme-switcher">
    <div class="theme-menu" :class="{ active: isOpen }">
      <button
        v-for="theme in availableThemes"
        :key="theme"
        :class="['theme-btn', { active: currentTheme === theme }]"
        :title="getThemeName(theme)"
        @click="selectTheme(theme)"
      >
        <div :class="['theme-preview', theme]"></div>
      </button>
    </div>
    <button class="theme-toggle" @click="isOpen = !isOpen" title="切换主题">
      🎨
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ThemeType } from '@/types/chat'
import { useChatStore } from '@/stores/chatStore'
import { applyTheme } from '@/styles/themes'

const store = useChatStore()
const isOpen = ref(false)

const currentTheme = computed(() => store.currentTheme)
const availableThemes = computed(() => store.availableThemes as ThemeType[])

const getThemeName = (theme: ThemeType): string => {
  const names: Record<ThemeType, string> = {
    dark: '深空黑',
    light: '亮白',
    neon: '霓虹绿',
    ocean: '深海蓝'
  }
  return names[theme]
}

const selectTheme = (theme: ThemeType) => {
  store.setTheme(theme)
  applyTheme(theme)
  isOpen.value = false
}

import { computed } from 'vue'
</script>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 20px;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.theme-menu {
  position: absolute;
  bottom: 50px;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  min-width: 120px;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: var(--transition-normal);
  z-index: 1000;
}

.theme-menu.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.theme-btn {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: none;
  cursor: pointer;
  padding: 0;
  transition: var(--transition-normal);
  position: relative;
}

.theme-btn:hover {
  border-color: var(--color-primary);
}

.theme-btn.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
}

.theme-preview {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}

.theme-preview.dark {
  background: linear-gradient(135deg, #00d4ff, #2a2a4e);
}

.theme-preview.light {
  background: linear-gradient(135deg, #0066cc, #f5f5f5);
}

.theme-preview.neon {
  background: linear-gradient(135deg, #00ff88, #ff00ff);
}

.theme-preview.ocean {
  background: linear-gradient(135deg, #00d9ff, #1b263b);
}

@media (max-width: 768px) {
  .theme-menu {
    grid-template-columns: repeat(2, 1fr);
    min-width: 100px;
  }

  .theme-btn {
    width: 40px;
    height: 40px;
  }

  .theme-toggle {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
}
</style>
