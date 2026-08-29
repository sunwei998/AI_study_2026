<script lang="ts">
export interface AdminTabItem {
  key: string
  icon: string
  label: string
  path: string
  name: string
}
</script>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useConsoleLayout } from '@/composables/useConsoleLayout'

defineProps<{ tabs: AdminTabItem[] }>()

const { showTabs, isMobile } = useConsoleLayout()
</script>

<template>
  <div class="admin-tab-layout">
    <div
      class="admin-tab-layout__tabs"
      :class="{ 'is-hidden': !showTabs, 'is-static': isMobile }"
      :aria-hidden="!showTabs || undefined"
      :inert="!showTabs || undefined"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path"
        class="admin-tab-layout__tab"
        :class="{ active: $route.name === tab.name }"
      >
        <AppIcon :name="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </div>

    <div class="admin-tab-layout__content">
      <slot><RouterView /></slot>
    </div>
  </div>
</template>

<style scoped>
.admin-tab-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.admin-tab-layout__tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
  opacity: 1;
  visibility: visible;
  /* 实测内容高约 58.5px，留足余量，避免字体度量波动时裁掉文字 */
  max-height: var(--tab-max-h, 72px);
  /* tab 与下方内容的间距。对齐项目既有的紧邻节奏（工具栏→表格、表格→分页均为 6px）。
     必须用 margin 而非父容器的 gap —— flex gap 在子项之间恒定生效，
     tab 折叠到 0 高度后仍会残留 6px 幽灵间距 */
  margin-bottom: 6px;
  /* 延迟 0.08s：等侧栏 0.18s 收起动画基本完成后 tab 才降下 */
  transition:
    max-height 0.22s ease-out 0.08s,
    padding-top 0.22s ease-out 0.08s,
    padding-bottom 0.22s ease-out 0.08s,
    border-bottom-width 0.22s ease-out 0.08s,
    margin-bottom 0.22s ease-out 0.08s,
    opacity 0.22s ease-out 0.08s,
    visibility 0s linear 0s;
}

.admin-tab-layout__tabs.is-hidden {
  max-height: 0;
  /* 关键：max-height:0 压不掉 padding 与 border（内容盒不能为负、只能钳到 0），
     不归零这两项会残留 12+8+1=21px 的空白条 */
  padding-top: 0;
  padding-bottom: 0;
  border-bottom-width: 0;
  /* 间距同样归零，否则 tab 隐藏后残留 6px */
  margin-bottom: 0;
  opacity: 0;
  visibility: hidden;
  /* 展开侧栏时 tab 立即收起，不延迟 */
  transition:
    max-height 0.22s ease-out 0s,
    padding-top 0.22s ease-out 0s,
    padding-bottom 0.22s ease-out 0s,
    border-bottom-width 0.22s ease-out 0s,
    margin-bottom 0.22s ease-out 0s,
    opacity 0.18s ease-out 0s,
    /* 延后到动画结束再真正隐藏，避免动画中途焦点丢失 */
    visibility 0s linear 0.22s;
}

/* 移动端侧栏常驻收起，tab 恒显示，避免桌面↔移动切换时误播动画 */
.admin-tab-layout__tabs.is-static {
  transition: none;
}

.admin-tab-layout__tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: var(--transition-fast);
}

.admin-tab-layout__tab:hover {
  color: var(--color-primary);
  background: var(--color-glass);
}

.admin-tab-layout__tab.active {
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-glow), transparent 70%);
  box-shadow: inset 0 0 12px var(--color-glow);
}

.admin-tab-layout__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

@media (prefers-reduced-motion: reduce) {
  .admin-tab-layout__tabs {
    transition: none;
  }
}
</style>
