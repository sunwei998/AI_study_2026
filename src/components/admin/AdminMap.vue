<template>
  <div class="admin-map" :class="{ 'admin-map--fullscreen': fullscreen }">
    <div v-if="error" class="page-error">{{ error }}</div>
    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
    </div>
    <template v-else>
      <section class="map-card" :class="{ 'map-card--fullscreen': fullscreen }">
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
          <button
            v-if="currentProvince"
            class="map-back"
            :title="$t('console.mapBack')"
            @click="backToNational"
          >
            <AppIcon name="lucide:arrow-left" :size="15" />
            <span>{{ $t('console.mapBack') }}</span>
          </button>
          <div v-if="currentProvince" class="map-focus-chip map-focus-chip--city">
            {{ $t('console.mapCityTitle', { name: currentProvince }) }}
          </div>
          <div v-else-if="hotProvince && !forceFullView" class="map-focus-chip map-focus-chip--hot">
            {{ $t('console.mapHotProvince', { name: hotProvince }) }}
          </div>
          <div v-if="!currentProvince" class="map-period" :title="$t('console.mapPeriod')">
            <span
              class="map-period-track"
              :style="{ transform: `translateX(${periodIndex * 100}%)` }"
            ></span>
            <button
              v-for="p in HEAT_PERIODS"
              :key="p.key"
              :class="['map-period-btn', { active: period === p.key }]"
              @click="switchPeriod(p.key)"
            >
              {{ $t(p.labelKey) }}
            </button>
          </div>
          <div class="map-buttons">
            <button
              class="map-btn"
              :title="$t('console.mapFull')"
              @click="showFullMap"
            >
              <AppIcon name="lucide:globe" :size="14" />
            </button>
            <button
              class="map-btn"
              :title="$t(fullscreen ? 'console.mapExitFullscreen' : 'console.mapEnterFullscreen')"
              @click="toggleFullscreen"
            >
              <AppIcon
                :name="fullscreen ? 'lucide:shrink' : 'lucide:expand'"
                :size="14"
              />
            </button>
          </div>
          <div v-if="cityLoading" class="map-loading-overlay">
            <AppLoading :size="22" glow />
          </div>
          <span class="map-corner map-corner--tl"></span>
          <span class="map-corner map-corner--tr"></span>
          <span class="map-corner map-corner--bl"></span>
          <span class="map-corner map-corner--br"></span>
        </div>
        <p v-if="cityError" class="page-error">{{ cityError }}</p>
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
import type { HeatPeriod, ProvinceMetric, RegionStat, RegionTopUser } from '@/types/admin'
import { fetchRegionStats } from '@/services/adminService'
import { HEAT_PERIODS, computeProvinceHeat } from '@/utils/provinceHeat'
import { avatarSrc, roundAvatarDataUrl } from '@/utils/avatar'
import { useChatStore } from '@/stores/chatStore'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
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

interface GeoFeature {
  type: string
  properties: {
    name: string
    level?: string
    adcode?: number
    centroid?: [number, number]
    center?: [number, number]
  }
  geometry: { type: string; coordinates: unknown }
}

interface GeoJson {
  type: string
  features: GeoFeature[]
}

type BBox = [[number, number], [number, number]]

const { t } = useI18n()
const chat = useChatStore()

const regions = ref<RegionStat[]>([])
const provinces = ref<ProvinceMetric[]>([])
const loading = ref(true)
const error = ref('')
const mapRef = ref<HTMLDivElement | null>(null)

const period = ref<HeatPeriod>('month')
const periodIndex = computed(() => Math.max(0, HEAT_PERIODS.findIndex((p) => p.key === period.value)))
const heatMap = computed(() => computeProvinceHeat(provinces.value))
const fullscreen = ref(false)

const provinceFeatures = (chinaGeo.features as unknown as GeoFeature[]).filter(
  (f) => (f.properties.level ?? 'province') === 'province'
)
const provinceCentroid = new Map<string, [number, number]>()
const provinceByAdcode = new Map<number, GeoFeature>()
for (const f of provinceFeatures) {
  if (f.properties.centroid) provinceCentroid.set(f.properties.name, f.properties.centroid)
  if (f.properties.adcode) provinceByAdcode.set(f.properties.adcode, f)
}

