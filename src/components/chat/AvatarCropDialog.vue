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

          <div class="crop-main">
            <!-- 裁剪舞台：初始完整显示整张图片，支持拖拽（鼠标/手指）与双指/滑块缩放 -->
            <div
              ref="stageRef"
              class="crop-stage"
              :style="{ width: stageSize + 'px', height: stageSize + 'px' }"
              @touchstart.prevent="onTouchStart"
              @touchmove.prevent="onTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchEnd"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
            >
              <img
                v-if="loaded"
                ref="imgRef"
                :src="image"
                class="crop-img"
                :style="{ width: dispW + 'px', height: dispH + 'px', left: imageLeft + 'px', top: imageTop + 'px' }"
                draggable="false"
                alt=""
              />
              <div class="crop-mask"></div>
              <div class="crop-ring"></div>
              <div class="crop-grid"></div>
            </div>

            <!-- 实时预览：1:1 裁剪结果 -->
            <div class="crop-preview" :style="{ width: previewSize + 'px', height: previewSize + 'px' }">
              <img
                v-if="loaded"
                :src="image"
                class="crop-preview-img"
                :style="previewImgStyle"
                draggable="false"
                alt=""
              />
              <span v-if="!loaded" class="crop-preview-placeholder">
                <AppIcon name="lucide:image" :size="20" />
              </span>
            </div>
          </div>

          <div class="crop-controls">
            <AppIcon name="lucide:zoom-out" :size="16" />
            <input
              type="range"
              class="crop-zoom"
              :min="minZoom"
              :max="maxZoom"
              step="0.01"
              :value="zoom"
              @input="onZoomInput"
            />
            <AppIcon name="lucide:zoom-in" :size="16" />
            <span class="crop-hint">{{ Math.round(zoom * 100) }}%</span>
          </div>

          <div class="crop-tip">
            <AppIcon name="lucide:move" :size="13" />
            <span>{{ $t('profile.cropTip') }}</span>
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { cropToAvatarDataUrl } from '@/utils/image'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{ visible: boolean; image: string }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'confirm', dataUrl: string): void }>()

// 舞台/预览尺寸自适应（移动端更小）
const PREVIEW_SIZE = 76
const stageSize = ref(Math.min(300, window.innerWidth - 56))
const previewSize = PREVIEW_SIZE

const minZoom = 1
const maxZoom = 4
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const img = ref<HTMLImageElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const stageRef = ref<HTMLDivElement | null>(null)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 基础缩放：contain——初始完整显示整张图片（主流头像裁剪交互）
const baseScale = computed(() => {
  if (!img.value) return 1
  return Math.min(stageSize.value / img.value.naturalWidth, stageSize.value / img.value.naturalHeight)
})
const scale = computed(() => baseScale.value * zoom.value)
const dispW = computed(() => (img.value?.naturalWidth ?? 0) * scale.value)
const dispH = computed(() => (img.value?.naturalHeight ?? 0) * scale.value)

const clampOffset = (dx: number, dy: number): { x: number; y: number } => {
  const maxX = Math.max(0, (dispW.value - stageSize.value) / 2)
  const maxY = Math.max(0, (dispH.value - stageSize.value) / 2)
  return { x: clamp(dx, -maxX, maxX), y: clamp(dy, -maxY, maxY) }
}

const imageLeft = computed(() => stageSize.value / 2 - dispW.value / 2 + offsetX.value)
const imageTop = computed(() => stageSize.value / 2 - dispH.value / 2 + offsetY.value)

// 实时预览：把裁剪框区域映射到预览圆
const previewScale = computed(() => previewSize / stageSize.value)
const previewImgStyle = computed(() => ({
  width: `${dispW.value * previewScale.value}px`,
  height: `${dispH.value * previewScale.value}px`,
  left: `${imageLeft.value * previewScale.value}px`,
  top: `${imageTop.value * previewScale.value}px`
}))

// ============ 手势：鼠标拖拽（PC）+ 触摸拖拽/双指缩放（移动端） ============
// 用 touch/mouse 事件替代 pointer，避免移动端浏览器手势接管导致 pointercancel 中断缩放
let mousePan: { sx: number; sy: number; ox: number; oy: number } | null = null
let touchPan: { sx: number; sy: number; ox: number; oy: number } | null = null
let pinchStart = 0
let pinchZoomStart = 1

function onMouseDown(e: MouseEvent) {
  mousePan = { sx: e.clientX, sy: e.clientY, ox: offsetX.value, oy: offsetY.value }
}

function onMouseMove(e: MouseEvent) {
  if (!mousePan) return
  const c = clampOffset(mousePan.ox + (e.clientX - mousePan.sx), mousePan.oy + (e.clientY - mousePan.sy))
  offsetX.value = c.x
  offsetY.value = c.y
}

