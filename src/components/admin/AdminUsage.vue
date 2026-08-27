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
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'
import type { AdminUsage } from '@/types/admin'
import { fetchUsage } from '@/services/adminService'
import { useChatStore } from '@/stores/chatStore'
import { createRafCoalescer } from '@/utils/resize'
import AppLoading from '@/components/common/AppLoading.vue'
import ChartLoading from '@/components/common/ChartLoading.vue'
import AppGauge from '@/components/common/AppGauge.vue'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t, locale } = useI18n()
const chatStore = useChatStore()

const usage = ref<AdminUsage | null>(null)
const loading = ref(true)
const error = ref('')

const dailyRef = ref<HTMLDivElement | null>(null)
const modelRef = ref<HTMLDivElement | null>(null)
const userRef = ref<HTMLDivElement | null>(null)
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
    const chart = echarts.init(modelRef.value)
    chart.setOption({
      color: [c.primary],
      tooltip: { trigger: 'axis', backgroundColor: cssVar('--color-surface', '#0e1430'), borderColor: c.line, textStyle: { color: cssVar('--color-text', '#e6f1ff') } },
      grid: { left: 10, right: 40, top: 20, bottom: 60 },
      xAxis: {
        type: 'value',
        axisLabel: { ...baseTextStyle, formatter: formatTokens },
        splitLine
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: byModel.map((m) => m.model_key),
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
}

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