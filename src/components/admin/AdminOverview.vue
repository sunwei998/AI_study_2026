<template>
  <div class="admin-overview" ref="rootRef">
    <div v-if="error" class="ov-error">{{ error }}</div>
    <div v-if="loading" class="ov-loading">
      <AppLoading :size="28" glow />
    </div>

    <template v-else-if="overview">
      <div class="ov-cards">
        <div v-for="(card, i) in cards" :key="card.key" class="ov-card">
          <div class="ov-card-head">
            <AppIcon :name="card.icon" :size="18" glow />
            <span class="ov-card-label">{{ card.label }}</span>
          </div>
          <div class="ov-card-value">{{ card.value }}</div>
          <div class="ov-card-spark" :ref="(el: any) => setSparkRef(el, i)"></div>
        </div>
      </div>

      <div class="ov-grid ov-grid--2">
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:trending-up" :size="16" />
            {{ $t('console.ovDailyTrend') }}
          </h3>
          <div ref="trendRef" class="ov-chart ov-chart--lg"></div>
        </section>
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:clock" :size="16" />
            {{ $t('console.ovHourly') }}
          </h3>
          <div ref="hourRef" class="ov-chart"></div>
        </section>
      </div>

      <div class="ov-grid ov-grid--3">
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:server" :size="16" />
            {{ $t('console.ovTopModels') }}
          </h3>
          <div ref="modelRef" class="ov-chart ov-chart--h"></div>
        </section>
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:pie-chart" :size="16" />
            {{ $t('console.byAge') }}
          </h3>
          <div ref="ageRef" class="ov-chart ov-chart--donut"></div>
        </section>
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:map-pin" :size="16" />
            {{ $t('console.ovTopProvinces') }}
          </h3>
          <div ref="provRef" class="ov-chart ov-chart--h"></div>
        </section>
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:trophy" :size="16" />
            {{ $t('console.ovTopUsers') }}
          </h3>
          <ul class="ov-list">
            <li v-for="(u, i) in overview.top_users" :key="u.username" class="ov-list-item">
              <span class="ov-rank" :class="`ov-rank--${i + 1}`">{{ i + 1 }}</span>
              <img class="ov-avatar" :src="avatarSrc(u.avatar)" alt="" />
              <span class="ov-name">{{ u.username }}</span>
              <span class="ov-sub">{{ [u.province, u.city].filter(Boolean).join(' ') || '-' }}</span>
              <span class="ov-num">{{ fmtTokens(u.total) }}</span>
            </li>
            <li v-if="overview.top_users.length === 0" class="ov-empty">{{ $t('console.tipNoUsers') }}</li>
          </ul>
        </section>

        <section class="ov-panel ov-wordcloud-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:cloud" :size="16" />
            {{ $t('console.ovHotWords') }}
            <div class="ov-seg ov-seg--inline" style="--seg-count: 3">
              <span class="ov-seg-track" :style="{ transform: `translateX(${wcPeriodIndex * 100}%)` }"></span>
              <button
                v-for="p in WC_PERIODS"
                :key="p.key"
                type="button"
                class="ov-seg-btn"
                :class="{ active: wcPeriod === p.key }"
                @click="switchWcPeriod(p.key)"
              >{{ t(p.labelKey) }}</button>
            </div>
          </h3>

          <div class="ov-wordcloud-wrap">
            <div v-if="wcLoading" class="ov-wc-loading">
              <AppLoading :size="22" glow />
            </div>
            <div v-else-if="hotWords.length === 0" class="ov-empty">{{ $t('console.ovHotWordsEmpty') }}</div>
            <div v-else class="ov-wordcloud-stage">
              <div v-if="wcBusy" class="ov-wc-busy"><AppLoading :size="18" glow /></div>
              <div ref="wcBoxRef" class="ov-wordcloud">
                <span
                  v-for="w in placedWords"
                  :key="w.text"
                  class="ov-wc-word"
                  :style="{ left: w.x + 'px', top: w.y + 'px', fontSize: w.size + 'px', color: w.color }"
                  :title="`${w.text} · ${w.value}`"
                >{{ w.text }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, LegendScrollComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { AdminOverview, HeatPeriod, HotWordItem } from '@/types/admin'
import { fetchOverview, fetchHotWords } from '@/services/adminService'
import { HEAT_PERIODS } from '@/utils/provinceHeat'
import { useChatStore } from '@/stores/chatStore'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { avatarSrc } from '@/utils/avatar'
import { createDebounced, createRafCoalescer } from '@/utils/resize'
import cloud from 'd3-cloud'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, LegendScrollComponent, CanvasRenderer])

