<template>
  <div class="admin-usage" ref="rootRef">
    <div v-if="error" class="page-error">{{ error }}</div>
    <div v-if="loading" class="page-loading">
      <ChartLoading />
    </div>
    <template v-else>
      <section class="chart-card">
        <h3 class="chart-title">{{ $t('console.dailyTrend') }}</h3>
        <div ref="dailyRef" class="chart-box"></div>
      </section>
      <div class="chart-grid">
        <section class="chart-card">
          <h3 class="chart-title">{{ $t('console.byModel') }}</h3>
          <div ref="modelRef" class="chart-box"></div>
        </section>
        <section class="chart-card">
          <h3 class="chart-title">{{ $t('console.byUser') }}</h3>
          <div ref="userRef" class="chart-box"></div>
        </section>
      </div>
      <div class="chart-grid">
        <section class="chart-card">
          <h3 class="chart-title">{{ $t('console.byProviderUsage') }}</h3>
          <div ref="provRoseRef" class="chart-box"></div>
        </section>
        <section class="chart-card">
          <h3 class="chart-title">{{ $t('console.byCity') }}</h3>
          <div class="rank-list">
            <div
              v-for="(item, idx) in cityRank"
              :key="`${item.province}-${item.city}`"
              class="rank-item"
              :class="[`rank-item--${idx + 1}`, { 'is-top': idx < 3 }]"
            >
              <div class="rank-badge">
                <span class="rank-badge__num">{{ idx + 1 }}</span>
              </div>
              <div class="rank-main">
                <div class="rank-head">
                  <span class="rank-name" :title="item.city">{{ item.city }}</span>
                  <span class="rank-prov" :title="item.province">{{ item.province }}</span>
                  <span class="rank-value">{{ formatTokens(item.total) }}</span>
                </div>
                <div class="rank-track">
                  <div class="rank-fill" :style="{ width: item.percent + '%' }">
                    <span class="rank-fill__shine"></span>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="!cityRank.length" class="rank-empty">{{ $t('common.noData') }}</p>
          </div>
        </section>
      </div>
      <div class="chart-grid">
        <section class="chart-card gauge-card">
          <AppGauge
            :value="gaugeValue"
            :max="gaugeMax"
            :label="$t('console.todayTokens')"
            unit="Tokens"
            :caption="gaugeCaption"
          />
        </section>
        <section class="chart-card gauge-card">
          <AppGauge
            :value="reqGaugeValue"
            :max="reqGaugeMax"
            :label="$t('console.todayRequests')"
            unit="次"
            :caption="reqGaugeCaption"
          />
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'
import type { AdminUsage } from '@/types/admin'
import { fetchUsage } from '@/services/adminService'
import { useChatStore } from '@/stores/chatStore'
import { createRafCoalescer } from '@/utils/resize'
import AppLoading from '@/components/common/AppLoading.vue'
import ChartLoading from '@/components/common/ChartLoading.vue'
import AppGauge from '@/components/common/AppGauge.vue'
import { useProviders } from '@/composables/useProviders'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t, locale } = useI18n()
const { providerName } = useProviders()
const chatStore = useChatStore()

const usage = ref<AdminUsage | null>(null)
const loading = ref(true)
const error = ref('')

const dailyRef = ref<HTMLDivElement | null>(null)
const modelRef = ref<HTMLDivElement | null>(null)
const userRef = ref<HTMLDivElement | null>(null)
const provRoseRef = ref<HTMLDivElement | null>(null)
const rootRef = ref<HTMLDivElement | null>(null)

let charts: echarts.ECharts[] = []
let pageObserver: ResizeObserver | null = null

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

