<template>
  <div class="admin-console" :class="{ 'is-collapsed': collapsed }">
    <aside class="console-nav">
      <button
        class="console-collapse-pin"
        :title="collapsed ? t('console.expand') : t('console.collapse')"
        :aria-label="collapsed ? t('console.expand') : t('console.collapse')"
        @click="collapsed = !collapsed"
      >
        <AppIcon class="pin-chev" :name="collapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'" :size="15" />
      </button>
      <div class="console-brand">
        <AppIcon name="lucide:settings-2" :size="24" themeFill />
        <span>{{ $t('console.title') }}</span>
      </div>
      <nav class="console-menu">
        <template v-for="tab in tabs" :key="tab.key">
          <div v-if="!tab.children" class="console-menu-item-wrap">
            <RouterLink
              class="console-menu-item"
              :class="{ active: isActive(tab.key) }"
              :to="`/admin/${tab.key}`"
            >
              <AppIcon :name="tab.icon" :size="17" :glow="isActive(tab.key)" />
              <span>{{ tab.label }}</span>
            </RouterLink>
            <div class="console-item-tip">{{ tab.label }}</div>
          </div>

          <div v-else class="console-menu-group" :class="{ 'flyout-open': flyoutOpen === tab.key }">
            <div class="console-menu-group-header" @click="toggleGroup(tab.key)">
              <AppIcon :name="tab.icon" :size="17" />
              <span>{{ tab.label }}</span>
              <AppIcon class="group-chevron" name="lucide:chevron-down" :size="14" :class="{ rotated: expandedGroups.includes(tab.key) }" />
            </div>
            <div v-show="expandedGroups.includes(tab.key)" class="console-menu-group-children">
              <RouterLink
                v-for="child in tab.children"
                :key="child.key"
                class="console-menu-item console-menu-child"
                :class="{ active: isChildActive(child.path) }"
                :to="child.path"
              >
                <span>{{ child.label }}</span>
              </RouterLink>
            </div>
            <!-- 收起态悬停气泡：展示该分组的二级菜单 -->
            <div class="console-group-flyout">
              <span class="console-group-flyout-label">{{ tab.label }}</span>
              <RouterLink
                v-for="child in tab.children"
                :key="'fly-' + child.key"
                class="console-flyout-item"
                :class="{ active: isChildActive(child.path) }"
                :to="child.path"
              >
                <span>{{ child.label }}</span>
              </RouterLink>
            </div>
          </div>
        </template>
      </nav>
    </aside>

    <div class="console-main">
      <header class="console-header">
        <div class="console-header-left">
          <button class="console-back" :title="$t('console.backToChat')" @click="backToChat">
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
          <button class="console-logout" :title="$t('console.logout')" @click="confirmLogout">
            <AppIcon name="lucide:log-out" :size="16" />
          </button>
        </div>
      </header>

      <main class="console-content">
        <RouterView />
      </main>
    </div>

    <ConfirmModal
      v-model:visible="logoutVisible"
      :title="$t('auth.logout')"
      :message="$t('auth.logoutConfirm')"
      :confirm-text="$t('auth.logoutConfirmBtn')"
      :cancel-text="$t('confirm.cancel')"
      danger
      @confirm="logout"
      @cancel="logoutVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useConsoleLayout } from '@/composables/useConsoleLayout'
import ThemeSwitcher from '@/components/chat/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/chat/LanguageSwitcher.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type TabKey = 'overview' | 'models' | 'users' | 'map' | 'usage' | 'hot-words' | 'settings' | 'settings-base' | 'settings-search' | 'settings-dict' | 'data' | 'data-import' | 'data-export'

const expandedGroups = ref<string[]>(['settings', 'data'])

// 侧边栏收起/展开（仅 PC 端生效；移动端始终只显示图标）
// 状态提升到 useConsoleLayout，页内二级 tab 据此决定是否显示，localStorage 持久化随之移入
const { collapsed, isMobile } = useConsoleLayout()