const { t, locale } = useI18n()
const chatStore = useChatStore()

const overview = ref<AdminOverview | null>(null)
const loading = ref(true)
const error = ref('')
const hotWords = ref<HotWordItem[]>([])
const wcLoading = ref(true)
const wcBusy = ref(false)
const wcBoxRef = ref<HTMLDivElement | null>(null)
const rootRef = ref<HTMLDivElement | null>(null)
const placedWords = ref<{ text: string; value: number; x: number; y: number; size: number; color: string }[]>([])

// 高频词云面板的「统计周期」控制（借鉴热点页面，科技液态玻璃风），条数固定取 Top 50
// 概览词云仅提供 日/周/月，去掉「年」选项（不影响热点地图页面的完整周期）
const WC_PERIODS = HEAT_PERIODS.filter((p) => p.key !== 'year')
const wcPeriod = ref<HeatPeriod>('month')
let wcFirstLoad = true

// 滑动指示条索引（同热点地图右上角周期组件）
const wcPeriodIndex = computed(() => Math.max(0, WC_PERIODS.findIndex((p) => p.key === wcPeriod.value)))

const trendRef = ref<HTMLDivElement | null>(null)
const hourRef = ref<HTMLDivElement | null>(null)
const modelRef = ref<HTMLDivElement | null>(null)
const ageRef = ref<HTMLDivElement | null>(null)
const provRef = ref<HTMLDivElement | null>(null)

let charts: echarts.ECharts[] = []
const sparkRefs: (HTMLDivElement | null)[] = []
const setSparkRef = (el: HTMLDivElement | null, i: number) => {
  sparkRefs[i] = el
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function axisColors() {
  return {
    text: cssVar('--color-text-secondary', '#8fa3c8'),
    line: cssVar('--color-border', '#233055'),
    primary: cssVar('--color-primary', '#00e5ff'),
    accent: cssVar('--color-accent', '#7c5cff')
  }
}

// 与用户用量页 formatTokens 统一：千=K、万=W、百万=M、亿(>=1e8)兜底
function fmtTokens(n: number | string): string {
  const v = Number(n)
  if (!isFinite(v)) return String(n)
  if (v >= 1e8) return (v / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1e4) return (v / 1e4).toFixed(1).replace(/\.0$/, '') + 'W'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(v)
}

// 高频词词云：刻意避开品牌主色（青 #00e5ff / 紫 #7c5cff），选用更柔和、明亮但不刺眼的
// 色调，在深色玻璃面板上既醒目又不会与主题强调色“撞色”。
const WORD_COLORS: string[] = [
  '#5eead4', // teal
  '#93c5fd', // blue
  '#fde68a', // amber
  '#fca5a5', // rose
  '#a7f3d0', // emerald
  '#f9a8d4', // pink
  '#7dd3fc', // sky
  '#fdba74', // orange
  '#bef264'  // lime
]

// 字号按词频平方根映射，避免头部几个词过大而长尾过小，区间 14px~54px。
function cloudSize(count: number): number {
  const list = hotWords.value
  if (list.length === 0) return 16
  const counts = list.map((w) => w.count)
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  if (max === min) return 30
  const t = (Math.sqrt(count) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min))
  return 14 + t * 40
}

// 径向词云：d3-cloud 按传入顺序从中心螺旋向外排布，且大词优先——
// 因此把词按词频降序传入，最大的词自然落在最中心，越往外越小。
interface CloudWord {
  text: string
  value: number
  size: number
  color: string
  x?: number
  y?: number
  rotate?: number
}

let wcToken = 0
let wcObserver: ResizeObserver | null = null
let pageObserver: ResizeObserver | null = null

