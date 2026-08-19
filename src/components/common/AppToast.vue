<template>
  <div class="toast-wrap">
    <transition-group name="toast">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="toast-item"
        :class="`toast-item--${item.type}`"
      >
        <AppIcon
          :name="
            item.type === 'success'
              ? 'lucide:check-circle-2'
              : item.type === 'error'
                ? 'lucide:alert-circle'
                : 'lucide:info'
          "
          :size="16"
        />
        <span>{{ item.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/common/AppIcon.vue'

const { toasts } = useToast()
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-lg);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
}

.toast-item--success {
  border-color: rgba(52, 211, 153, 0.6);
  color: #34d399;
}

.toast-item--error {
  border-color: rgba(255, 77, 94, 0.6);
  color: #ff5b6a;
}

.toast-item--info {
  border-color: rgba(0, 229, 255, 0.45);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>