function dayToLabel(day: number): string {
  const d = new Date(day * 86400000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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

// #rgb / #rrggbb → rgba()，供 ECharts 扇区同色渐变使用；非 hex 原样返回
function withAlpha(color: string, alpha: number): string {
  let hex = color.trim()
  if (hex.startsWith('#')) {
    if (hex.length === 4) hex = '#' + hex.slice(1).split('').map((x) => x + x).join('')
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    if ([r, g, b].every((n) => !Number.isNaN(n))) return `rgba(${r},${g},${b},${alpha})`
  }
  return color
}

function render() {
  if (!usage.value) return
  const c = axisColors()
  const baseTextStyle = { color: c.text }
  const axisLine = { lineStyle: { color: c.line } }
  const splitLine = { lineStyle: { color: c.line, opacity: 0.35 } }

  charts.forEach((ch) => ch.dispose())
  charts = []

  if (dailyRef.value) {
    const daily = usage.value.daily
    const chart = echarts.init(dailyRef.value)
    chart.setOption({
      color: [c.primary, c.accent],
      tooltip: { trigger: 'axis', backgroundColor: cssVar('--color-surface', '#0e1430'), borderColor: c.line, textStyle: { color: cssVar('--color-text', '#e6f1ff') }, valueFormatter: (val: number | string) => formatTokens(val) },
      legend: { bottom: 8, left: 'center', itemWidth: 16, itemHeight: 10, textStyle: baseTextStyle },
      grid: { left: 64, right: 24, top: 40, bottom: 64 },
      xAxis: {
        type: 'category',
        data: daily.map((d) => dayToLabel(d.day)),
        axisLabel: baseTextStyle,
        axisLine
      },
      yAxis: [
        { type: 'value', name: t('console.requests'), nameTextStyle: baseTextStyle, axisLabel: { ...baseTextStyle, formatter: formatTokens }, splitLine },
        { type: 'value', name: 'Tokens', nameTextStyle: baseTextStyle, axisLabel: { ...baseTextStyle, formatter: formatTokens }, splitLine }
      ],
      series: [
        { name: t('console.requests'), type: 'line', smooth: true, data: daily.map((d) => d.requests), areaStyle: { opacity: 0.15 } },
        { name: 'Tokens', type: 'line', yAxisIndex: 1, smooth: true, data: daily.map((d) => d.total), areaStyle: { opacity: 0.12 } }
      ]
    })
    charts.push(chart)
  }

  if (modelRef.value) {
    const byModel = usage.value.by_model.slice(0, 10)
    const labelOf = (m: (typeof byModel)[number]) =>
      locale.value === 'en' ? m.name_en || m.name || m.model_key : m.name || m.model_key
    const provOf = new Map(byModel.map((m) => [labelOf(m), m.provider]))
    const chart = echarts.init(modelRef.value)
    chart.setOption({
      color: [c.primary],
      tooltip: {
        trigger: 'axis',
        backgroundColor: cssVar('--color-surface', '#0e1430'),
        borderColor: c.line,
        textStyle: { color: cssVar('--color-text', '#e6f1ff') },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const head = arr[0] as { name: string; marker?: string; value: number }
          const prov = provOf.get(head.name)
          const lines = [`<b>${head.name}</b>`]
          if (prov) lines.push(`<span style="opacity:.65;font-size:10px">${providerName(prov)}</span>`)
          for (const it of arr as { marker?: string; value: number }[]) {
            lines.push(`${it.marker ?? ''} Tokens ${formatTokens(it.value)}`)
          }
          return lines.join('<br/>')
        }
      },
      grid: { left: 10, right: 40, top: 20, bottom: 60 },
      xAxis: {
        type: 'value',
        axisLabel: { ...baseTextStyle, formatter: formatTokens },
        splitLine
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: byModel.map(labelOf),
        axisLabel: { ...baseTextStyle, width: 150, overflow: 'truncate' },
        axisLine
      },
      series: [
        {
          name: 'Tokens',
          type: 'bar',
          barMaxWidth: 16,
          data: byModel.map((m) => m.total),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: c.text, fontSize: 10, formatter: (p: { value: number }) => formatTokens(p.value) }
        }
      ]
    })
    charts.push(chart)
  }

  if (userRef.value) {
    const byUser = usage.value.by_user.slice(0, 10)
    const chart = echarts.init(userRef.value)
    chart.setOption({
      color: [c.accent],
      tooltip: { trigger: 'axis', backgroundColor: cssVar('--color-surface', '#0e1430'), borderColor: c.line, textStyle: { color: cssVar('--color-text', '#e6f1ff') } },
      grid: { left: 10, right: 40, top: 20, bottom: 60 },
      xAxis: { type: 'value', axisLabel: { ...baseTextStyle, formatter: formatTokens }, splitLine },
      yAxis: {
        type: 'category',
        inverse: true,
        data: byUser.map((u) => u.username),
        axisLabel: { ...baseTextStyle, width: 120, overflow: 'truncate' },
        axisLine
      },
      series: [
        {
          name: 'Tokens',
          type: 'bar',
          barMaxWidth: 16,
          data: byUser.map((u) => u.total),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: c.text, fontSize: 10, formatter: (p: { value: number }) => formatTokens(p.value) }
        }
      ]
    })
    charts.push(chart)
  }

  // 按提供商用量：渐变环形图（中心总量 + 底部占比图例 + 悬浮发光）
  if (provRoseRef.value) {
    const rows = usage.value.by_provider.slice(0, 8)
    const totalAll = rows.reduce((s, r) => s + r.total, 0) || 1
    const palette = pieColors()
    const surface = cssVar('--color-surface', '#0e1430')
    const ringData = rows.map((r, i) => {
      const col = palette[i % palette.length]
      return {
        name: providerName(r.provider),
        value: r.total,
        itemStyle: {
          borderRadius: 7,
          borderColor: surface,
          borderWidth: 2,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: withAlpha(col, 0.95) },
            { offset: 1, color: withAlpha(col, 0.45) }
          ])
        }
      }
    })
    const chart = echarts.init(provRoseRef.value)
    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: surface,
        borderColor: c.line,
        textStyle: { color: cssVar('--color-text', '#e6f1ff') },
        formatter: (p: { dataIndex: number }) => {
          const d = rows[p.dataIndex]
          if (!d) return ''
          const pct = ((d.total / totalAll) * 100).toFixed(1)
          return [
            `<b>${providerName(d.provider)}</b>`,
            `Tokens ${formatTokens(d.total)}（${pct}%）`,
            `${t('console.requests')} ${d.requests.toLocaleString()}`
          ].join('<br/>')
        }
      },
      title: {
        text: formatTokens(totalAll),
        subtext: locale.value === 'en' ? 'Total Tokens' : '总 Tokens',
        left: 'center',
        top: '35%',
        itemGap: 4,
        textStyle: {
          color: cssVar('--color-text', '#e6f1ff'),
          fontSize: 22,
          fontWeight: 700,
          fontFamily: cssVar('--font-mono', 'monospace')
        },
        subtextStyle: { color: c.text, fontSize: 10 }
      },
      legend: {
        bottom: 2,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { ...baseTextStyle, fontSize: 10 },
        formatter: (name: string) => {
          const hit = rows.find((r) => providerName(r.provider) === name)
          const pct = hit ? ((hit.total / totalAll) * 100).toFixed(0) : ''
          return `${name}  ${pct}%`
        }
      },
      series: [
        {
          type: 'pie',
          radius: ['54%', '76%'],
          center: ['50%', '45%'],
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 6,
            itemStyle: { shadowBlur: 20, shadowColor: withAlpha(c.primary, 0.55) }
          },
          data: ringData
        }
      ]
    })
    charts.push(chart)
  }
}