function renderCloud(): void {
  const box = wcBoxRef.value
  if (!box) return
  const width = box.clientWidth
  const height = box.clientHeight
  if (width <= 0 || height <= 0) return
  const list = hotWords.value
  if (list.length === 0) {
    placedWords.value = []
    return
  }
  const myToken = ++wcToken
  const data: CloudWord[] = list
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((w, i) => ({
      text: w.word,
      value: w.count,
      size: cloudSize(w.count),
      color: WORD_COLORS[i % WORD_COLORS.length]
    }))
  cloud()
    .size([width, height])
    .words(data as any)
    .padding(3)
    .rotate(() => 0)
    .font(getComputedStyle(box).fontFamily)
    .fontWeight(600)
    .fontSize((d: any) => (d as unknown as CloudWord).size)
    .on('end', (placed: any) => {
      if (myToken !== wcToken) return // 丢弃过期布局，避免闪烁
      placedWords.value = (placed as unknown as CloudWord[]).map((d) => ({
        text: d.text,
        value: d.value,
        size: d.size,
        color: d.color,
        x: width / 2 + (d.x ?? 0),
        y: height / 2 + (d.y ?? 0)
      }))
    })
    .start()
}

function setupCloudObserver(): void {
  const box = wcBoxRef.value
  if (!box || typeof ResizeObserver === 'undefined') return
  // 词云容器可能在「无数据 / 有数据」间切换而被卸载重建，先断开旧观察器再挂新的
  if (wcObserver) {
    wcObserver.disconnect()
    wcObserver = null
  }
  wcObserver = new ResizeObserver(() => scheduleCloud())
  wcObserver.observe(box)
}

// 拉取高频词：首次加载走 loading，之后切换周期只显示轻量遮罩，避免容器卸载导致观察器失效
function loadHotWords(): void {
  if (wcFirstLoad) wcLoading.value = true
  else wcBusy.value = true
  fetchHotWords(wcPeriod.value, 50)
    .then((list) => { hotWords.value = list })
    .catch(() => { /* 静默：词云为空时显示占位文案 */ })
    .finally(async () => {
      wcLoading.value = false
      wcBusy.value = false
      wcFirstLoad = false
      placedWords.value = [] // 切换时先清掉旧布局，避免闪烁
      await nextTick() // 等词云容器挂载后再布局
      setupCloudObserver()
      renderCloud()
    })
}

function switchWcPeriod(p: HeatPeriod): void {
  if (p === wcPeriod.value) return
  wcPeriod.value = p
  loadHotWords()
}

function dayToLabel(day: number): string {
  const d = new Date(day * 86400000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const cards = computed(() => {
  if (!overview.value) return []
  const s = overview.value.stats
  return [
    { key: 'users', icon: 'lucide:users', label: t('console.statUsers'), value: String(s.users) },
    { key: 'activeToday', icon: 'lucide:activity', label: t('console.statActiveToday'), value: String(s.active_today) },
    { key: 'active7d', icon: 'lucide:flame', label: t('console.statActive7d'), value: String(s.active_7d) },
    { key: 'requests', icon: 'lucide:send', label: t('console.statRequests'), value: String(s.requests) },
    { key: 'todayTokens', icon: 'lucide:zap', label: t('console.statTodayTokens'), value: fmtTokens(s.today_tokens) },
    { key: 'totalTokens', icon: 'lucide:database', label: t('console.statTotalTokens'), value: fmtTokens(s.total_tokens) }
  ]
})

function pieColors(): string[] {
  return [
    cssVar('--color-primary', '#00e5ff'),
    cssVar('--color-accent', '#7c5cff'),
    '#ffb74d',
    '#ff5b6a',
    '#34d399',
    '#60a5fa',
    '#e879f9',
    '#94a3b8'
  ]
}

const ageBuckets: Record<string, string> = {
  '0-17': 'age0_17',
  '18-24': 'age18_24',
  '25-34': 'age25_34',
  '35-44': 'age35_44',
  '45-54': 'age45_54',
  '55-64': 'age55_64',
  '65+': 'age65'
}

function ageLabel(key: string): string {
  const k = ageBuckets[key]
  return k ? t(`console.${k}`) : t('console.unknown')
}

function baseTooltip(borderColor: string): Record<string, unknown> {
  return {
    backgroundColor: cssVar('--color-surface', '#0e1430'),
    borderColor: borderColor,
    borderWidth: 1,
    textStyle: { color: cssVar('--color-text', '#e6f1ff') },
    extraCssText: 'border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.28);'
  }
}

function renderSparkline(el: HTMLDivElement | null, data: number[], color: string): void {
  if (!el || !data.length) return
  const chart = echarts.init(el)
  chart.setOption({
    grid: { left: 2, right: 2, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '55' },
          { offset: 1, color: color + '00' }
        ]) }
      }
    ]
  })
  charts.push(chart)
}

