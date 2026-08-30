<template>
  <span
    ref="triggerRef"
    class="app-tooltip__trigger"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="visible"
        ref="tooltipRef"
        class="app-tooltip"
        :class="`app-tooltip--${actualPlacement}`"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px`, maxWidth: `${maxWidth}px` }"
        role="tooltip"
      >
        <div class="app-tooltip__content">
          <slot name="content">{{ content }}</slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    content?: string
    placement?: 'top' | 'bottom'
    maxWidth?: number
    disabled?: boolean
    // 强制可显示：默认仅在触发元素文本溢出时显示，info 图标等无溢出场景需置 true
    force?: boolean
  }>(),
  {
    content: '',
    placement: 'top',
    maxWidth: 320,
    disabled: false,
    force: false
  }
)

const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const pos = ref({ top: 0, left: 0 })
const actualPlacement = ref<'top' | 'bottom'>(props.placement)

// 递归检测自身或子元素是否发生内容溢出（被截断）
function isOverflow(el: HTMLElement): boolean {
  if (el.scrollWidth > el.clientWidth + 1) return true
  for (const child of Array.from(el.children)) {
    if (isOverflow(child as HTMLElement)) return true
  }
  return false
}

function updatePosition() {
  const trigger = triggerRef.value
  const tip = tooltipRef.value
  if (!trigger || !tip) return
  const rect = trigger.getBoundingClientRect()
  const tw = tip.offsetWidth
  const th = tip.offsetHeight
  const gap = 8

  let left = rect.left + rect.width / 2 - tw / 2
  let top = rect.top - th - gap
  let placement: 'top' | 'bottom' = 'top'

  // 上方放不下则放到下方
  if (top < 8) {
    top = rect.bottom + gap
    placement = 'bottom'
  }
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8))

  actualPlacement.value = placement
  pos.value = { top, left }
}

async function onEnter() {
  if (props.disabled) return
  const trigger = triggerRef.value
  if (!trigger) return
  // 默认仅文本溢出才显示；force 用于 info 图标等始终需要提示的场景
  if (!props.force && !isOverflow(trigger)) return
  visible.value = true
  await nextTick()
  updatePosition()
}

function onLeave() {
  visible.value = false
}

onBeforeUnmount(() => {
  visible.value = false
})
</script>

<style scoped>
.app-tooltip__trigger {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}

.app-tooltip {
  position: fixed;
  z-index: 10002;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.32),
    0 0 14px var(--color-glow);
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.5;
  pointer-events: none;
  word-break: break-all;
}

.app-tooltip__content {
  white-space: normal;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
