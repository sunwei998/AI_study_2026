<template>
  <div class="sci-fi-bg" aria-hidden="true">
    <Particles id="tsparticles" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ISourceOptions } from '@tsparticles/engine'
import { useChatStore } from '@/stores/chatStore'

const store = useChatStore()

const palettes: Record<string, string[]> = {
  dark: ['#00e5ff', '#7c5cff', '#e6f1ff'],
  light: ['#4f46e5', '#7c3aed', '#111827'],
  neon: ['#00ff88', '#ff2ea6', '#baffdb'],
  magenta: ['#ff2d95', '#00e5ff', '#ffe0f0'],
  midnight: ['#b388ff', '#ff79c6', '#efe9ff'],
  amber: ['#ffb74d', '#ff6d00', '#fff3e0'],
  mint: ['#00e676', '#ff4081', '#e0fff0'],
  sand: ['#7a4f1f', '#8b3a0a', '#3d3a2e']
}

const options = computed<ISourceOptions>(() => ({
  fpsLimit: 60,
  detectRetina: true,
  background: { color: { value: 'transparent' } },
  fullScreen: { enable: false },
  particles: {
    number: {
      value: 55,
      density: { enable: true, width: 1600, height: 900 }
    },
    color: { value: palettes[store.currentTheme] ?? palettes.dark },
    shape: { type: 'circle' },
    opacity: { value: 0.55 },
    size: { value: 2, random: { enable: true, minimumValue: 1 } },
    move: {
      enable: true,
      speed: 1.2,
      direction: 'none',
      random: true,
      straight: false,
      outModes: { default: 'out' }
    },
    links: {
      enable: true,
      distance: 130,
      color: '#00e5ff',
      opacity: 0.3,
      width: 1
    }
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'grab' },
      resize: { enable: true }
    },
    modes: {
      grab: { distance: 140, links: { opacity: 0.5 } }
    }
  }
}))
</script>

<style scoped>
.sci-fi-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>