<template>
  <div class="app-gauge">
    <div class="gauge-head">
      <span class="gauge-label">{{ label }}</span>
      <span v-if="badge" class="gauge-badge">{{ badge }}</span>
    </div>

    <div class="gauge-body">
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="gauge-svg" role="img" :aria-label="label">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color: var(--color-primary)" />
            <stop offset="100%" style="stop-color: var(--color-accent)" />
          </linearGradient>
          <filter id="gauge-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- 背景弧 -->
        <path :d="arcPath" fill="none" :stroke="trackColor" stroke-width="11" stroke-linecap="round" />

        <!-- 刻度线 -->
        <g v-for="t in ticks" :key="t.angle">
          <line :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" :stroke="tickColor" stroke-width="2" stroke-linecap="round" />
        </g>

        <!-- 进度弧（发光渐变） -->
        <path
          :d="arcPath"
          fill="none"
          stroke="url(#gauge-grad)"
          stroke-width="11"
          stroke-linecap="round"
          :stroke-dasharray="arcLen"
          :stroke-dashoffset="dashOffset"
          filter="url(#gauge-glow)"
          style="transition: stroke-dashoffset 0.9s cubic-bezier(0.34, 1.3, 0.64, 1)"
        />

        <!-- 指针 -->
        <g
          :style="{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 0.9s cubic-bezier(0.34, 1.3, 0.64, 1)'
          }"
        >
          <line
            :x1="CX"
            :y1="CY"
            :x2="CX"
            :y2="CY - radius + 20"
            :stroke="needleColor"
            stroke-width="3"
            stroke-linecap="round"
            filter="url(#gauge-glow)"
          />
        </g>

        <!-- 轴心 -->
        <circle :cx="CX" :cy="CY" :r="8" :fill="needleColor" filter="url(#gauge-glow)" />
        <circle :cx="CX" :cy="CY" :r="3" fill="var(--color-surface)" />
      </svg>

      <div class="gauge-readout">
        <span class="gauge-value">{{ displayValue }}</span>
        <span class="gauge-unit">{{ unit }}</span>
      </div>
    </div>

    <div v-if="caption" class="gauge-foot">
      <span class="gauge-caption">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    label?: string
    unit?: string
    badge?: string
    caption?: string
    decimals?: number
  }>(),
  {
    label: '',
    unit: '',
    badge: '',
    caption: '',
    decimals: 0
  }
)

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const radius = 82
// 码表角度范围：从 135° 顺时针扫 270° 到底部另一侧（底部开口）
const START_ANGLE = 135
const SWEEP = 270

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// 弧路径
const arcPath = computed(() => {
  const start = polar(CX, CY, radius, START_ANGLE)
  const end = polar(CX, CY, radius, START_ANGLE + SWEEP)
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
})

const arcLen = computed(() => (2 * Math.PI * radius * SWEEP) / 360)

const ratio = computed(() => {
  if (!props.max || props.max <= 0) return 0
  return Math.min(1, Math.max(0, props.value / props.max))
})

const dashOffset = computed(() => arcLen.value * (1 - ratio.value))

const needleAngle = computed(() => START_ANGLE + SWEEP * ratio.value)

// 刻度：8 个均匀分布
const ticks = computed(() => {
  const list: { angle: number; x1: number; y1: number; x2: number; y2: number }[] = []
  const N = 8
  for (let i = 0; i <= N; i++) {
    const angle = START_ANGLE + (SWEEP * i) / N
    const outer = polar(CX, CY, radius - 14, angle)
    const inner = polar(CX, CY, radius - 4, angle)
    list.push({ angle, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y })
  }
  return list
})

function formatNumber(n: number): string {
  if (!isFinite(n)) return '0'
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + 'W'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return props.decimals > 0 ? n.toFixed(props.decimals) : String(Math.round(n))
}

const displayValue = computed(() => formatNumber(props.value))

const trackColor = 'color-mix(in srgb, var(--color-border) 55%, transparent)'
const tickColor = 'color-mix(in srgb, var(--color-border) 70%, transparent)'
const needleColor = 'var(--color-accent)'
</script>

<style scoped>
.app-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0 8px;
}

.gauge-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: space-between;
}

.gauge-label {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.gauge-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
  box-shadow: 0 0 10px var(--color-glow);
}

.gauge-body {
  position: relative;
  width: 100%;
  max-width: 240px;
}

.gauge-svg {
  width: 100%;
  height: auto;
  display: block;
}

.gauge-readout {
  position: absolute;
  left: 50%;
  bottom: 16%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 6px;
  pointer-events: none;
}

.gauge-value {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text);
  text-shadow:
    0 0 14px var(--color-glow),
    0 0 30px color-mix(in srgb, var(--color-primary) 50%, transparent);
  background: linear-gradient(180deg, var(--color-text), color-mix(in srgb, var(--color-primary) 60%, var(--color-text)));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.gauge-unit {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--color-text-secondary);
}

.gauge-foot {
  min-height: 16px;
}

.gauge-caption {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  opacity: 0.85;
}
</style>
