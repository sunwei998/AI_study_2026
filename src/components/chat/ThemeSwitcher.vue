<template>
  <div class="theme-switcher">
    <div v-if="isOpen" class="theme-backdrop" @click="isOpen = false"></div>
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
    <button
      class="theme-toggle"
      :style="toggleStyle"
      @click="isOpen = !isOpen"
      :title="$t('common.switchTheme')"
    >
      🎨
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ThemeType } from '@/types/chat'
import { useChatStore } from '@/stores/chatStore'
import { applyTheme } from '@/styles/themes'

const { t } = useI18n()

const props = withDefaults(defineProps<{ size?: number }>(), { size: 0 })

const toggleStyle = computed(() =>
  props.size
    ? {
        width: `${props.size}px`,
        height: `${props.size}px`,
        fontSize: `${props.size >= 36 ? 20 : 16}px`
      }
    : {}
)

const store = useChatStore()
const isOpen = ref(false)

const currentTheme = computed(() => store.currentTheme)
const availableThemes = computed(() => store.availableThemes as ThemeType[])

const getThemeName = (theme: ThemeType): string => {
  const names: Record<ThemeType, string> = {
    dark: t('theme.dark'),
    light: t('theme.light'),
    neon: t('theme.neon'),
    ocean: t('theme.ocean'),
    midnight: t('theme.midnight'),
    amber: t('theme.amber'),
    mint: t('theme.mint'),
    sand: t('theme.sand')
  }
  return names[theme]
}

const selectTheme = (theme: ThemeType) => {
  store.setTheme(theme)
  applyTheme(theme)
  isOpen.value = false
}
</script>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-toggle {
  width: var(--control-h);
  height: var(--control-h);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
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
  box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-1px);
}

.theme-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.theme-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  min-width: 120px;
  box-shadow: var(--shadow-lg), inset 0 0 18px var(--color-glow);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: var(--transition-normal);
}

.theme-menu.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.theme-btn {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  background: none;
  cursor: pointer;
  padding: 0;
  transition: var(--transition-normal);
  position: relative;
}

.theme-btn:hover {
  border-color: var(--color-primary);
  transform: scale(1.08);
}

.theme-btn.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow);
}

.theme-preview {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}

.theme-preview.dark {
  background: linear-gradient(135deg, #00e5ff, #7c5cff);
}

.theme-preview.light {
  background: linear-gradient(135deg, #0066ff, #7c5cff);
}

.theme-preview.neon {
  background: linear-gradient(135deg, #00ff88, #ff2ea6);
}

.theme-preview.ocean {
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
}

.theme-preview.midnight {
  background: linear-gradient(135deg, #b388ff, #ff79c6);
}

.theme-preview.amber {
  background: linear-gradient(135deg, #ffb74d, #ff6d00);
}

.theme-preview.mint {
  background: linear-gradient(135deg, #43a047, #00897b);
}

.theme-preview.sand {
  background: linear-gradient(135deg, #b07838, #c2612f);
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
    width: var(--control-h);
    height: var(--control-h);
    font-size: 18px;
  }
}
</style>
