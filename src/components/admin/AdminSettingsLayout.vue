<template>
  <div class="admin-settings-layout">
    <div class="settings-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path"
        class="settings-tab"
        :class="{ active: $route.name === tab.name }"
      >
        <AppIcon :name="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </div>

    <div class="settings-content">
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
  { key: 'base', icon: 'lucide:book-open', label: t('console.settingsBase'), path: '/admin/settings/base', name: 'admin-settings-base' },
  { key: 'search', icon: 'lucide:search', label: t('console.settingsSearch'), path: '/admin/settings/search', name: 'admin-settings-search' },
  { key: 'dict', icon: 'lucide:table', label: t('console.dictConfig'), path: '/admin/settings/dict', name: 'admin-settings-dict' }
])
</script>

<style scoped>
.admin-settings-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.settings-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.settings-tab {
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

.settings-tab:hover {
  color: var(--color-primary);
  background: var(--color-glass);
}

.settings-tab.active {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 70%);
  box-shadow: inset 0 0 12px var(--color-glow);
}

.settings-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>