<template>
  <div class="admin-console">
    <aside class="console-nav">
      <div class="console-brand">
        <AppIcon name="lucide:settings-2" :size="24" themeFill />
        <span>{{ $t('console.title') }}</span>
      </div>
      <nav class="console-menu">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="console-menu-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <AppIcon :name="tab.icon" :size="17" :glow="activeTab === tab.key" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <div class="console-main">
      <header class="console-header">
        <div class="console-header-left">
          <button class="console-back" :title="$t('console.backToChat')" @click="closeConsole">
            <AppIcon name="lucide:message-square" :size="17" />
            <span>{{ $t('console.backToChat') }}</span>
          </button>
        </div>
        <div class="console-header-right">
          <span class="console-user">
            <AppIcon name="lucide:user" :size="15" />
            {{ auth.user?.username }}
          </span>
          <LanguageSwitcher :size="32" />
          <ThemeSwitcher :size="32" />
          <button class="console-logout" :title="$t('console.logout')" @click="logout">
            <AppIcon name="lucide:log-out" :size="16" />
          </button>
        </div>
      </header>

      <main class="console-content">
        <AdminOverview v-if="activeTab === 'overview'" />
        <ModelManage v-else-if="activeTab === 'models'" />
        <AdminUsers v-else-if="activeTab === 'users'" />
        <AdminMap v-else-if="activeTab === 'map'" />
        <AdminUsage v-else-if="activeTab === 'usage'" />
        <AdminSuggestions v-else-if="activeTab === 'suggestions'" />
        <AdminSettings v-else />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import AdminOverview from './AdminOverview.vue'
import ModelManage from './ModelManage.vue'
import AdminUsers from './AdminUsers.vue'
import AdminMap from './AdminMap.vue'
import AdminUsage from './AdminUsage.vue'
import AdminSuggestions from './AdminSuggestions.vue'
import AdminSettings from './AdminSettings.vue'
import ThemeSwitcher from '@/components/chat/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/chat/LanguageSwitcher.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()

type TabKey = 'overview' | 'models' | 'users' | 'map' | 'usage' | 'suggestions' | 'settings'

const tabs = computed(() => [
  { key: 'overview' as TabKey, icon: 'lucide:layout-dashboard', label: t('console.overview') },
  { key: 'models' as TabKey, icon: 'lucide:cpu', label: t('console.models') },
  { key: 'users' as TabKey, icon: 'lucide:users', label: t('console.users') },
  { key: 'map' as TabKey, icon: 'lucide:map', label: t('console.map') },
  { key: 'usage' as TabKey, icon: 'lucide:chart-bar', label: t('console.usage') },
  { key: 'suggestions' as TabKey, icon: 'lucide:flame', label: t('console.suggestions') },
  { key: 'settings' as TabKey, icon: 'lucide:sliders-horizontal', label: t('console.settings') }
])

const activeTab = ref<TabKey>('overview')

const closeConsole = () => auth.closeConsole()
const logout = () => auth.logout()
</script>

<style scoped>
.admin-console {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100vh;
  height: 100dvh;
  background: var(--color-overlay);
}

.console-nav {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-right: 1px solid var(--color-border);
}

.console-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 20px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.console-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 18px;
}

.console-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-normal);
  text-align: left;
}

.console-menu-item:hover {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-border);
}

.console-menu-item.active {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 70%);
  border-color: var(--color-primary);
  box-shadow: inset 0 0 14px var(--color-glow);
}

.console-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.console-header {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--color-border);
}

.console-header-left {
  display: flex;
  align-items: center;
}

.console-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-normal);
}

.console-back:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow);
}

.console-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.console-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text);
}

.console-logout {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-normal);
}

.console-logout:hover {
  color: #ff5b6a;
  border-color: #ff5b6a;
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.4);
}

.console-content {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow: auto;
}

@media (max-width: 768px) {
  .console-nav {
    width: 60px;
    padding: 20px 8px;
  }

  .console-brand span,
  .console-menu-item span {
    display: none;
  }

  .console-menu-item {
    justify-content: center;
    padding: 10px;
  }

  .console-content {
    padding: 14px;
  }
}
</style>