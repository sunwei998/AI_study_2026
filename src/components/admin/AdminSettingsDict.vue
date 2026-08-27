<template>
  <div class="admin-settings-dict">
    <div class="placeholder">
      <AppIcon name="lucide:table" :size="32" />
      <p class="placeholder-title">{{ $t('console.dictConfig') }}</p>
      <p class="placeholder-desc">{{ $t('console.comingSoon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<style scoped>
.admin-settings-dict {
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
  text-align: center;
}

.placeholder-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.placeholder-desc {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
</style>
