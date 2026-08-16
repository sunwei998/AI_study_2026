<template>
  <div class="model-selector">
    <button class="model-toggle" @click="isOpen = !isOpen" :title="$t('common.switchModel')">
      <span class="model-current">{{ currentModelInfo?.name || currentModel }}</span>
      <span class="chevron" :class="{ open: isOpen }">▾</span>
    </button>

    <div v-if="isOpen" class="model-backdrop" @click="isOpen = false"></div>
    <div class="model-menu" :class="{ active: isOpen }">
      <div class="model-menu-header">
        <span>{{ $t('model.select') }}</span>
        <span class="model-menu-count">{{ $t('model.count', { count: availableModels.length }) }}</span>
      </div>
      <div class="model-list">
        <button
          v-for="model in availableModels"
          :key="model.id"
          class="model-item"
          :class="{ active: model.id === currentModel }"
          @click="selectModel(model)"
        >
          <span class="model-item-name">{{ model.name }}</span>
          <span v-if="model.vision" class="vision-tag" title="Vision">VISION</span>
          <span v-if="model.free" class="free-tag">FREE</span>
          <span v-if="model.id === currentModel" class="check">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ModelInfo } from '@/types/chat'
import { useChatStore } from '@/stores/chatStore'

const store = useChatStore()
const isOpen = ref(false)

const currentModel = computed(() => store.currentModel)
const currentModelInfo = computed(() => store.currentModelInfo)
const availableModels = computed(() => store.availableModels)

const selectModel = (model: ModelInfo) => {
  store.setModel(model)
  isOpen.value = false
}
</script>

<style scoped>
.model-selector {
  position: relative;
}

.model-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--control-h);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-normal);
}

.model-toggle:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-1px);
}

.model-current {
  font-family: var(--font-mono);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  font-size: 12px;
  transition: transform 0.2s;
  color: var(--color-text-secondary);
}

.chevron.open {
  transform: rotate(180deg);
}

.model-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.model-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  width: 280px;
  max-height: 400px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg), inset 0 0 18px var(--color-glow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: var(--transition-normal);
}

.model-menu.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.model-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg, var(--color-glow), transparent);
}

.model-menu-count {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.model-list {
  overflow-y: auto;
  padding: 6px;
}

.model-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-fast);
  border: 1px solid transparent;
}

.model-item:hover {
  background: var(--color-glass);
  border-color: var(--color-border);
  box-shadow: 0 0 10px var(--color-glow);
}

.model-item.active {
  background: linear-gradient(135deg, var(--color-glow), transparent 60%);
  border: 1px solid var(--color-primary);
  box-shadow: inset 0 0 14px var(--color-glow);
}

.model-item-name {
  font-family: var(--font-mono);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.free-tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 255, 136, 0.15);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.4);
}

.vision-tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(124, 92, 255, 0.18);
  color: #a78bfa;
  border: 1px solid rgba(124, 92, 255, 0.5);
}

.check {
  flex-shrink: 0;
  color: var(--color-primary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .model-menu {
    width: min(260px, calc(100vw - 24px));
    right: 0;
    max-height: 55vh;
  }

  .model-current {
    max-width: 120px;
  }
}
</style>