<template>
  <div class="admin-overview">
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
            <AppIcon name="lucide:pie-chart" :size="16" />
            {{ $t('console.byGender') }}
          </h3>
          <div ref="genderRef" class="ov-chart ov-chart--donut"></div>
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
        <section class="ov-panel">
          <h3 class="ov-panel-title">
            <AppIcon name="lucide:user-plus" :size="16" />
            {{ $t('console.ovRecentUsers') }}
          </h3>
          <ul class="ov-list">
            <li v-for="u in overview.recent_users" :key="u.username" class="ov-list-item">
              <img class="ov-avatar" :src="avatarSrc(u.avatar)" alt="" />
              <span class="ov-name">{{ u.username }}</span>
              <span class="ov-sub">{{ fmtRegion(u) }}</span>
              <span class="ov-time">{{ fmtTime(u.created_at) }}</span>
            </li>
            <li v-if="overview.recent_users.length === 0" class="ov-empty">{{ $t('console.noUsers') }}</li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { AdminOverview } from '@/types/admin'
import { fetchOverview } from '@/services/adminService'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { avatarSrc } from '@/utils/avatar'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t } = useI18n()

const overview = ref<AdminOverview | null>(null)
const loading = ref(true)
const error = ref('')

const trendRef = ref<HTMLDivElement | null>(null)
const hourRef = ref<HTMLDivElement | null>(null)
const modelRef = ref<HTMLDivElement | null>(null)
const ageRef = ref<HTMLDivElement | null>(null)
const genderRef = ref<HTMLDivElement | null>(null)
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

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtRegion(u: { province: string; city: string; district: string }): string {
  return [u.province, u.city, u.district].filter(Boolean).join(' ') || '-'
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

const pieColors = [
  cssVar('--color-primary', '#00e5ff'),
  cssVar('--color-accent', '#7c5cff'),
  '#ffb74d',
  '#ff5b6a',
  '#34d399',
  '#60a5fa',
  '#e879f9',
  '#94a3b8'
]

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

function genderLabel(key: string): string {
  if (key === 'male') return t('auth.genderMale')
  if (key === 'female') return t('auth.genderFemale')
  if (key === 'other') return t('auth.genderOther')
  return t('console.unknown')
}

function baseTooltip(borderColor: string): Record<string, unknown> {
  return {
    backgroundColor: 'rgba(7, 10, 24, 0.94)',
    borderColor: borderColor,
    borderWidth: 1,
    textStyle: { color: '#fff' },
    extraCssText: 'border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.5);'
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
    tooltip: { ...baseTooltip(c.line), trigger: 'axis' },
    legend: { bottom: 4, left: 'center', itemWidth: 14, itemHeight: 8, textStyle: { color: c.text } },
    grid: { left: 46, right: 50, top: 28, bottom: 48 },
    xAxis: {
      type: 'category',
      data: daily.map((x) => dayToLabel(x.day)),
      axisLabel: { color: c.text },
      axisLine: { lineStyle: { color: c.line } }
    },
    yAxis: [
      { type: 'value', name: t('console.requests'), nameTextStyle: { color: c.text }, axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
      { type: 'value', name: 'Tokens', nameTextStyle: { color: c.text }, axisLabel: { color: c.text }, splitLine: { show: false } }
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
    tooltip: { ...baseTooltip(c.line), trigger: 'axis' },
    grid: { left: 36, right: 8, top: 20, bottom: 22 },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => i),
      axisLabel: { color: c.text, interval: 3, formatter: (v: number) => `${v}h` },
      axisLine: { lineStyle: { color: c.line } }
    },
    yAxis: { type: 'value', axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
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

function renderDonut(ref: HTMLDivElement | null, data: { key: string; count: number }[], label: (k: string) => string): void {
  if (!ref) return
  const c = axisColors()
  const chart = echarts.init(ref)
  chart.setOption({
    color: pieColors,
    tooltip: { ...baseTooltip(c.line), trigger: 'item' },
    legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 8, textStyle: { color: c.text } },
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
    tooltip: { ...baseTooltip(c.line), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 40, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.line, opacity: 0.3 } } },
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
  renderDonut(ageRef.value, overview.value!.age_dist, ageLabel)
  renderDonut(genderRef.value, overview.value!.gender_dist, genderLabel)
  renderTopProvinces()
}

function onResize(): void {
  charts.forEach((ch) => ch.resize())
}

onMounted(async () => {
  try {
    overview.value = await fetchOverview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
  await nextTick()
  if (overview.value) {
    renderAll()
    window.addEventListener('resize', onResize)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
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

@media (max-width: 1100px) {
  .ov-grid--2,
  .ov-grid--3 {
    grid-template-columns: 1fr;
  }
}
</style>