// 按地区用量榜单：市级 tokens 降序 TOP10，进度条按榜首归一化
const cityRank = computed(() => {
  const rows = [...(usage.value?.by_city ?? [])].sort((a, b) => b.total - a.total).slice(0, 10)
  const max = rows[0]?.total || 1
  return rows.map((r) => ({
    ...r,
    percent: Math.max(3, Math.round((r.total / max) * 100))
  }))
})

// 码表数据：今日 Token 消耗（最近一天）+ 量程 + 速率说明
const gaugeValue = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return 0
  return daily[daily.length - 1].total
})

const gaugeMax = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return 1
  return Math.max(...daily.map((d) => d.total)) * 1.15 || 1
})

const gaugeCaption = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return ''
  const last = daily[daily.length - 1]
  const rate = last.total / 86400
  const rateStr = rate >= 100 ? Math.round(rate).toLocaleString() : rate.toFixed(1)
  return t('console.tokenRate', { rate: rateStr })
})

// 码表数据：今日模型调用次数
const reqGaugeValue = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return 0
  return daily[daily.length - 1].requests
})

const reqGaugeMax = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return 1
  return Math.max(...daily.map((d) => d.requests)) * 1.15 || 1
})

const reqGaugeCaption = computed(() => {
  const daily = usage.value?.daily
  if (!daily?.length) return ''
  const total = daily.reduce((s, d) => s + d.requests, 0)
  return t('console.requestRate', { total: total.toLocaleString() })
})