const MUNICIPALITIES = new Set(['北京市', '天津市', '上海市', '重庆市'])

const currentProvince = ref<string | null>(null)
const cityLoading = ref(false)
const cityError = ref('')
const cityGeoCache = new Map<number, GeoJson>()
const bboxCache = new Map<string, BBox>()
const nationalView = ref<{ center?: [number, number]; zoom?: number }>({})
const provinceView = ref<{ center?: [number, number]; zoom?: number }>({})
const forceFullView = ref(false)

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

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const mh = l - c / 2
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

function hueOf(hex: string): number {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return h * 60
}

function contrastFromPrimary(hex: string): string {
  const h = hueOf(hex)
  const COOL_START = 130
  const COOL_END = 310
  if (h >= COOL_START && h <= COOL_END) {
    return hslToHex(8, 0.92, 0.62)
  }
  return hslToHex((h + 150) % 360, Math.max(0.88, 0.75), 0.62)
}

function computeBBox(features: GeoFeature[]): BBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const walk = (coords: unknown): void => {
    if (typeof coords === 'number') return
    const arr = coords as unknown[]
    if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      const x = arr[0] as number
      const y = arr[1] as number
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      return
    }
    for (const c of arr) walk(c)
  }
  for (const f of features) walk(f.geometry.coordinates)
  return [
    [minX, minY],
    [maxX, maxY]
  ]
}

function provinceBBox(name: string): BBox | null {
  if (bboxCache.has(name)) return bboxCache.get(name)!
  const feat = provinceFeatures.find((f) => f.properties.name === name)
  if (!feat) return null
  const box = computeBBox([feat])
  bboxCache.set(name, box)
  return box
}

function registerMap(name: string, features: GeoFeature[]): void {
  if (echarts.getMap(name)) return
  echarts.registerMap(name, { type: 'FeatureCollection', features } as unknown as Parameters<typeof echarts.registerMap>[1])
}

function normalizeCity(city: string): string {
  if (!city) return ''
  return city
    .replace(/市$/, '')
    .replace(/地区$/, '')
    .replace(/自治州$/, '')
    .replace(/盟$/, '')
}

