<template>
  <div class="admin-data-layout">
    <div class="data-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path"
        class="data-tab"
        :class="{ active: $route.name === tab.name }"
      >
        <AppIcon :name="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </div>

    <div class="data-content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'

const { t } = useI18n()

const tabs = computed(() => [
  { key: 'import', icon: 'lucide:upload', label: t('console.importManage'), path: '/admin/data/import', name: 'admin-data-import' },
  { key: 'export', icon: 'lucide:download', label: t('console.exportManage'), path: '/admin/data/export', name: 'admin-data-export' }
])
</script>

<style scoped>
.admin-data-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.data-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.data-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: var(--transition-fast);
}

.data-tab:hover {
  color: var(--color-primary);
  background: var(--color-glass);
}

.data-tab.active {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 70%);
  box-shadow: inset 0 0 12px var(--color-glow);
}

.data-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
