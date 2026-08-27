<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'
import type { HeatPeriod, HotWordItem } from '@/types/admin'
import { fetchHotWords } from '@/services/adminService'
import { HEAT_PERIODS } from '@/utils/provinceHeat'
import { useChatStore } from '@/stores/chatStore'
import { createRafCoalescer } from '@/utils/resize'
import ChartLoading from '@/components/common/ChartLoading.vue'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const { t, locale } = useI18n()
const chatStore = useChatStore()

const period = ref<HeatPeriod>('month')
const limit = ref(20)
const HW_LIMITS = [10, 20, 50]
const words = ref<HotWordItem[]>([])
const loading = ref(true)
const error = ref('')
const chartRef = ref<HTMLDivElement | null>(null)
const rootRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

// 滑动指示条索引（同热点地图右上角周期组件）
const periodIndex = computed(() => Math.max(0, HEAT_PERIODS.findIndex((p) => p.key === period.value)))
const limitIndex = computed(() => Math.max(0, HW_LIMITS.indexOf(limit.value)))

// 热词列表（纯展示，无排序/筛选）
const hwColumns = computed<TableColumn[]>(() => [
  {
    key: 'rank',
    title: t('console.hotWordsRank'),
    width: 70,
    align: 'center',
    className: 'cell-num',
    formatter: (_row: HotWordItem, _col: TableColumn, _v: unknown, index: number) => String(index + 1)
  },
  { key: 'word', title: t('console.hotWordsWord'), width: 300, ellipsis: true },
  {
    key: 'count',
    title: t('console.hotWordsCount'),
    width: 140,
    align: 'right',
    className: 'cell-num',
    formatter: (row: HotWordItem) => row.count.toLocaleString()
  }
])

function cssVar(name: string, fallback: string) {
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

async function load() {
  loading.value = true
  error.value = ''
  try {
    words.value = await fetchHotWords(period.value, limit.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
    await nextTick()
    render()
  }
}

function render() {
  if (!chartRef.value) return
  const c = axisColors()
  chart?.dispose()
  chart = echarts.init(chartRef.value)
  const list = words.value
  chart.setOption({
    color: [c.primary],
    tooltip: {
      trigger: 'axis',
      backgroundColor: cssVar('--color-surface', '#0e1430'),
      borderColor: c.line,
      textStyle: { color: cssVar('--color-text', '#e6f1ff') }
    },
    grid: { left: 12, right: 52, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: c.text },
      splitLine: { lineStyle: { color: c.line, opacity: 0.35 } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map((d) => d.word),
      axisLabel: { color: c.text, width: 160, overflow: 'truncate' },
      axisLine: { lineStyle: { color: c.line } }
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: list.map((d) => d.count),
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: c.text, fontSize: 10 }
      }
    ]
  })
}

function onResize() {
  chart?.resize()
}

// window resize 与容器 ResizeObserver 会同时触发，经 rAF 合并后同帧只执行一次
const scheduleLayout = createRafCoalescer()
const onWindowResize = () => scheduleLayout(onResize)

function switchPeriod(p: HeatPeriod) {
  if (p !== period.value) {
    period.value = p
    load()
  }
}
function switchLimit(n: number) {
  if (n !== limit.value) {
    limit.value = n
    load()
  }
}

watch(() => locale.value, () => {
  if (words.value.length) render()
})

// 主题切换时重绘条形图：图表颜色取自 CSS 变量（--color-primary/--color-text-secondary/
// --color-border），切主题只改变量、不触发 ECharts 重绘，需手动重绘套用新主题色。
watch(() => chatStore.currentTheme, () => {
  if (words.value.length) render()
})

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  // 容器尺寸变化也重绘：窗口缩放、侧边栏收起/展开等都会改变图表宽度，
  // 仅监听 window resize 会漏掉（此前正是因此导致条形图不随窗口缩放）
  if (rootRef.value) {
    resizeObserver = new ResizeObserver(() => scheduleLayout(onResize))
    resizeObserver.observe(rootRef.value)
  }
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="admin-hot-words" ref="rootRef">
    <div class="hw-toolbar">
      <p class="hw-scope">{{ t('console.hotWordsScope') }}</p>
      <div class="hw-fields">
        <div class="hw-field">
          <span class="hw-label">{{ t('console.hotWordsPeriod') }}</span>
          <div class="hw-seg" style="--seg-count: 4">
            <span class="hw-seg-track" :style="{ transform: `translateX(${periodIndex * 100}%)` }"></span>
            <button
              v-for="p in HEAT_PERIODS"
              :key="p.key"
              type="button"
              class="hw-seg-btn"
              :class="{ active: period === p.key }"
              @click="switchPeriod(p.key)"
            >
              {{ t(p.labelKey) }}
            </button>
          </div>
        </div>
        <div class="hw-field">
          <span class="hw-label">{{ t('console.hotWordsLimit') }}</span>
          <div class="hw-seg" style="--seg-count: 3">
            <span class="hw-seg-track" :style="{ transform: `translateX(${limitIndex * 100}%)` }"></span>
            <button
              v-for="n in HW_LIMITS"
              :key="n"
              type="button"
              class="hw-seg-btn"
              :class="{ active: limit === n }"
              @click="switchLimit(n)"
            >
              {{ n }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="page-error">{{ error }}</div>

    <div v-else-if="loading" class="page-loading">
      <ChartLoading />
    </div>

    <template v-else>
      <div v-if="words.length === 0" class="hw-empty">{{ t('console.hotWordsEmpty') }}</div>

      <template v-else>
        <div class="chart-card">
          <h3 class="chart-title">{{ t('console.hotWordsTitle') }}</h3>
          <div ref="chartRef" class="chart-box" :style="{ height: Math.max(300, words.length * 26) + 'px' }"></div>
        </div>

        <div class="chart-card">
          <AppTable
            :columns="hwColumns"
            :data="words"
            :empty-text="$t('console.hotWordsEmpty')"
            row-key="word"
            size="small"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.admin-hot-words {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.hw-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.hw-fields {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hw-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hw-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 液态玻璃药丸容器：跟随主题变量，同热点地图右上角周期组件 */
.hw-seg {
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

/* 滑动指示条：青→紫霓虹渐变，跟随主题强调色 */
.hw-seg-track {
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

.hw-seg-btn {
  position: relative;
  z-index: 1;
  min-width: 34px;
  height: 20px;
  padding: 0 8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.hw-seg-btn:hover {
  color: var(--color-text);
}

.hw-seg-btn.active {
  color: #fff;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
}

.hw-scope {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 60vh;
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

.hw-empty {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.chart-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
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
}

:deep(.cell-num) {
  font-family: var(--font-mono);
}
</style>