function onMouseUp() {
  mousePan = null
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches
  if (t.length === 1) {
    touchPan = { sx: t[0].clientX, sy: t[0].clientY, ox: offsetX.value, oy: offsetY.value }
  } else if (t.length === 2) {
    touchPan = null
    pinchStart = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    pinchZoomStart = zoom.value
  }
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches
  if (t.length === 2) {
    const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    if (pinchStart > 0) {
      zoom.value = clamp(pinchZoomStart * (d / pinchStart), minZoom, maxZoom)
    }
  } else if (t.length === 1 && touchPan) {
    const c = clampOffset(touchPan.ox + (t[0].clientX - touchPan.sx), touchPan.oy + (t[0].clientY - touchPan.sy))
    offsetX.value = c.x
    offsetY.value = c.y
  }
}

function onTouchEnd() {
  touchPan = null
  pinchStart = 0
}

function onZoomInput(e: Event) {
  zoom.value = Number((e.target as HTMLInputElement).value)
}

// 缩放后保持中心并限制边界（不重置偏移）
watch(zoom, () => {
  const c = clampOffset(offsetX.value, offsetY.value)
  offsetX.value = c.x
  offsetY.value = c.y
})

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    loaded.value = false
    zoom.value = 1
    offsetX.value = 0
    offsetY.value = 0
    mousePan = null
    touchPan = null
    pinchStart = 0
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

function onResize() {
  stageSize.value = Math.min(300, window.innerWidth - 56)
}

watch(
  () => props.visible,
  (v) => {
    if (v) window.addEventListener('resize', onResize)
    else window.removeEventListener('resize', onResize)
  }
)
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const onCancel = () => {
  emit('update:visible', false)
}

// 确认裁剪：按 DOM 实际渲染位置映射到源图坐标（不依赖 computed，杜绝状态不同步）
const confirm = async () => {
  if (!img.value || !loaded.value) return
  const stage = stageRef.value
  const imgEl = imgRef.value
  if (!stage || !imgEl) return
  const stageW = stage.clientWidth
  const naturalW = img.value.naturalWidth
  if (!naturalW || !stageW) return
  // 实际显示比例 = 显示宽度 / 源图宽度
  const ratio = imgEl.offsetWidth / naturalW
  if (!ratio) return
  const cx = stageW / 2
  const cy = stageW / 2
  const srcCX = (cx - imgEl.offsetLeft) / ratio
  const srcCY = (cy - imgEl.offsetTop) / ratio
  const srcR = (stageW / 2) / ratio
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
  width: min(380px, 100%);
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
  gap: 14px;
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
  transition: var(--transition-fast);
}

.crop-close:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
}

.crop-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.crop-stage {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  touch-action: none;
  cursor: grab;
  -webkit-user-select: none;
  user-select: none;
  background: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-border), 0 12px 32px rgba(0, 0, 0, 0.35);
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
  will-change: left, top;
}

/* 遮罩：圆形外压暗 */
.crop-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, transparent 0, transparent calc(50% - 1px), rgba(0, 0, 0, 0.55) calc(50% + 1px));
}

/* 裁剪圆环：主题色发光 */
.crop-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 2px solid color-mix(in srgb, var(--color-primary) 80%, #fff);
  border-radius: 50%;
  box-shadow: 0 0 16px var(--color-glow), inset 0 0 8px rgba(0, 0, 0, 0.25);
}

/* 九宫格辅助线 */
.crop-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background:
    linear-gradient(to right, transparent calc(50% - 0.5px), rgba(255, 255, 255, 0.35) calc(50% - 0.5px), rgba(255, 255, 255, 0.35) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(to bottom, transparent calc(50% - 0.5px), rgba(255, 255, 255, 0.35) calc(50% - 0.5px), rgba(255, 255, 255, 0.35) calc(50% + 0.5px), transparent calc(50% + 0.5px));
}

/* 实时预览圆 */
.crop-preview {
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 14px var(--color-glow), 0 6px 18px rgba(0, 0, 0, 0.35);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-preview-img {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  pointer-events: none;
}

.crop-preview-placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.crop-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
}

.crop-zoom {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  outline: none;
  cursor: pointer;
}

.crop-zoom::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
  cursor: pointer;
}

.crop-zoom::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
  cursor: pointer;
}

.crop-hint {
  min-width: 40px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.crop-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.crop-footer {
  display: flex;
  gap: 12px;
}

.crop-btn {
  flex: 1;
  height: 42px;
  border-radius: var(--radius-md);
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
  box-shadow: 0 4px 14px var(--color-glow);
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

  .crop-main {
    gap: 10px;
  }

  .crop-preview {
    display: none;
  }
}
</style>
