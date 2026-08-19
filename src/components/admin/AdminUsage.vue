<template>
  <div class="admin-usage">
    <div v-if="error" class="page-error">{{ error }}</div>
    <div v-if="loading" class="page-loading">
      <AppLoading :size="28" glow />
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
          <h3 class="chart-title">{{ $t('console.byAge') }}</h3>
          <div ref="ageRef" class="chart-box"></div>
        </section>
        <section class="chart-card">
          <h3 class="chart-title">{{ $t('console.byGender') }}</h3>
          <div ref="genderRef" class="chart-box"></div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'
import type { AdminUsage } from '@/types/admin'
import { fetchUsage } from '@/services/adminService'
import AppLoading from '@/components/common/AppLoading.vue'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t } = useI18n()

const usage = ref<AdminUsage | null>(null)
const loading = ref(true)
const error = ref('')

const dailyRef = ref<HTMLDivElement | null>(null)
const modelRef = ref<HTMLDivElement | null>(null)
const userRef = ref<HTMLDivElement | null>(null)
const ageRef = ref<HTMLDivElement | null>(null)
const genderRef = ref<HTMLDivElement | null>(null)

let charts: echarts.ECharts[] = []

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
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 10, 20, 0.9)', borderColor: c.line, textStyle: { color: '#fff' } },
      legend: { bottom: 8, left: 'center', itemWidth: 16, itemHeight: 10, textStyle: baseTextStyle },
      grid: { left: 50, right: 24, top: 40, bottom: 64 },
      xAxis: {
        type: 'category',
        data: daily.map((d) => dayToLabel(d.day)),
        axisLabel: baseTextStyle,
        axisLine
      },
      yAxis: [
        { type: 'value', name: t('console.requests'), nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine },
        { type: 'value', name: 'Tokens', nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine }
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
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 10, 20, 0.9)', borderColor: c.line, textStyle: { color: '#fff' } },
      grid: { left: 10, right: 40, top: 20, bottom: 60 },
      xAxis: {
        type: 'value',
        axisLabel: baseTextStyle,
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
          label: { show: true, position: 'right', color: c.text, fontSize: 10 }
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
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 10, 20, 0.9)', borderColor: c.line, textStyle: { color: '#fff' } },
      grid: { left: 10, right: 40, top: 20, bottom: 60 },
      xAxis: { type: 'value', axisLabel: baseTextStyle, splitLine },
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
          label: { show: true, position: 'right', color: c.text, fontSize: 10 }
        }
      ]
    })
    charts.push(chart)
  }

  if (ageRef.value) {
    const chart = echarts.init(ageRef.value)
    chart.setOption({
      color: pieColors,
      tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 10, 20, 0.9)', borderColor: c.line, textStyle: { color: '#fff' } },
      legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 8, textStyle: baseTextStyle },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          data: usage.value.age_dist.map((d) => ({ name: ageLabel(d.key), value: d.count })),
          label: { color: c.text, fontSize: 10 },
          itemStyle: { borderColor: 'rgba(8, 8, 18, 0.6)', borderWidth: 1 }
        }
      ]
    })
    charts.push(chart)
  }

  if (genderRef.value) {
    const chart = echarts.init(genderRef.value)
    chart.setOption({
      color: pieColors,
      tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 10, 20, 0.9)', borderColor: c.line, textStyle: { color: '#fff' } },
      legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 8, textStyle: baseTextStyle },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          data: usage.value.gender_dist.map((d) => ({ name: genderLabel(d.key), value: d.count })),
          label: { color: c.text, fontSize: 10 },
          itemStyle: { borderColor: 'rgba(8, 8, 18, 0.6)', borderWidth: 1 }
        }
      ]
    })
    charts.push(chart)
  }
}

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

function onResize() {
  charts.forEach((ch) => ch.resize())
}

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
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  charts.forEach((ch) => ch.dispose())
  charts = []
})
</script>

<style scoped>
.admin-usage {
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

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>