const tabs = computed(() => [
  { key: 'overview' as TabKey, icon: 'lucide:layout-dashboard', label: t('console.overview') },
  { key: 'models' as TabKey, icon: 'lucide:cpu', label: t('console.models') },
  { key: 'users' as TabKey, icon: 'lucide:users', label: t('console.users') },
  { key: 'map' as TabKey, icon: 'lucide:map', label: t('console.map') },
  { key: 'usage' as TabKey, icon: 'lucide:chart-bar', label: t('console.usage') },
  { key: 'hot-words' as TabKey, icon: 'lucide:trending-up', label: t('console.hotWords') },
  {
    key: 'data' as TabKey,
    icon: 'lucide:database',
    label: t('console.dataManage'),
    children: [
      { key: 'data-import' as TabKey, label: t('console.importManage'), path: '/admin/data/import' },
      { key: 'data-export' as TabKey, label: t('console.exportManage'), path: '/admin/data/export' }
    ]
  },
  {
    key: 'settings' as TabKey,
    icon: 'lucide:sliders-horizontal',
    label: t('console.settings'),
    children: [
      { key: 'settings-base' as TabKey, label: t('console.settingsBase'), path: '/admin/settings/base' },
      { key: 'settings-search' as TabKey, label: t('console.settingsSearch'), path: '/admin/settings/search' },
      { key: 'settings-dict' as TabKey, label: t('console.dictConfig'), path: '/admin/settings/dict' }
    ]
  }
])

const isActive = (key: string) => route.path === `/admin/${key}` || route.path === `/admin/${key}/`
// 二级菜单按完整路径匹配（key 与路由路径不同，如 settings-base ↔ /admin/settings/base）
const isChildActive = (path: string) => route.path === path || route.path === `${path}/`

// 移动端分组气泡当前打开的分组 key（点击一级图标弹出二级菜单）
const flyoutOpen = ref<string | null>(null)

const toggleGroup = (key: string) => {
  // PC 收起态：分组只支持悬停气泡，点击图标本身不做任何反应
  if (collapsed.value && !isMobile.value) return
  // 移动端：点击一级图标弹出/收起二级菜单气泡
  if (isMobile.value) {
    flyoutOpen.value = flyoutOpen.value === key ? null : key
    return
  }
  // 桌面展开态：内联展开/收起二级菜单
  if (expandedGroups.value.includes(key)) {
    expandedGroups.value = expandedGroups.value.filter((k) => k !== key)
  } else {
    expandedGroups.value = [...expandedGroups.value, key]
  }
}

// 移动端：点击气泡外部任意处收起气泡；路由跳转后自动关闭
const onDocClick = (e: MouseEvent) => {
  if (!flyoutOpen.value) return
  if (!(e.target as HTMLElement).closest('.console-menu-group')) flyoutOpen.value = null
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
watch(
  () => route.path,
  () => {
    flyoutOpen.value = null
  }
)

const backToChat = () => {
  router.push('/chat')
}

const logoutVisible = ref(false)
const confirmLogout = () => {
  logoutVisible.value = true
}
const logout = () => {
  logoutVisible.value = false
  auth.logout()
  router.replace('/login')
}
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
  position: relative;
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  border-right: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge);
  transition: width 0.18s ease-out;
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
  text-decoration: none;
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
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  border-bottom: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge);
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

/* 移动端布局：通过 <html data-device="mobile"> 参数区分（不使用媒体查询） */
[data-device="mobile"] .console-nav {
  width: 60px;
  padding: 20px 8px;
}

[data-device="mobile"] .console-brand {
  justify-content: center;
  padding: 0 0 20px;
}

[data-device="mobile"] .console-menu-group-header {
  justify-content: center;
  padding: 10px;
}

[data-device="mobile"] .console-menu-group-header span,
[data-device="mobile"] .console-menu-group-header .group-chevron {
  display: none;
}

[data-device="mobile"] .console-brand span,
[data-device="mobile"] .console-menu-item span {
  display: none;
}

[data-device="mobile"] .console-menu-item {
  justify-content: center;
  padding: 10px;
}

[data-device="mobile"] .console-menu-group-children {
  display: none; /* 移动端统一用点击气泡展示二级菜单，内联列表隐藏 */
}

[data-device="mobile"] .console-content {
  padding: 14px;
}

.console-menu-group {
  position: relative;
  margin-top: 4px;
}

.console-menu-group-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.console-menu-group-header:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.console-menu-group-header .group-chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.console-menu-group-header .group-chevron.rotated {
  transform: rotate(180deg);
}

