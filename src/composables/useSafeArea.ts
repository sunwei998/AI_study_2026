import { onMounted, onBeforeUnmount } from 'vue'

const measureInset = (side: 'top' | 'bottom'): number => {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;left:0;width:1px;height:0;visibility:hidden;pointer-events:none;padding-${side}:env(safe-area-inset-${side}, 0px)`
  document.body.appendChild(el)
  const style = getComputedStyle(el)
  const value = parseFloat(side === 'top' ? style.paddingTop : style.paddingBottom) || 0
  document.body.removeChild(el)
  return value
}

export function useSafeArea(): void {
  let lastTop = -1
  let lastBottom = -1
  let rafId = 0

  const apply = () => {
    const root = document.documentElement
    const top = measureInset('top')
    const bottom = measureInset('bottom')

    if (top !== lastTop) {
      lastTop = top
      root.style.setProperty('--safe-top', `${top}px`)
    }
    if (bottom !== lastBottom) {
      lastBottom = bottom
      root.style.setProperty('--safe-bottom', `${bottom}px`)
    }
  }

  const schedule = () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(apply)
  }

  onMounted(() => {
    apply()
    window.addEventListener('orientationchange', schedule)
    window.addEventListener('resize', schedule)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('orientationchange', schedule)
    window.removeEventListener('resize', schedule)
  })
}