function sparkFor(index: number): number[] {
  const d = overview.value
  if (!d) return []
  const last14 = d.daily.slice(-14)
  switch (index) {
    case 0:
      return d.new_users.map((x) => x.n)
    case 1:
      return last14.map((x) => x.requests)
    case 2:
      return last14.map((x) => Math.round(x.total / 100))
    case 3:
      return last14.map((x) => x.requests)
    case 4:
    case 5:
      return last14.map((x) => Math.round(x.total / 100))
    default:
      return []
  }
}

function renderTrend(): void {
  if (!trendRef.value) return
  const c = axisColors()
  const daily = overview.value!.daily
  const chart = echarts.init(trendRef.value)
  chart.setOption({
    color: [c.primary, c.accent],
    tooltip: { ...baseTooltip(c.line), trigger: 'axis', valueFormatter: (val: number | string) => fmtTokens(val) },
    legend: { bottom: 4, left: 'center', itemWidth: 14, itemHeight: 8, textStyle: { color: c.text } },
    grid: { left: 64, right: 60, top: 28, bottom: 48 },
    xAxis: {
      type: 'category',
      data: daily.map((x) => dayToLabel(x.day)),
      axisLabel: { color: c.text },
      axisLine: { lineStyle: { color: c.line } }
    },
    yAxis: [
      { type: 'value', name: t('console.requests'), nameTextStyle: { color: c.text }, axisLabel: { color: c.text, formatter: (v: number) => fmtTokens(v) }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
      { type: 'value', name: 'Tokens', nameTextStyle: { color: c.text }, axisLabel: { color: c.text, formatter: (v: number) => fmtTokens(v) }, splitLine: { show: false } }
    ],
    series: [
      { name: t('console.requests'), type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: daily.map((x) => x.requests), areaStyle: { opacity: 0.14 } },
      { name: 'Tokens', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 4, data: daily.map((x) => x.total), areaStyle: { opacity: 0.1 } }
    ]
  })
  charts.push(chart)
}

function renderHourly(): void {
  if (!hourRef.value) return
  const c = axisColors()
  const hourly = overview.value!.hourly
  const map = new Map(hourly.map((h) => [h.hour, h.requests]))
  const data: number[] = []
  for (let h = 0; h < 24; h++) data.push(map.get(h) ?? 0)
  const max = Math.max(1, ...data)
  const chart = echarts.init(hourRef.value)
  chart.setOption({
    tooltip: { ...baseTooltip(c.line), trigger: 'axis', valueFormatter: (val: number | string) => fmtTokens(val) },
    grid: { left: 44, right: 8, top: 20, bottom: 22 },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => i),
      axisLabel: { color: c.text, interval: 3, formatter: (v: number) => `${v}h` },
      axisLine: { lineStyle: { color: c.line } }
    },
    yAxis: { type: 'value', axisLabel: { color: c.text, formatter: (v: number) => fmtTokens(v) }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
    series: [
      {
        type: 'bar',
        data: data.map((v, i) => ({
          value: v,
          itemStyle: {
            color: v === max
              ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#ffb74d' },
                  { offset: 1, color: 'rgba(255,183,77,0.25)' }
                ])
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: c.primary },
                  { offset: 1, color: c.primary + '22' }
                ]),
            borderRadius: i === 0 || i === 23 ? [0, 0, 0, 0] : [3, 3, 0, 0]
          }
        })),
        barWidth: '58%'
      }
    ]
  })
  charts.push(chart)
}

function renderTopModels(): void {
  if (!modelRef.value) return
  const c = axisColors()
  const rows = overview.value!.by_model.slice(0, 8).reverse()
  const chart = echarts.init(modelRef.value)
  chart.setOption({
    tooltip: { ...baseTooltip(c.line), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 46, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { color: c.text, formatter: (v: number) => fmtTokens(v) }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
    yAxis: {
      type: 'category',
      data: rows.map((m) => m.model_key),
      axisLabel: { color: c.text, width: 120, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: 'bar',
        data: rows.map((m) => ({
          value: m.total,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: c.accent },
              { offset: 1, color: c.primary }
            ])
          }
        })),
        barWidth: 12
      }
    ]
  })
  charts.push(chart)
}