/* 菜单文字收起/展开平滑揭示：max-width+opacity 过渡，避免 display:none 瞬时切换
   导致文字突然弹出、换行跳动（收起时零宽度+透明，图标仍保持居中） */
.console-brand span,
.console-menu-item span,
.console-menu-group-header span {
  white-space: nowrap;
  overflow: hidden;
  max-width: 200px;
  opacity: 1;
  transition: max-width 0.2s ease, opacity 0.2s ease;
}

.console-menu-group-children {
  margin-top: 2px;
  margin-left: 27px;
  padding-left: 0;
}

.console-menu-child {
  padding: 8px 12px 8px 12px !important;
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 二级菜单项之间留出间距，避免 hover/active 高亮贴在一起 */
.console-menu-child + .console-menu-child {
  margin-top: 4px;
}

.console-menu-child:hover {
  color: var(--color-primary);
  background: var(--color-surface);
}

.console-menu-child.active {
  color: var(--color-primary) !important;
  background: linear-gradient(135deg, var(--color-glow), transparent 70%) !important;
}

/* —— 收起态悬停浮层：普通项 tooltip + 分组二级菜单气泡（仅在 .is-collapsed 下可见）—— */
.console-menu-item-wrap {
  position: relative;
}

.console-item-tip,
.console-group-flyout {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  z-index: 50;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--glass-edge);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-4px);
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s;
}

.console-item-tip {
  padding: 6px 10px;
  min-width: 0;
  white-space: nowrap;
  font-size: 12px;
  color: var(--color-text);
  pointer-events: none;
}

.console-group-flyout {
  min-width: 148px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 6px;
}

/* 气泡与图标之间的透明连接带：鼠标从图标滑向气泡时不间断 */
.console-group-flyout::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -10px;
  width: 10px;
}

.console-group-flyout-label {
  display: block;
  padding: 6px 8px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.console-flyout-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition-fast);
}

.console-flyout-item:hover {
  color: var(--color-primary);
  background: var(--color-surface);
}

.console-flyout-item.active {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 70%);
}

/* 折叠「图钉」：极简小圆钮，置于面板（侧栏）内部底部右缘；右缘贴分割线，连接处无圆角 */
.console-collapse-pin {
  position: absolute;
  bottom: 20px;
  right: 0;
  z-index: 40;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 8px 0 0 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.console-collapse-pin:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.console-collapse-pin .pin-chev {
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

/* —— PC 端（data-device="desktop"）收起态：侧边栏收窄为仅图标 —— */
[data-device="desktop"] .admin-console.is-collapsed .console-nav {
  width: 64px;
  padding: 20px 8px;
}

[data-device="desktop"] .admin-console.is-collapsed .console-brand {
  justify-content: center;
  gap: 0;
  padding: 0 0 20px;
}

[data-device="desktop"] .admin-console.is-collapsed .console-brand span,
[data-device="desktop"] .admin-console.is-collapsed .console-menu-item span,
[data-device="desktop"] .admin-console.is-collapsed .console-menu-group-header span {
  max-width: 0;
  opacity: 0;
}

[data-device="desktop"] .admin-console.is-collapsed .console-menu-item {
  justify-content: center;
  gap: 0;
  padding: 10px;
}

[data-device="desktop"] .admin-console.is-collapsed .console-menu-group-header {
  justify-content: center;
  gap: 0;
}

[data-device="desktop"] .admin-console.is-collapsed .console-menu-group-header .group-chevron {
  display: none;
}

/* 收起态下二级菜单无处安放，直接隐藏；展开态由 v-show 控制 */
[data-device="desktop"] .admin-console.is-collapsed .console-menu-group-children {
  display: none;
}

/* 悬停普通图标 → 显示标签 tooltip；悬停分组图标 → 显示二级菜单气泡 */
[data-device="desktop"] .admin-console.is-collapsed .console-menu-item-wrap:hover .console-item-tip,
[data-device="desktop"] .admin-console.is-collapsed .console-menu-group:hover .console-group-flyout {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

/* 移动端（data-device="mobile"）不提供折叠开关（本身已只显示图标），隐藏图钉 */
[data-device="mobile"] .console-collapse-pin {
  display: none;
}

/* 移动端：点击一级图标（flyout-open）后显示二级菜单气泡 */
[data-device="mobile"] .console-menu-group.flyout-open .console-group-flyout {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}
</style>