// 把大数值格式化为紧凑形式（横轴/柱标签/趋势图 y 轴通用），避免 token 长数字挤在一起
// 单位约定：千=K、万=W、百万=M、亿(>=1e8)兜底
function formatTokens(v: number | string): string {
  const n = Number(v)
  if (!isFinite(n)) return String(v)
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + 'W'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function onResize() {
  charts.forEach((ch) => ch.resize())
}

// window resize 与容器 ResizeObserver 会在窗口缩放时同时触发，经 rAF 合并后同帧只执行一次
const scheduleLayout = createRafCoalescer()
const onWindowResize = () => scheduleLayout(onResize)

onMounted(async () => {
  try {
    usage.value = await fetchUsage()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
    await nextTick()
    render()
  }
  window.addEventListener('resize', onWindowResize)
  // 容器尺寸变化也重绘：侧边栏收起/展开等改变内容区宽度但不触发 window resize
  if (rootRef.value) {
    pageObserver = new ResizeObserver(() => scheduleLayout(onResize))
    pageObserver.observe(rootRef.value)
  }
})

// 语言切换时重绘所有图表：ECharts 画布不响应 t() 的响应式变化，
// 不重绘则年龄/性别饼图的图例与图上 label 会停留在切换前的语言。
watch(
  () => locale.value,
  () => {
    if (usage.value) render()
  }
)

// 主题切换时重绘所有图表：图表颜色取自 CSS 变量，切主题只改变量、
// 不触发 ECharts 重绘，需手动重绘套用新主题色（与语言切换同理）。
watch(
  () => chatStore.currentTheme,
  () => {
    if (usage.value) render()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  pageObserver?.disconnect()
  pageObserver = null
  charts.forEach((ch) => ch.dispose())
  charts = []
})
</script>

<style scoped>
.admin-usage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: auto;
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
  width: 100%;
  min-height: 60vh;
}

.chart-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-title {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.chart-box {
  width: 100%;
  height: 300px;
}

/* —— 地区用量榜单 —— */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  height: 300px;
  overflow-y: auto;
  padding-right: 6px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  animation: rankRise 0.5s ease both;
}

@keyframes rankRise {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.rank-badge {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-text) 6%, transparent);
  border: 1px solid var(--color-border);
}

.rank-item--1 .rank-badge {
  color: #04101f;
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 14px var(--color-glow);
}

.rank-item--2 .rank-badge {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.rank-item--3 .rank-badge {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.rank-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rank-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.rank-name {
  flex: none;
  max-width: 38%;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-prov {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-value {
  flex: none;
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
}

.rank-item--1 .rank-value {
  color: var(--color-primary);
  text-shadow: 0 0 10px var(--color-glow);
}

.rank-track {
  position: relative;
  height: 6px;
  border-radius: 99px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
}

.rank-fill {
  position: relative;
  height: 100%;
  border-radius: 99px;
  overflow: hidden;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 45%, transparent);
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.rank-item--1 .rank-fill {
  box-shadow: 0 0 12px var(--color-glow);
}

.rank-fill__shine {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 45%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: rankShine 2.6s ease-in-out infinite;
}

@keyframes rankShine {
  0% {
    transform: translateX(-120%);
  }
  60%,
  100% {
    transform: translateX(320%);
  }
}

.rank-empty {
  margin: auto;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.gauge-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 332px;
}

.gauge-card .app-gauge {
  width: 100%;
}

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>