function renderDonut(ref: HTMLDivElement | null, data: { key: string; count: number }[], label: (k: string) => string, scrollLegend = false): void {
  if (!ref) return
  const c = axisColors()
  const chart = echarts.init(ref)
  chart.setOption({
    color: pieColors(),
    tooltip: { ...baseTooltip(c.line), trigger: 'item' },
    legend: {
      type: scrollLegend ? ('scroll' as const) : ('plain' as const),
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 12,
      itemHeight: 8,
      ...(scrollLegend ? { pageIconSize: 12, pageIconColor: c.text, pageIconInactiveColor: c.line } : {}),
      textStyle: { color: c.text }
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '44%'],
        data: data.map((d) => ({ name: label(d.key), value: d.count })),
        label: { color: c.text, fontSize: 10 },
        itemStyle: { borderColor: 'rgba(8,8,18,0.6)', borderWidth: 1 }
      }
    ]
  })
  charts.push(chart)
}

function renderTopProvinces(): void {
  if (!provRef.value) return
  const c = axisColors()
  const rows = overview.value!.top_provinces.slice(0, 8).reverse()
  const chart = echarts.init(provRef.value)
  chart.setOption({
    tooltip: { ...baseTooltip(c.line), trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (val: number | string) => fmtTokens(val) },
    grid: { left: 12, right: 44, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { color: c.text, formatter: (v: number) => fmtTokens(v) }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
    yAxis: {
      type: 'category',
      data: rows.map((p) => p.province),
      axisLabel: { color: c.text },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: 'bar',
        data: rows.map((p) => ({
          value: p.active_users,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#34d399' },
              { offset: 1, color: c.primary }
            ])
          }
        })),
        barWidth: 12
      }
    ]
  })
  charts.push(chart)
}

function renderAll(): void {
  charts.forEach((ch) => ch.dispose())
  charts = []
  cards.value.forEach((_, i) => {
    const spark = sparkFor(i)
    renderSparkline(sparkRefs[i], spark, i === 2 || i === 5 ? cssVar('--color-accent', '#7c5cff') : cssVar('--color-primary', '#00e5ff'))
  })
  renderTrend()
  renderHourly()
  renderTopModels()
  renderDonut(ageRef.value, overview.value!.age_dist, ageLabel, true)
  renderTopProvinces()
}

// window resize 与容器 ResizeObserver 会在窗口缩放时同时触发，经 rAF 合并后同帧只执行一次
const scheduleLayout = createRafCoalescer()
// 词云是 d3 布局、较昂贵：等尺寸变化稳定后再重排，避免拖拽窗口时逐帧卡顿
const scheduleCloud = createDebounced(renderCloud, 120)

function onResize(): void {
  charts.forEach((ch) => ch.resize())
  scheduleCloud()
}

const onWindowResize = () => scheduleLayout(onResize)

onMounted(async () => {
  try {
    overview.value = await fetchOverview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
  // 高频词词云：独立获取，失败/为空不影响概览其余内容
  loadHotWords()
  await nextTick()
  if (overview.value) {
    renderAll()
    window.addEventListener('resize', onWindowResize)
  }
  // 容器尺寸变化只重绘 ECharts 图表：侧边栏收起/展开改变内容区宽度但不触发
  // window resize；词云由 wcObserver 自行处理（防抖），避免重复重排
  if (rootRef.value) {
    pageObserver = new ResizeObserver(() => scheduleLayout(onResize))
    pageObserver.observe(rootRef.value)
  }
})

// 语言切换时重绘所有图表：ECharts 画布不响应 t() 的响应式变化，
// 不重绘则年龄/性别环形图的图例与图上 label 会停留在切换前的语言。
watch(
  () => locale.value,
  () => {
    if (overview.value) renderAll()
  }
)

// 主题切换时重绘所有图表：图表颜色取自 CSS 变量（--color-primary/--color-accent/
// --color-text-secondary/--color-border 等），切主题只改 CSS 变量、不会触发 ECharts
// 重绘，需手动重绘才能套用新主题色（与语言切换同理）。
watch(
  () => chatStore.currentTheme,
  () => {
    if (overview.value) renderAll()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  wcObserver?.disconnect()
  wcObserver = null
  pageObserver?.disconnect()
  pageObserver = null
  charts.forEach((ch) => ch.dispose())
  charts = []
})
</script>

<style scoped>
.admin-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  padding-right: 2px;
}

