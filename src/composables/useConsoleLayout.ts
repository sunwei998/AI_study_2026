import { computed, readonly, ref, watch } from 'vue'

/**
 * 控制台布局的共享状态（模块级单例）。
 *
 * 侧边栏折叠态原本是 AdminConsole.vue 内部的局部 ref，页内二级 tab 需要感知它才能
 * 做到「侧栏展开时隐藏 tab、收起时才显示」，因此提升到这里供 AdminConsole 与
 * AdminTabLayout 共享。
 */

const STORAGE_KEY = 'adminConsoleCollapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // 隐私模式 / 禁用存储时静默降级为展开
    return false
  }
}

/** 侧边栏是否收起。**刻意返回可写 ref**，让 AdminConsole 模板里的 `collapsed = !collapsed` 保持原样可用。 */
const collapsed = ref(readCollapsed())

watch(collapsed, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    // 写入失败不影响本次会话的交互
  }
})

/**
 * 移动端判定：读取 `<html data-device>`。
 *
 * 这里**刻意不用** `useDevice` —— 它基于 `matchMedia('(pointer: coarse)')`，与驱动侧栏
 * 宽度的 CSS `[data-device="mobile"]` 是两套并行机制，在带触屏的笔记本上结论会相反。
 * 必须和样式层取同一个判定源，否则 tab 显隐会和侧栏实际形态错位。
 */
const readDevice = (): boolean => document.documentElement.dataset.device === 'mobile'

const isMobile = ref(readDevice())

// index.html 的内联脚本会在 resize / orientationchange 时改写 <html data-device>
new MutationObserver(() => {
  isMobile.value = readDevice()
}).observe(document.documentElement, { attributeFilter: ['data-device'] })

/**
 * 页内二级 tab 是否显示。
 * 移动端侧栏常驻收起且没有折叠图钉可切换（`collapsed` 对移动端无意义），因此恒为 true。
 */
const showTabs = computed(() => isMobile.value || collapsed.value)

export function useConsoleLayout() {
  return {
    collapsed,
    isMobile: readonly(isMobile),
    showTabs: readonly(showTabs)
  }
}
