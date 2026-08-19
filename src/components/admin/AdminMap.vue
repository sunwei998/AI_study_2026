<template>
  <div class="admin-map">
    <div v-if="error" class="page-error">{{ error }}</div>
    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
    </div>
    <template v-else>
      <section class="map-card">
        <div class="map-card-head">
          <div class="map-head-left">
            <span class="map-pulse"></span>
            <h3 class="map-title">{{ $t('console.mapTitle') }}</h3>
          </div>
          <div class="map-stats">
            <span class="map-stat">
              <span class="map-stat-label">{{ $t('console.mapUsers') }}</span>
              <b>{{ totalUsers }}</b>
            </span>
            <span class="map-stat">
              <span class="map-stat-label">{{ $t('console.mapProvinces') }}</span>
              <b>{{ provinceCount }}</b>
            </span>
            <span class="map-stat">
              <span class="map-stat-label">{{ $t('console.mapCities') }}</span>
              <b>{{ cityCount }}</b>
            </span>
          </div>
        </div>
        <div class="map-frame">
          <span class="map-nebula map-nebula--a"></span>
          <span class="map-nebula map-nebula--b"></span>
          <span class="map-stars" :style="{ boxShadow: stars1 }"></span>
          <span class="map-stars map-stars--accent" :style="{ boxShadow: stars2 }"></span>
          <div class="map-box" ref="mapRef"></div>
          <span class="map-corner map-corner--tl"></span>
          <span class="map-corner map-corner--tr"></span>
          <span class="map-corner map-corner--bl"></span>
          <span class="map-corner map-corner--br"></span>
        </div>
      </section>

      <section class="region-card">
        <div class="map-head-left">
          <span class="map-pulse map-pulse--violet"></span>
          <h3 class="map-title">{{ $t('console.regionList') }}</h3>
        </div>
        <div v-if="regionList.length" class="region-list">
          <div
            v-for="r in regionList"
            :key="`${r.province}-${r.city}-${r.district}`"
            class="region-item"
          >
            <span class="region-dot" :style="{ background: dotColor(r.count) }"></span>
            <span class="region-name">{{ formatRegion(r) }}</span>
            <span class="region-count">{{ r.count }}</span>
          </div>
        </div>
        <div v-else class="region-empty">{{ $t('console.noRegion') }}</div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { EffectScatterChart, MapChart } from 'echarts/charts'
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'
import type { RegionStat, RegionTopUser } from '@/types/admin'
import { fetchRegionStats } from '@/services/adminService'
import { useChatStore } from '@/stores/chatStore'
import AppLoading from '@/components/common/AppLoading.vue'
import chinaGeo from '@/assets/maps/china.json'
import cityCoords from '@/assets/maps/city-coords.json'

echarts.use([
  MapChart,
  EffectScatterChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer
])

type CityCoords = Record<string, { lng: number; lat: number }>

const { t } = useI18n()
const chat = useChatStore()

const stats = ref<RegionStat[]>([])
const loading = ref(true)
const error = ref('')
const mapRef = ref<HTMLDivElement | null>(null)

