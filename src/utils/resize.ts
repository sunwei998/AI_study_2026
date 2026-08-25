/**
 * 图表/布局 resize 合并工具（性能优化）：
 *
 * - createRafCoalescer：把 window resize 与 ResizeObserver 的回调合并到同一动画帧只执行一次。
 *   window resize 与容器 ResizeObserver 在窗口缩放时会同时触发，若直接各自执行会造成同帧重复
 *   计算；经 rAF 合并后每帧至多一次，侧边栏收起/展开等连续变化时也能平滑跟随。
 * - createDebounced：高频触发后延迟执行一次，适用于昂贵的布局（如词云 d3 重排），
 *   等尺寸变化稳定后再重排，避免拖拽窗口时逐帧卡顿。
 */

export function createRafCoalescer() {
  let rafId = 0
  return function schedule(fn: () => void) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      fn()
    })
  }
}

export function createDebounced<T extends (...args: never[]) => void>(fn: T, delay = 120) {
  let timer: number | undefined
  return (...args: Parameters<T>) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = undefined
      fn(...args)
    }, delay)
  }
}
