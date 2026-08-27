<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface WordItem {
  text: string
  weight: number
}

interface PlacedWord {
  text: string
  weight: number
  x: number
  y: number
  size: number
  color: string
  rotate: number
  driftX: number
  driftY: number
  duration: number
  delay: number
  glow: number
  pulseDuration: number
  pulseDelay: number
}

const props = withDefaults(
  defineProps<{
    words: WordItem[]
    maxSize?: number
    minSize?: number
    padding?: number
  }>(),
  {
    maxSize: 64,
    minSize: 14,
    padding: 12
  }
)

const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(800)
const height = ref(420)

// 主题主色与强调色（从 CSS 变量读取，切主题后重排以应用新配色）
const primary = ref('#00e5ff')
const accent = ref('#7c5cff')

function readThemeColors() {
  const cs = getComputedStyle(document.documentElement)
  primary.value = cs.getPropertyValue('--color-primary').trim() || '#00e5ff'
  accent.value = cs.getPropertyValue('--color-accent').trim() || '#7c5cff'
}

// 颜色插值：在 primary 与 accent 之间按 t 取色，再叠一点透明度层次
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`
}

function parseHex(hex: string): number[] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return [0, 229, 255]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// 固定辅助色板（科技风，与任意主题都能和谐共存），
// 与主题主色/强调色一起组成多彩词云，避免颜色过于单一
const AUX_COLORS = [
  '#ff6b9d', // 品红
  '#ffb020', // 琥珀
  '#34d399', // 翠绿
  '#60a5fa', // 天蓝
  '#e879f9', // 紫粉
  '#f97316', // 橙
  '#22d3ee', // 青
  '#a78bfa' // 紫
]

// 生成词色：权重高的偏向主题主色/强调色，权重低的从辅助色板取，兼顾多样与主次
function pickColor(t: number, rng: number): string {
  if (t > 0.5) {
    return lerpColor(primary.value, accent.value, (t - 0.5) * 2)
  }
  // 低权重：一半概率用主题系（更淡），一半概率用辅助色
  if (rng < 0.45) {
    const c = AUX_COLORS[Math.floor(rng * 20) % AUX_COLORS.length]
    return c
  }
  return lerpColor(primary.value, accent.value, t * 2)
}

// 估算文本渲染宽度（中文≈字号，英文/数字≈0.55 字号），用于碰撞检测
function textWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? size : size * 0.55
  }
  return w
}

// 词云布局：按权重降序，从画布中心用阿基米德螺线向外放置，矩形碰撞检测
function layout(): PlacedWord[] {
  const list = [...props.words].sort((a, b) => b.weight - a.weight)
  if (!list.length) return []
  const maxW = Math.max(1, list[0].weight)
  const minW = Math.min(...list.map((w) => w.weight))
  const range = Math.max(1, maxW - minW)
  const cx = width.value / 2
  const cy = height.value / 2
  const placed: PlacedWord[] = []
  const boxes: { x1: number; y1: number; x2: number; y2: number }[] = []
  const pad = props.padding

  for (const word of list) {
    const t = range === 0 ? 1 : (word.weight - minW) / range
    const size = Math.round(props.minSize + (props.maxSize - props.minSize) * t)
    const w = textWidth(word.text, size)
    const h = size * 1.15
    const rotate = word.weight === maxW ? 0 : Math.random() < 0.12 ? 90 : 0
    // 旋转 90° 时宽高互换
    const bw = rotate ? h : w
    const bh = rotate ? w : h

    let px = cx
    let py = cy
    let found = false
    // 阿基米德螺线：r 递增，角度按黄金角推进
    const golden = Math.PI * (3 - Math.sqrt(5))
    let angle = Math.random() * Math.PI * 2
    let r = 0
    const step = 1.4
    const maxR = Math.max(cx, cy) + Math.max(w, h)

    while (r < maxR && !found) {
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      const x1 = x - bw / 2 - pad
      const y1 = y - bh / 2 - pad
      const x2 = x + bw / 2 + pad
      const y2 = y + bh / 2 + pad
      if (x1 >= 0 && y1 >= 0 && x2 <= width.value && y2 <= height.value) {
        let collide = false
        for (const b of boxes) {
          if (x1 < b.x2 && x2 > b.x1 && y1 < b.y2 && y2 > b.y1) {
            collide = true
            break
          }
        }
        if (!collide) {
          px = x
          py = y
          found = true
          boxes.push({ x1, y1, x2, y2 })
        }
      }
      angle += golden
      r = step * Math.sqrt(angle)
    }

    const color = pickColor(t, Math.random())
    // 银河繁星：每个词独立的小幅漂移（幅度随字号略增），随机时长与相位
    const driftBase = 2 + t * 6
    const driftX = driftBase * (0.5 + Math.random())
    const driftY = driftBase * (0.5 + Math.random())
    const duration = 4.5 + Math.random() * 8
    const delay = -(Math.random() * 14)
    const glow = 2 + t * 6
    const pulseDuration = 3.5 + Math.random() * 5
    const pulseDelay = -(Math.random() * 10)
    placed.push({
      text: word.text,
      weight: word.weight,
      x: px,
      y: py,
      size,
      color,
      rotate,
      driftX,
      driftY,
      duration,
      delay,
      glow,
      pulseDuration,
      pulseDelay
    })
  }
  return placed
}

const placedWords = ref<PlacedWord[]>([])

function relayout() {
  if (props.words.length) placedWords.value = layout()
}

watch(() => props.words, relayout, { deep: true })

let resizeObserver: ResizeObserver | null = null
function observe() {
  resizeObserver?.disconnect()
  if (!containerRef.value) return
  resizeObserver = new ResizeObserver((entries) => {
    for (const e of entries) {
      const w = Math.max(280, Math.floor(e.contentRect.width))
      const h = Math.max(240, Math.floor(e.contentRect.height))
      if (w !== width.value || h !== height.value) {
        width.value = w
        height.value = h
        relayout()
      }
    }
  })
  resizeObserver.observe(containerRef.value)
}

// 主题切换监听：通过 MutationObserver 观察 data-theme 属性变化
let themeObserver: MutationObserver | null = null
function observeTheme() {
  themeObserver?.disconnect()
  themeObserver = new MutationObserver(() => {
    readThemeColors()
    relayout()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

onMounted(() => {
  readThemeColors()
  observe()
  observeTheme()
  relayout()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
})

const viewBox = computed(() => `0 0 ${width.value} ${height.value}`)
</script>

<template>
  <div ref="containerRef" class="app-word-cloud">
    <svg :viewBox="viewBox" class="word-cloud-svg" role="img" aria-label="word cloud">
      <g v-for="(w, i) in placedWords" :key="w.text">
        <title>{{ w.text }} · {{ w.weight.toLocaleString() }}</title>
        <g
          class="wc-float"
          :style="{
            '--drift-x': `${w.driftX}px`,
            '--drift-y': `${w.driftY}px`,
            '--dur': `${w.duration}s`,
            '--dur-delay': `${w.delay}s`,
            '--pulse-dur': `${w.pulseDuration}s`,
            '--pulse-delay': `${w.pulseDelay}s`
          }"
        >
          <text
            :x="w.x"
            :y="w.y"
            :font-size="w.size"
            :fill="w.color"
            :transform="w.rotate ? `rotate(${w.rotate} ${w.x} ${w.y})` : undefined"
            text-anchor="middle"
            dominant-baseline="middle"
            class="wc-text"
            :style="{
              animationDelay: `${i * 18}ms`,
              filter: `drop-shadow(0 0 ${w.glow}px ${w.color})`
            }"
          >
            {{ w.text }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.app-word-cloud {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.word-cloud-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* 银河繁星：每个词围绕自身位置做缓慢漂移（translate），
   位移幅度由 --drift-x/--drift-y 控制，时长与相位在布局时随机生成 */
.wc-float {
  animation:
    wc-drift var(--dur, 8s) ease-in-out var(--dur-delay, 0s) infinite,
    wc-pulse var(--pulse-dur, 6s) ease-in-out var(--pulse-delay, 0s) infinite;
  will-change: transform;
}

.wc-text {
  cursor: default;
  opacity: 0;
  animation: wc-in 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  transition: opacity 0.2s ease;
}

.wc-text:hover {
  opacity: 1;
  filter: drop-shadow(0 0 10px currentColor) !important;
}

@keyframes wc-in {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 0.95;
    transform: scale(1);
  }
}

@keyframes wc-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(var(--drift-x), calc(var(--drift-y) * -1));
  }
  50% {
    transform: translate(calc(var(--drift-x) * -1), var(--drift-y));
  }
  75% {
    transform: translate(calc(var(--drift-x) * 0.6), calc(var(--drift-y) * 0.8));
  }
}

@keyframes wc-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
</style>