let chart: echarts.ECharts | null = null

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function contrastFromPrimary(hex: string): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  h = (h + 150) % 360
  s = Math.max(s, 0.88)
  const l2 = 0.62
  const c = (1 - Math.abs(2 * l2 - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const mh = l2 - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c
    gp = x
  } else if (h < 120) {
    rp = x
    gp = c
  } else if (h < 180) {
    gp = c
    bp = x
  } else if (h < 240) {
    gp = x
    bp = c
  } else if (h < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }
  const to = (v: number) =>
    Math.round((v + mh) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(rp)}${to(gp)}${to(bp)}`
}

function mapPalette() {
  return {
    primary: cssVar('--color-primary', '#00e5ff'),
    accent: cssVar('--color-accent', '#7c5cff'),
    surface: cssVar('--color-surface', '#0e1430'),
    background: cssVar('--color-background', '#070a1a'),
    text: cssVar('--color-text', '#e6f1ff'),
    textSec: cssVar('--color-text-secondary', '#8fa3c8')
  }
}

function makeStars(count: number, maxX = 1100, maxY = 540): string {
  const shadows: string[] = []
  let seed = 123456789
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < count; i++) {
    shadows.push(`${(rnd() * maxX).toFixed(1)}px ${(rnd() * maxY).toFixed(1)}px 0 0`)
  }
  return shadows.join(', ')
}

const stars1 = makeStars(90)
const stars2 = makeStars(34)

const totalUsers = computed(() => stats.value.reduce((s, r) => s + r.count, 0))
const provinceCount = computed(
  () => new Set(stats.value.map((r) => r.province).filter(Boolean)).size
)
const cityCount = computed(
  () => new Set(stats.value.map((r) => r.city).filter(Boolean)).size
)

const regionList = computed(() =>
  [...stats.value].sort((a, b) => b.count - a.count || a.province.localeCompare(b.province))
)

function formatRegion(r: RegionStat): string {
  const parts = [r.province, r.city, r.district].filter(Boolean)
  return parts.join(' · ')
}

function dotColor(count: number): string {
  const colors = ['#2b6cb0', '#00e5ff', '#7c5cff', '#ffb74d', '#ff5b6a']
  return colors[Math.min(count - 1, colors.length - 1)] ?? colors[0]
}

function normalizeCity(city: string): string {
  if (!city) return ''
  return city
    .replace(/市$/, '')
    .replace(/地区$/, '')
    .replace(/自治州$/, '')
    .replace(/盟$/, '')
}

function registerChinaMap(): void {
  if (echarts.getMap('china')) return
  const provinceFeatures = {
    type: 'FeatureCollection' as const,
    features: (chinaGeo.features as {
      type: string
      properties: { level?: string }
      geometry: unknown
    }[]).filter(
      (f) => (f.properties.level ?? 'province') === 'province'
    )
  }
  echarts.registerMap('china', provinceFeatures as unknown as Parameters<typeof echarts.registerMap>[1])
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function buildTipHtml(
  pal: ReturnType<typeof mapPalette>,
  name: string,
  count: number,
  top: RegionTopUser[]
): string {
  const isZero = count === 0
  const rows = isZero
    ? ''
    : top.length
      ? top
          .map((u, i) => {
            const rank = i + 1
            return `<div class="tt-row">
            <span class="tt-rank tt-rank-${rank}">${rank}</span>
            <span class="tt-uname">${u.username}</span>
            <span class="tt-req">${u.requests}${t('console.tipReqs')}</span>
            <span class="tt-tok">${fmtTokens(u.total_tokens)}</span>
          </div>`
          })
          .join('')
      : `<div class="tt-empty">${t('console.tipEmpty')}</div>`

  const prim = pal.primary
  const acc = pal.accent
  const text = pal.text
  const sec = pal.textSec

  return `<style>
    .tt{min-width:252px;font-family:var(--font-mono)}
    .tt-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:11px 14px 9px;border-bottom:1px solid ${hexToRgba(prim, 0.28)};margin-bottom:8px}
    .tt-name{font-weight:700;color:${text};font-size:13px;letter-spacing:.04em}
    .tt-count{font-family:var(--font-mono);font-size:12px;color:${acc};text-shadow:0 0 8px ${hexToRgba(acc, 0.8)}}
    .tt-label{font-size:10px;letter-spacing:.18em;color:${sec};padding:0 14px 7px;text-transform:uppercase}
    .tt-row{display:flex;align-items:center;gap:8px;padding:7px 10px;margin:0 8px 6px;border-radius:9px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
    .tt-rank{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .tt-rank-1{background:linear-gradient(135deg,${prim},${acc});box-shadow:0 0 10px ${hexToRgba(prim, 0.65)}}
    .tt-rank-2{background:linear-gradient(135deg,#ffb74d,#ff8a65);box-shadow:0 0 8px rgba(255,183,77,.5)}
    .tt-rank-3{background:linear-gradient(135deg,#90a4ae,#607d8b)}
    .tt-uname{flex:1;color:${text};font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tt-req{color:${prim};font-size:12px;font-family:var(--font-mono);white-space:nowrap}
    .tt-tok{color:${sec};font-size:11px;font-family:var(--font-mono);white-space:nowrap}
    .tt-empty{padding:10px 14px;color:${sec};font-size:12px}
  </style>
  <div class="tt">
    <div class="tt-head">
      <span class="tt-name">${name}</span>
      ${isZero ? `<span class="tt-count">${t('console.tipNoUsers')}</span>` : `<span class="tt-count">${count} ${t('console.mapUsers')}</span>`}
    </div>
    ${isZero ? '' : `<div class="tt-label">${t('console.tipTop')}</div>`}
    ${rows}
  </div>`
}

function render(): void {
  if (!mapRef.value) return
  const pal = mapPalette()
  const contrast = contrastFromPrimary(pal.primary)

  registerChinaMap()

  const provinceInfo = new Map<string, { count: number; topUsers: RegionTopUser[] }>()
  const points: {
    name: string
    value: [number, number, number]
    topUsers: RegionTopUser[]
  }[] = []

  const provinceCentroid = new Map<string, [number, number]>()
  for (const f of chinaGeo.features as {
    properties: { name: string; centroid?: [number, number] }
  }[]) {
    if (f.properties.centroid) {
      provinceCentroid.set(f.properties.name, f.properties.centroid)
    }
  }
  const coords = cityCoords as unknown as CityCoords

  for (const r of stats.value) {
    if (r.province) {
      const cur = provinceInfo.get(r.province) ?? { count: 0, topUsers: [] as RegionTopUser[] }
      cur.count += r.count
      cur.topUsers.push(...r.top_users)
      provinceInfo.set(r.province, cur)
    }
    const name = [r.province, r.city, r.district].filter(Boolean).join(' ')
    let coord: [number, number] | undefined
    if (r.city) {
      const p = coords[normalizeCity(r.city)]
      if (p) coord = [p.lng, p.lat]
    }
    if (!coord && r.province) {
      coord = provinceCentroid.get(r.province)
    }
    if (coord) {
      points.push({ name, value: [coord[0], coord[1], r.count], topUsers: r.top_users })
    }
  }

  for (const info of provinceInfo.values()) {
    info.topUsers.sort((a, b) => b.requests - a.requests || b.total_tokens - a.total_tokens)
    info.topUsers = info.topUsers.slice(0, 3)
  }

  const maxCount = Math.max(1, ...[...provinceInfo.values()].map((v) => v.count))
  const heat = [...provinceInfo.entries()].map(([name, info]) => ({ name, value: info.count }))

  chart = echarts.init(mapRef.value)
  chart.setOption({
    tooltip: {
      trigger: 'item',
      enterable: true,
      confine: true,
      backgroundColor: 'rgba(7, 10, 24, 0.96)',
      borderColor: hexToRgba(pal.primary, 0.35),
      borderWidth: 1,
      padding: 0,
      extraCssText: `border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 24px ${hexToRgba(pal.primary, 0.18)};backdrop-filter:blur(8px);overflow:hidden;`,
      textStyle: { color: pal.text, fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as {
          seriesType: string
          name: string
          data?: { name?: string; value?: [number, number, number]; topUsers?: RegionTopUser[] }
        }
        let name = p.name
        let count = 0
        let top: RegionTopUser[] = []
        if (p.seriesType === 'map') {
          const info = provinceInfo.get(p.name)
          if (info) {
            count = info.count
            top = info.topUsers
          }
        } else {
          name = p.data?.name ?? p.name
          count = p.data?.value?.[2] ?? 1
          top = p.data?.topUsers ?? []
        }
        return buildTipHtml(pal, name, count, top)
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      left: 16,
      bottom: 20,
      text: [String(maxCount), '0'],
      textStyle: { color: pal.textSec, fontSize: 11, fontFamily: 'var(--font-mono)' },
      calculable: true,
      seriesIndex: 0,
      inRange: {
        color: [
          'rgba(6, 9, 20, 0.95)',
          hexToRgba(pal.primary, 0.28),
          hexToRgba(pal.primary, 0.62),
          pal.primary,
          pal.accent
        ]
      }
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.05,
      scaleLimit: { min: 0.8, max: 6 },
      label: { show: false, color: hexToRgba(pal.text, 0.7), fontSize: 10 },
      itemStyle: {
        areaColor: {
          type: 'radial',
          x: 0.5,
          y: 0.5,
          r: 0.9,
          colorStops: [
            { offset: 0, color: hexToRgba(pal.primary, 0.18) },
            { offset: 0.55, color: hexToRgba(pal.surface, 0.5) },
            { offset: 1, color: 'rgba(4, 6, 16, 0.95)' }
          ]
        },
        borderColor: pal.primary,
        borderWidth: 1.2,
        shadowColor: pal.primary,
        shadowBlur: 18,
        shadowOffsetY: 8,
        opacity: 0.92
      },
      emphasis: {
        itemStyle: { areaColor: hexToRgba(pal.primary, 0.3), shadowBlur: 26 },
        label: { show: true }
      },
      select: { itemStyle: { areaColor: hexToRgba(pal.primary, 0.42) } }
    },
    series: [
      {
        name: t('console.mapUsers'),
        type: 'map',
        geoIndex: 0,
        data: heat,
        zlevel: 1
      },
      {
        name: t('console.mapUsers'),
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        rippleEffect: { brushType: 'stroke', scale: 4.5, period: 3 },
        symbolSize: (val: [number, number, number]) => 8 + (val[2] ?? 1) * 6,
        label: {
          show: true,
          position: 'right',
          formatter: (p: { name: string; value: [number, number, number] }) => `${p.name}`,
          color: pal.text,
          fontSize: 10,
          textShadowColor: hexToRgba(pal.primary, 0.9),
          textShadowBlur: 6
        },
        itemStyle: {
          color: contrast,
          shadowColor: contrast,
          shadowBlur: 18,
          shadowOffsetY: 4
        },
        data: points.map((p) => ({ name: p.name, value: p.value, topUsers: p.topUsers }))
      }
    ]
  })
}

function onResize(): void {
  chart?.resize()
}

onMounted(async () => {
  try {
    stats.value = await fetchRegionStats()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
    await nextTick()
    render()
  }
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(
  () => chat.currentTheme,
  () => {
    if (loading.value || !mapRef.value) return
    chart?.dispose()
    chart = null
    render()
  }
)
</script>

<style scoped>
.admin-map {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-error {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 77, 94, 0.1);
  border: 1px solid rgba(255, 77, 94, 0.4);
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.map-card,
.region-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.map-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.map-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.map-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.map-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
  animation: pulse 2s ease-in-out infinite;
}

.map-pulse--violet {
  background: var(--color-accent);
  box-shadow: 0 0 10px var(--color-accent);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.72);
  }
}

.map-stats {
  display: flex;
  gap: 22px;
}

.map-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.map-stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.map-stat b {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--color-primary);
  text-shadow: 0 0 12px var(--color-glow);
}

.map-frame {
  position: relative;
  width: 100%;
  height: 540px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--color-glow) 35%, transparent),
    inset 0 0 30px color-mix(in srgb, var(--color-primary) 6%, transparent);
  background:
    radial-gradient(ellipse 55% 45% at 50% 36%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 65%),
    radial-gradient(ellipse 75% 55% at 50% 105%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 60%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-background) 62%, #04060f), color-mix(in srgb, var(--color-background) 88%, #020409));
}

.map-nebula {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  filter: blur(50px);
  pointer-events: none;
  opacity: 0.55;
}

.map-nebula--a {
  width: 58%;
  height: 52%;
  top: -12%;
  left: 18%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-primary) 22%, transparent),
    transparent 70%
  );
  animation: nebulaA 26s ease-in-out infinite alternate;
}

.map-nebula--b {
  width: 52%;
  height: 46%;
  bottom: -14%;
  right: 6%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-accent) 24%, transparent),
    transparent 70%
  );
  animation: nebulaB 32s ease-in-out infinite alternate;
}

@keyframes nebulaA {
  from {
    transform: translate3d(-4%, -3%, 0) scale(1);
  }
  to {
    transform: translate3d(5%, 4%, 0) scale(1.15);
  }
}

@keyframes nebulaB {
  from {
    transform: translate3d(4%, 3%, 0) scale(1.1);
  }
  to {
    transform: translate3d(-5%, -4%, 0) scale(1);
  }
}

.map-stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  z-index: 1;
  color: rgba(255, 255, 255, 0.9);
  pointer-events: none;
  animation: twinkle 5s ease-in-out infinite;
}

.map-stars--accent {
  color: color-mix(in srgb, var(--color-primary) 85%, #fff);
  animation-delay: 1.8s;
  animation-duration: 6.5s;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

.map-box {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
}

.map-box::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(color-mix(in srgb, var(--color-primary) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px;
  -webkit-mask-image: radial-gradient(ellipse at 50% 42%, #000 25%, transparent 72%);
  mask-image: radial-gradient(ellipse at 50% 42%, #000 25%, transparent 72%);
  pointer-events: none;
  animation: gridPulse 7s ease-in-out infinite;
}

@keyframes gridPulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.map-box::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.35;
  filter: blur(0.5px);
  pointer-events: none;
  animation: scanY 9s linear infinite;
}

@keyframes scanY {
  from {
    top: 0;
  }
  to {
    top: 100%;
  }
}

.map-box :deep(canvas) {
  position: relative;
  z-index: 2;
}

.map-corner {
  position: absolute;
  z-index: 3;
  width: 22px;
  height: 22px;
  pointer-events: none;
  opacity: 0.8;
}

.map-corner--tl {
  top: 8px;
  left: 8px;
  border-top: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-top-left-radius: 6px;
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.map-corner--tr {
  top: 8px;
  right: 8px;
  border-top: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-top-right-radius: 6px;
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.map-corner--bl {
  bottom: 8px;
  left: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-bottom-left-radius: 6px;
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.map-corner--br {
  bottom: 8px;
  right: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-bottom-right-radius: 6px;
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.region-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.region-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  border: 1px solid var(--color-border);
  transition: var(--transition-normal);
}

.region-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow);
}

.region-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  flex-shrink: 0;
}

.region-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text);
}

.region-count {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
}

.region-empty {
  margin-top: 12px;
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .map-frame {
    height: 380px;
  }

  .map-stats {
    gap: 14px;
  }
}
</style>