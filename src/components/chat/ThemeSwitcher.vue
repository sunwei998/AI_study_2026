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
import { computed, ref, watch, onBeforeUnmount } from 'vue'
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
    magenta: t('theme.magenta'),
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

// 点击组件外部任意区域关闭下拉（捕获阶段，不受层叠上下文影响）
const onDocClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.theme-switcher')) return
  isOpen.value = false
}

watch(isOpen, (val) => {
  if (val) {
    document.addEventListener('click', onDocClick, true)
  } else {
    document.removeEventListener('click', onDocClick, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
})
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
  z-index: 9999;
}

.theme-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10000;
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.theme-preview.dark {
  background: linear-gradient(135deg, #070a1a 0%, #00e5ff 50%, #7c5cff 100%);
}

.theme-preview.light {
  background: linear-gradient(135deg, #f9fafb 0%, #4f46e5 50%, #7c3aed 100%);
}

.theme-preview.neon {
  background: linear-gradient(135deg, #0a0918 0%, #00ff88 50%, #ff2ea6 100%);
}

.theme-preview.magenta {
  background: linear-gradient(135deg, #120510 0%, #ff2d95 50%, #00e5ff 100%);
}

.theme-preview.midnight {
  background: linear-gradient(135deg, #0a0714 0%, #b388ff 50%, #ff79c6 100%);
}

.theme-preview.amber {
  background: linear-gradient(135deg, #140d04 0%, #ffb74d 50%, #ff6d00 100%);
}

.theme-preview.mint {
  background: linear-gradient(135deg, #050f0a 0%, #00e676 50%, #ff4081 100%);
}

.theme-preview.sand {
  background: linear-gradient(135deg, #faf4e8 0%, #7a4f1f 50%, #8b3a0a 100%);
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
