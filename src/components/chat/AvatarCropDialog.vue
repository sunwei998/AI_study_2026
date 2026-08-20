<template>
  <Teleport to="body">
    <Transition name="crop-fade">
      <div v-if="visible" class="crop-overlay" @click.self="onCancel">
        <div class="crop-panel" role="dialog" aria-modal="true" :aria-label="$t('profile.cropTitle')">
          <div class="crop-header">
            <h3 class="crop-title">{{ $t('profile.cropTitle') }}</h3>
            <button class="crop-close" :title="$t('profile.cancel')" @click="onCancel">
              <AppIcon name="lucide:x" :size="16" />
            </button>
          </div>

          <div
            ref="stageRef"
            class="crop-stage"
            :style="{ width: stageSize + 'px', height: stageSize + 'px' }"
            @pointerdown="onPanDown"
            @pointermove="onPanMove"
            @pointerup="onPanUp"
            @pointercancel="onPanUp"
          >
            <img
              v-if="loaded"
              :src="image"
              class="crop-img"
              :style="{ width: dispW + 'px', height: dispH + 'px', left: imageLeft + 'px', top: imageTop + 'px' }"
              draggable="false"
              alt=""
            />
            <div class="crop-mask"></div>
            <div class="crop-ring"></div>
          </div>

          <div class="crop-controls">
            <AppIcon name="lucide:zoom-out" :size="16" />
            <input
              type="range"
              class="crop-zoom"
              :min="minZoom"
              :max="maxZoom"
              step="0.01"
              v-model.number="zoom"
            />
            <AppIcon name="lucide:zoom-in" :size="16" />
          </div>

          <div class="crop-footer">
            <button type="button" class="crop-btn crop-btn--cancel" @click="onCancel">
              {{ $t('profile.cancel') }}
            </button>
            <button type="button" class="crop-btn crop-btn--confirm" :disabled="!loaded" @click="confirm">
              {{ $t('profile.cropConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { cropToAvatarDataUrl } from '@/utils/image'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{ visible: boolean; image: string }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'confirm', dataUrl: string): void }>()

const stageSize = 300
const minZoom = 1
const maxZoom = 3
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const img = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const stageRef = ref<HTMLDivElement | null>(null)

const SIZE = computed(() => img.value ? Math.max(img.value.naturalWidth, img.value.naturalHeight) : 0)
const baseScale = computed(() => {
  if (!img.value || !SIZE.value) return 1
  return Math.max(stageSize / img.value.naturalWidth, stageSize / img.value.naturalHeight)
})
const scale = computed(() => baseScale.value * zoom.value)
const dispW = computed(() => (img.value?.naturalWidth ?? 0) * scale.value)
const dispH = computed(() => (img.value?.naturalHeight ?? 0) * scale.value)

const clampOffset = (dx: number, dy: number): { x: number; y: number } => {
  const maxX = Math.max(0, (dispW.value - stageSize) / 2)
  const maxY = Math.max(0, (dispH.value - stageSize) / 2)
  return { x: Math.min(maxX, Math.max(-maxX, dx)), y: Math.min(maxY, Math.max(-maxY, dy)) }
}

const imageLeft = computed(() => stageSize / 2 - dispW.value / 2 + offsetX.value)
const imageTop = computed(() => stageSize / 2 - dispH.value / 2 + offsetY.value)

let panning: { sx: number; sy: number; ox: number; oy: number } | null = null

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    loaded.value = false
    zoom.value = 1
    offsetX.value = 0
    offsetY.value = 0
    nextTick(() => {
      const el = new Image()
      el.onload = () => {
        img.value = el
        loaded.value = true
      }
      el.src = props.image
    })
  }
)

watch(zoom, () => {
  offsetX.value = 0
  offsetY.value = 0
})

const onPanDown = (e: PointerEvent) => {
  panning = { sx: e.clientX, sy: e.clientY, ox: offsetX.value, oy: offsetY.value }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

const onPanMove = (e: PointerEvent) => {
  if (!panning) return
  e.preventDefault()
  const clamped = clampOffset(panning.ox + (e.clientX - panning.sx), panning.oy + (e.clientY - panning.sy))
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}

const onPanUp = () => {
  panning = null
}

const onCancel = () => {
  emit('update:visible', false)
}

const confirm = async () => {
  if (!img.value || !loaded.value) return
  const r = stageSize / 2
  const cx = stageSize / 2
  const cy = stageSize / 2
  const srcCX = (cx - imageLeft.value) / scale.value
  const srcCY = (cy - imageTop.value) / scale.value
  const srcR = r / scale.value
  const out = await cropToAvatarDataUrl(img.value, srcCX - srcR, srcCY - srcR, srcR * 2)
  emit('confirm', out)
}
</script>

<style scoped>
.crop-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.crop-panel {
  width: min(360px, 100%);
  padding: 18px;
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 var(--glass-edge);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crop-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.crop-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.crop-close:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
}

.crop-stage {
  position: relative;
  align-self: center;
  overflow: hidden;
  border-radius: 50%;
  touch-action: none;
  cursor: grab;
  -webkit-user-select: none;
  user-select: none;
}

.crop-stage:active {
  cursor: grabbing;
}

.crop-img {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
}

.crop-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, transparent 0, transparent calc(50% - 1px), rgba(0, 0, 0, 0.55) calc(50% + 1px));
}

.crop-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.5);
}

.crop-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
}

.crop-zoom {
  flex: 1;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.crop-footer {
  display: flex;
  gap: 12px;
}

.crop-btn {
  flex: 1;
  height: 42px;
  border-radius: 11px;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: var(--transition-fast);
}

.crop-btn--cancel {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
}

.crop-btn--cancel:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.crop-btn--confirm {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
}

.crop-btn--confirm:hover:not(:disabled) {
  filter: brightness(1.08);
}

.crop-btn--confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.crop-fade-enter-active,
.crop-fade-leave-active {
  transition: opacity 0.22s ease;
}

.crop-fade-enter-active .crop-panel {
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.crop-fade-leave-active .crop-panel {
  transition: transform 0.18s ease;
}

.crop-fade-enter-from,
.crop-fade-leave-to {
  opacity: 0;
}

.crop-fade-enter-from .crop-panel {
  transform: scale(0.94);
}

.crop-fade-leave-to .crop-panel {
  transform: scale(0.97);
}

@media (max-width: 480px) {
  .crop-panel {
    width: 100%;
  }
}
</style>