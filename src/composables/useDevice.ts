import { computed, readonly, ref } from 'vue'

export type DeviceType = 'mobile' | 'desktop'

const coarse = window.matchMedia('(pointer: coarse)')
const anyCoarse = window.matchMedia('(any-pointer: coarse)')
const fine = window.matchMedia('(pointer: fine)')
const hover = window.matchMedia('(hover: hover)')

const isTouch = ref(coarse.matches)
const isHoverDevice = ref(hover.matches)
const isMobile = ref(coarse.matches)

const device = computed<DeviceType>(() => (isMobile.value ? 'mobile' : 'desktop'))
const isDesktop = computed(() => !isMobile.value)

function sync(): void {
  isTouch.value = coarse.matches
  isHoverDevice.value = hover.matches
  isMobile.value = coarse.matches || (anyCoarse.matches && !fine.matches)
  const root = document.documentElement
  root.classList.toggle('device-mobile', isMobile.value)
  root.classList.toggle('device-desktop', !isMobile.value)
}

coarse.addEventListener('change', sync)
anyCoarse.addEventListener('change', sync)
fine.addEventListener('change', sync)
hover.addEventListener('change', sync)

sync()

export function useDevice() {
  return readonly({
    isMobile,
    isDesktop,
    isTouch,
    isHoverDevice,
    device
  })
}