.ov-error {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 77, 94, 0.1);
  border: 1px solid rgba(255, 77, 94, 0.4);
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
}

.ov-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.ov-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  padding-top: 8px;
}

.ov-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px 12px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge);
  transition: var(--transition-normal);
}

.ov-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-glow);
  transform: translateY(-2px);
}

.ov-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ov-card-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.ov-card-value {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  text-shadow: 0 0 16px var(--color-glow);
}

.ov-card-spark {
  height: 34px;
  margin-top: auto;
}

.ov-grid {
  display: grid;
  gap: 14px;
}

.ov-grid--2 {
  grid-template-columns: 1fr 1fr;
}

.ov-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.ov-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 16px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge);
}

.ov-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.ov-chart {
  width: 100%;
  height: 220px;
}

.ov-chart--lg {
  height: 240px;
}

.ov-chart--h {
  height: 220px;
}

.ov-chart--donut {
  height: 210px;
}

.ov-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ov-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.ov-rank {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.ov-rank--1 {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 8px var(--color-glow);
}

.ov-rank--2 {
  background: linear-gradient(135deg, #ffb74d, #ff8a65);
}

.ov-rank--3 {
  background: linear-gradient(135deg, #90a4ae, #607d8b);
}

.ov-rank--n {
  background: var(--color-border);
}

.ov-avatar {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.ov-name {
  flex: 0 0 auto;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.ov-sub {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.ov-num {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-primary);
  text-shadow: 0 0 8px var(--color-glow);
}

.ov-time {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.ov-empty {
  padding: 18px 10px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 高频词词云：占两张图表卡片宽度，置于概览末尾 */
.ov-wordcloud-panel {
  grid-column: span 2;
}

/* —— 科技风 / 液态玻璃 控制条 —— */

/* 液态玻璃药丸容器：跟随主题变量（玻璃底 + 主题辉光），同热点地图右上角周期组件 */
.ov-seg {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 0 14px var(--color-glow);
}

/* 标题行内联的切换器：右对齐到标题行最右侧 */
.ov-seg--inline {
  margin-left: auto;
}

/* 滑动指示条：青→紫霓虹渐变，跟随主题强调色 */
.ov-seg-track {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--seg-count, 4));
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 12px var(--color-glow), inset 0 0 8px rgba(255, 255, 255, 0.25);
  transition: transform 0.38s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.ov-seg-btn {
  position: relative;
  z-index: 1;
  min-width: 38px;
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.ov-seg-btn:hover {
  color: var(--color-text);
}

.ov-seg-btn.active {
  color: #fff;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
}

.ov-wordcloud-wrap {
  width: 100%;
  min-height: 260px;
}

.ov-wordcloud-stage {
  position: relative;
  width: 100%;
}

.ov-wc-busy {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 3;
  padding: 4px 6px;
  border-radius: 999px;
  background: rgba(10, 14, 26, 0.55);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.ov-wc-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.ov-wordcloud {
  position: relative;
  width: 100%;
  height: 300px;
  min-height: 260px;
}

.ov-wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  opacity: 0.92;
  user-select: none;
  transition: transform 0.18s ease, text-shadow 0.18s ease, opacity 0.18s ease;
}

.ov-wc-word:hover {
  transform: translate(-50%, -50%) scale(1.16);
  text-shadow: 0 0 16px currentColor;
  opacity: 1;
  z-index: 2;
}

@media (max-width: 1100px) {
  .ov-grid--2,
  .ov-grid--3 {
    grid-template-columns: 1fr;
  }

  .ov-wordcloud-panel {
    grid-column: 1 / -1;
  }

  .ov-wordcloud,
  .ov-wordcloud-wrap {
    height: 240px;
    min-height: 220px;
  }
}
</style>