async function loadCityGeo(adcode: number): Promise<GeoJson | null> {
  if (cityGeoCache.has(adcode)) return cityGeoCache.get(adcode)!
  cityLoading.value = true
  cityError.value = ''
  try {
    const res = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`)
    if (!res.ok) throw new Error('fetch failed')
    const gj = (await res.json()) as GeoJson
    cityGeoCache.set(adcode, gj)
    return gj
  } catch {
    cityError.value = t('console.mapCityLoadFailed')
    return null
  } finally {
    cityLoading.value = false
  }
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

const totalUsers = computed(() => regions.value.reduce((s, r) => s + r.count, 0))
const provinceCount = computed(
  () => new Set(regions.value.map((r) => r.province).filter(Boolean)).size
)
const cityCount = computed(
  () => new Set(regions.value.map((r) => r.city).filter(Boolean)).size
)

const regionList = computed(() =>
  [...regions.value].sort((a, b) => b.count - a.count || a.province.localeCompare(b.province))
)

function formatRegion(r: RegionStat): string {
  const parts = [r.province, r.city, r.district].filter(Boolean)
  return parts.join(' · ')
}

function dotColor(count: number): string {
  const colors = ['#2b6cb0', '#00e5ff', '#7c5cff', '#ffb74d', '#ff5b6a']
  return colors[Math.min(count - 1, colors.length - 1)] ?? colors[0]
}

function registerChinaMap(): void {
  registerMap('china', provinceFeatures)
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
            <img class="tt-avatar" src="${avatarSrc(u.avatar)}" alt="" />
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
    .tt-avatar{width:22px;height:22px;border-radius:50%;flex-shrink:0;object-fit:cover;border:1px solid ${hexToRgba(prim, 0.35)}}
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

function buildUserTipHtml(
  pal: ReturnType<typeof mapPalette>,
  m: UserMarker
): string {
  const prim = pal.primary
  const acc = pal.accent
  const text = pal.text
  const sec = pal.textSec
  return `<style>
    .tt{min-width:220px;font-family:var(--font-mono)}
    .tt-head{display:flex;align-items:center;gap:10px;padding:11px 14px 9px;border-bottom:1px solid ${hexToRgba(prim, 0.28)};margin-bottom:8px}
    .tt-uavatar{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid ${hexToRgba(prim, 0.45)}}
    .tt-uname{font-weight:700;color:${text};font-size:13px;letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tt-urank{font-size:11px;color:${acc};text-shadow:0 0 8px ${hexToRgba(acc, 0.8)}}
    .tt-ubody{display:flex;align-items:center;gap:8px;padding:7px 10px;margin:0 8px 6px;border-radius:9px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
    .tt-req{color:${prim};font-size:12px;white-space:nowrap}
    .tt-tok{color:${sec};font-size:11px;white-space:nowrap}
  </style>
  <div class="tt">
    <div class="tt-head">
      <img class="tt-uavatar" src="${avatarSrc(m.avatar)}" alt="" />
      <div style="min-width:0">
        <div class="tt-uname">${m.username}</div>
        <div class="tt-urank">${t('console.tipRank')} #${m.rank}</div>
      </div>
    </div>
    <div class="tt-ubody">
      <span class="tt-req">${m.user.requests}${t('console.tipReqs')}</span>
      <span class="tt-tok">${fmtTokens(m.user.total_tokens)}</span>
    </div>
  </div>`
}

const MARKER_OFFSETS: [number, number][] = [
  [0, 0],
  [0.16, 0],
  [-0.16, 0],
  [0, 0.16],
  [0, -0.16],
  [0.16, 0.16],
  [-0.16, 0.16],
  [0.16, -0.16],
  [-0.16, -0.16],
  [0, 0.28]
]

function spreadCoords(items: { value: [number, number, number] }[]): void {
  const byKey = new Map<string, { value: [number, number, number] }[]>()
  for (const it of items) {
    const key = `${it.value[0].toFixed(3)}:${it.value[1].toFixed(3)}`
    const list = byKey.get(key) ?? []
    list.push(it)
    byKey.set(key, list)
  }
  for (const list of byKey.values()) {
    list.forEach((it, i) => {
      const off = MARKER_OFFSETS[i % MARKER_OFFSETS.length]
      it.value = [it.value[0] + off[0], it.value[1] + off[1], it.value[2]]
    })
  }
}

const hotProvince = computed(() => {
  let best = ''
  let max = 0
  for (const [name, heat] of heatMap.value) {
    if (heat > max) {
      max = heat
      best = name
    }
  }
  return best || ''
})

interface MapPoint {
  name: string
  value: [number, number, number]
  topUsers: RegionTopUser[]
  province: string
  labelTier: 0 | 1 | 2
  labelUser: string
  labelAvatarUrl: string
  label?: Record<string, unknown>
}

function pointLabelOption(
  pal: ReturnType<typeof mapPalette>,
  p: MapPoint,
  drill: boolean
): Record<string, unknown> {
  if (p.labelTier === 0) return { show: false }
  const base = {
    show: true,
    position: 'right' as const,
    fontSize: 10,
    textShadowColor: hexToRgba(pal.primary, 0.9),
    textShadowBlur: 6
  }
  return {
    ...base,
    color: drill && p.labelTier === 2 ? pal.textSec : pal.text,
    formatter: p.labelUser
  }
}

interface UserMarker {
  username: string
  value: [number, number, number]
  avatar: string
  rank: number
  province: string
  labelTier: 0 | 1 | 2
  user: RegionTopUser
}

function buildUserLabelOption(
  pal: ReturnType<typeof mapPalette>,
  m: UserMarker
): Record<string, unknown> {
  const base = {
    show: true,
    position: 'right' as const,
    fontSize: 10,
    textShadowColor: hexToRgba(pal.primary, 0.9),
    textShadowBlur: 6
  }
  if (m.labelTier === 1) {
    return {
      ...base,
      formatter: `{a|}${m.username}`,
      rich: {
        a: {
          backgroundColor: { image: avatarSrc(m.avatar) },
          width: 16,
          height: 16,
          borderRadius: 8,
          align: 'center',
          padding: [0, 5, 0, 0]
        }
      }
    }
  }
  return { ...base, color: pal.text, formatter: m.username }
}

function buildMapOption(
  pal: ReturnType<typeof mapPalette>,
  contrast: string,
  mapName: string,
  lookup: (name: string) => { count: number; topUsers: RegionTopUser[] },
  maxCount: number,
  heat: { name: string; value: number }[],
  points: MapPoint[],
  userPoints: UserMarker[],
  geoView: { center?: [number, number]; zoom?: number } | { boundingCoords?: BBox }
): echarts.EChartsCoreOption {
  return {
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
          seriesName: string
          name: string
          data?: {
            name?: string
            value?: [number, number, number]
            topUsers?: RegionTopUser[]
            rank?: number
            avatar?: string
            user?: RegionTopUser
          }
        }
        if (p.seriesName === 'top-user' && p.data?.user) {
          return buildUserTipHtml(pal, p.data as unknown as UserMarker)
        }
        let name = p.name
        let count = 0
        let top: RegionTopUser[] = []
        if (p.seriesType === 'map') {
          const info = lookup(p.name)
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
      map: mapName,
      roam: true,
      scaleLimit: { min: 0.02, max: 8 },
      label: { show: false, color: hexToRgba(pal.text, 0.7), fontSize: 10 },
      ...geoView,
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
        symbolSize: 10,
        label: {
          show: false,
          position: 'right',
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
        data: points.map((p) => ({
          name: p.name,
          value: p.value,
          topUsers: p.topUsers,
          province: p.province,
          label: p.label ?? { show: false }
        }))
      },
      {
        name: 'top-user',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: { brushType: 'stroke', scale: 2.5, period: 3 },
        symbolSize: 10,
        label: {
          show: true,
          position: 'right',
          color: pal.text,
          fontSize: 10,
          textShadowColor: hexToRgba(pal.primary, 0.9),
          textShadowBlur: 6
        },
        itemStyle: {
          color: '#ffffff',
          borderColor: contrast,
          borderWidth: 2,
          shadowColor: contrast,
          shadowBlur: 14,
          shadowOffsetY: 3
        },
        data: userPoints.map((m) => ({
          name: m.username,
          username: m.username,
          value: m.value,
          rank: m.rank,
          avatar: m.avatar,
          province: m.province,
          user: m.user,
          label: buildUserLabelOption(pal, m)
        }))
      }
    ]
  }
}

function sortTop(list: RegionTopUser[]): RegionTopUser[] {
  return [...list]
    .sort((a, b) => b.requests - a.requests || b.total_tokens - a.total_tokens)
    .slice(0, 10)
}

function buildProvinceRank(regions: RegionStat[]): Map<string, RegionTopUser[]> {
  const byProvince = new Map<string, RegionTopUser[]>()
  for (const r of regions) {
    if (!r.province) continue
    const list = byProvince.get(r.province) ?? []
    list.push(...r.top_users)
    byProvince.set(r.province, list)
  }
  for (const list of byProvince.values()) {
    list.sort((a, b) => b.requests - a.requests || b.total_tokens - a.total_tokens)
  }
  return byProvince
}

function makePointLabel(
  best: RegionTopUser | undefined,
  rank: number
): { labelTier: 0 | 1 | 2; labelUser: string; labelAvatarUrl: string } {
  if (!best || rank <= 0) return { labelTier: 0, labelUser: '', labelAvatarUrl: '' }
  const labelTier: 0 | 1 | 2 = rank <= 3 ? 1 : rank <= 10 ? 2 : 0
  return {
    labelTier,
    labelUser: best.username,
    labelAvatarUrl: avatarSrc(best.avatar)
  }
}

async function render(): Promise<void> {
  if (!mapRef.value) return
  const pal = mapPalette()
  const contrast = contrastFromPrimary(pal.primary)
  chart?.dispose()
  chart = null

  if (currentProvince.value) {
    const provFeature = provinceFeatures.find((f) => f.properties.name === currentProvince.value)
    const adcode = provFeature?.properties.adcode
    if (!provFeature || !adcode) {
      currentProvince.value = null
      return render()
    }
    const gj = await loadCityGeo(adcode)
    if (!gj) {
      currentProvince.value = null
      return render()
    }
    const cityName = `prov_${adcode}`
    registerMap(cityName, gj.features)
    const isMuni = MUNICIPALITIES.has(currentProvince.value)
    const regionInfo = new Map<string, { count: number; topUsers: RegionTopUser[] }>()
    const regionRows: RegionStat[] = []
    for (const r of regions.value) {
      if (r.province !== currentProvince.value) continue
      const key = isMuni ? r.district || r.city : r.city || r.province
      if (!key) continue
      const cur = regionInfo.get(key) ?? { count: 0, topUsers: [] as RegionTopUser[] }
      cur.count += r.count
      cur.topUsers.push(...r.top_users)
      regionInfo.set(key, cur)
      regionRows.push(r)
    }
    for (const info of regionInfo.values()) info.topUsers = sortTop(info.topUsers)
    const cityRank = new Map<string, number>()
    const cityTopUser = new Map<string, string>()
    ;[...regionInfo.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([name], i) => {
        cityRank.set(name, i + 1)
        cityTopUser.set(name, regionInfo.get(name)?.topUsers[0]?.username ?? '')
      })
    const points: MapPoint[] = []
    for (const r of regionRows) {
      const key = isMuni ? r.district || r.city : r.city || r.province
      const feat = gj.features.find((f) => f.properties.name === key)
      let coord: [number, number] | undefined
      if (feat?.properties.centroid) coord = feat.properties.centroid
      else if (feat?.properties.center) coord = feat.properties.center
      if (!coord && !isMuni) {
        const p = (cityCoords as unknown as CityCoords)[normalizeCity(r.city)]
        if (p) coord = [p.lng, p.lat]
      }
      if (!coord) coord = provinceCentroid.get(r.province)
      if (coord) {
        const rank = cityRank.get(key) ?? 0
        const best = regionInfo.get(key)?.topUsers[0]
        const pt: MapPoint = {
          name: [r.province, r.city, r.district].filter(Boolean).join(' '),
          value: [coord[0], coord[1], r.count],
          topUsers: r.top_users,
          province: r.province,
          ...makePointLabel(best, rank)
        }
        pt.label = pointLabelOption(pal, pt, true)
        points.push(pt)
      }
    }
    const maxCount = Math.max(1, ...[...regionInfo.values()].map((v) => v.count))
    const heat = [...regionInfo.entries()].map(([name, info]) => ({ name, value: info.count }))
    const geoView = provinceView.value.center
      ? { center: provinceView.value.center, zoom: provinceView.value.zoom }
      : { boundingCoords: computeBBox(gj.features) }
    chart = echarts.init(mapRef.value)
    chart.setOption(
      buildMapOption(pal, contrast, cityName, (n) => regionInfo.get(n) ?? { count: 0, topUsers: [] }, maxCount, heat, points, [], geoView)
    )
    bindEvents()
    return
  }

  registerChinaMap()
  const provinceInfo = new Map<string, { count: number; topUsers: RegionTopUser[] }>()
  const provRanks = buildProvinceRank(regions.value)
  const userCoord = new Map<string, [number, number]>()
  const points: MapPoint[] = []
  const coords = cityCoords as unknown as CityCoords

  for (const r of regions.value) {
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
      for (const u of r.top_users) userCoord.set(u.username, [coord[0], coord[1]])
      points.push({
        name,
        value: [coord[0], coord[1], r.count],
        topUsers: r.top_users,
        province: r.province,
        labelTier: 0,
        labelUser: '',
        labelAvatarUrl: '',
        label: { show: false }
      })
    }
  }

  for (const info of provinceInfo.values()) info.topUsers = sortTop(info.topUsers)

  const userMarkers: UserMarker[] = []
  for (const [province, list] of provRanks) {
    const markers: UserMarker[] = []
    list.slice(0, 10).forEach((u, i) => {
      const coord = userCoord.get(u.username) ?? provinceCentroid.get(province)
      if (!coord) return
      markers.push({
        username: u.username,
        value: [coord[0], coord[1], u.requests],
        avatar: u.avatar,
        rank: i + 1,
        province,
        labelTier: i < 3 ? 1 : 2,
        user: u
      })
    })
    spreadCoords(markers)
    userMarkers.push(...markers)
  }

  const heat = provinces.value.map((p) => ({
    name: p.province,
    value: heatMap.value.get(p.province) ?? 0
  }))

  for (const m of userMarkers) {
    if (m.labelTier === 1) {
      m.avatar = await roundAvatarDataUrl(avatarSrc(m.avatar), 32)
    }
  }

  const geoView = nationalView.value.center
    ? { center: nationalView.value.center, zoom: nationalView.value.zoom }
    : forceFullView.value
      ? { boundingCoords: computeBBox(provinceFeatures) }
      : hotProvince.value
        ? { boundingCoords: provinceBBox(hotProvince.value) ?? undefined }
        : {}

  chart = echarts.init(mapRef.value)
  chart.setOption(
    buildMapOption(pal, contrast, 'china', (n) => provinceInfo.get(n) ?? { count: 0, topUsers: [] }, 100, heat, points, userMarkers, geoView)
  )
  bindEvents()
}

function bindEvents(): void {
  chart?.off('click')
  chart?.off('georoam')
  chart?.on('click', (params: unknown) => {
    if (currentProvince.value || cityLoading.value) return
    const p = params as { seriesType?: string; name?: string; data?: { province?: string } }
    let provName = ''
    if (p.seriesType === 'map') provName = p.name ?? ''
    else if (p.seriesType === 'effectScatter') provName = p.data?.province ?? ''
    if (!provName) return
    const feat = provinceFeatures.find((f) => f.properties.name === provName)
    if (!feat) return
    drillTo(provName)
  })
  chart?.on('georoam', (params: unknown) => {
    const p = params as { center?: [number, number]; zoom?: number }
    if (!p.center || p.zoom == null) return
    if (currentProvince.value) provinceView.value = { center: p.center, zoom: p.zoom }
    else {
      nationalView.value = { center: p.center, zoom: p.zoom }
      forceFullView.value = false
    }
  })
}

async function showFullMap(): Promise<void> {
  if (currentProvince.value) currentProvince.value = null
  provinceView.value = {}
  nationalView.value = {}
  forceFullView.value = true
  await render()
}

async function drillTo(name: string): Promise<void> {
  currentProvince.value = name
  provinceView.value = {}
  await render()
}

async function backToNational(): Promise<void> {
  currentProvince.value = null
  await render()
}

async function loadStats(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchRegionStats(period.value)
    regions.value = data.regions
    provinces.value = data.provinces
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
    await nextTick()
    await render()
  }
}

async function switchPeriod(p: HeatPeriod): Promise<void> {
  if (p === period.value) return
  period.value = p
  currentProvince.value = null
  nationalView.value = {}
  provinceView.value = {}
  forceFullView.value = false
  await loadStats()
}

function toggleFullscreen(): void {
  fullscreen.value = !fullscreen.value
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && fullscreen.value) {
    fullscreen.value = false
  }
}

function onResize(): void {
  chart?.resize()
}

watch(fullscreen, async () => {
  await nextTick()
  chart?.resize()
  render()
})

onMounted(async () => {
  await loadStats()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeydown)
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

.map-back {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: var(--transition-fast);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.map-back:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow);
  transform: translateX(-2px);
}

.map-reset,
.map-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition-fast);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.map-reset:hover,
.map-btn:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow);
}

.map-buttons {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 5;
  display: flex;
  gap: 8px;
}

.map-focus-chip {
  position: absolute;
  top: 14px;
  z-index: 5;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  box-shadow: 0 0 12px var(--color-glow);
  pointer-events: none;
}

.map-focus-chip--hot {
  left: 14px;
}

.map-focus-chip--city {
  right: 14px;
}

.map-period {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 6;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 0 14px var(--color-glow);
}

.map-period-track {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 4);
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 12px var(--color-glow), inset 0 0 8px rgba(255, 255, 255, 0.25);
  transition: transform 0.38s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.map-period-btn {
  position: relative;
  z-index: 1;
  min-width: 52px;
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.map-period-btn:hover {
  color: var(--color-text);
}

.map-period-btn.active {
  color: #fff;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
}

.map-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 6, 16, 0.4);
  backdrop-filter: blur(2px);
  border-radius: inherit;
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

/* 全屏展示 */
.admin-map--fullscreen {
  gap: 0;
}

.map-card--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-radius: 0;
  border: none;
  background: var(--color-background);
  padding: 16px;
  animation: mapFullIn 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.admin-map--fullscreen .region-card {
  display: none;
}

.map-card--fullscreen .map-frame {
  flex: 1;
  height: auto;
  min-height: 0;
}

@keyframes mapFullIn {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .map-card--fullscreen {
    padding: 10px;
  }

  .map-period-btn {
    min-width: 44px;
    padding: 0 8px;
  }
}
</style>