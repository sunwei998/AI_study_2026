<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HeatPeriod, HotWordItem } from '@/types/admin'
import { fetchHotWords } from '@/services/adminService'
import { HEAT_PERIODS } from '@/utils/provinceHeat'
import ChartLoading from '@/components/common/ChartLoading.vue'
import AppWordCloud from '@/components/common/AppWordCloud.vue'

const { t } = useI18n()

const period = ref<HeatPeriod>('month')
const limit = ref(50)
const HW_LIMITS = [10, 50, 100]
const words = ref<HotWordItem[]>([])
const loading = ref(true)
const error = ref('')

// 滑动指示条索引（同热点地图右上角周期组件）
const periodIndex = computed(() => Math.max(0, HEAT_PERIODS.findIndex((p) => p.key === period.value)))
const limitIndex = computed(() => Math.max(0, HW_LIMITS.indexOf(limit.value)))

// 词云数据：{ text, weight }
const cloudWords = computed(() => words.value.map((d) => ({ text: d.word, weight: d.count })))

// 排行榜：最大次数用于计算条形宽度
const maxCount = computed(() => Math.max(1, ...words.value.map((d) => d.count)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    words.value = await fetchHotWords(period.value, limit.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

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

onMounted(load)
</script>

<template>
  <div class="admin-hot-words">
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
        <div class="rank-card cloud-card">
          <h3 class="rank-title">{{ t('console.hotWordsTitle') }}</h3>
          <div class="cloud-box">
            <AppWordCloud :words="cloudWords" />
          </div>
        </div>

        <div class="rank-card">
          <h3 class="rank-title">{{ t('console.hotWordsRankTitle') }}</h3>
          <ul class="rank-list">
            <li
              v-for="(d, i) in words"
              :key="d.word"
              class="rank-row"
              :class="{ 'is-top': i < 3 }"
            >
              <span class="rank-badge" :class="`rank-${i + 1}`">{{ i + 1 }}</span>
              <span class="rank-word" :title="d.word">{{ d.word }}</span>
              <div class="rank-bar-wrap">
                <div
                  class="rank-bar"
                  :class="{ 'rank-bar--top': i < 3 }"
                  :style="{ width: `${(d.count / maxCount) * 100}%` }"
                ></div>
              </div>
              <span class="rank-count">{{ d.count.toLocaleString() }}</span>
            </li>
          </ul>
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
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 var(--glass-edge), 0 6px 18px rgba(0, 0, 0, 0.25);
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

.rank-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.rank-title {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 12px var(--color-glow);
}

.cloud-card {
  display: flex;
  flex-direction: column;
}

.cloud-box {
  width: 100%;
  height: 420px;
  flex-shrink: 0;
}

/* 排行榜：有限空间内最清晰的横向条形对比 */
.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 4px;
  border-radius: var(--radius-sm);
  transition: background 0.2s ease;
}

.rank-row:hover {
  background: var(--color-glass);
}

.rank-badge {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-text-secondary) 12%, transparent);
  border: 1px solid transparent;
}

.rank-badge.rank-1 {
  color: #1a1200;
  background: linear-gradient(135deg, #ffd76a, #ffb020);
  box-shadow: 0 0 12px rgba(255, 176, 32, 0.5);
}

.rank-badge.rank-2 {
  color: #0e1418;
  background: linear-gradient(135deg, #e8ecf2, #b9c3d0);
  box-shadow: 0 0 10px rgba(185, 195, 208, 0.4);
}

.rank-badge.rank-3 {
  color: #1c0e06;
  background: linear-gradient(135deg, #e9b08a, #c9804a);
  box-shadow: 0 0 10px rgba(201, 128, 74, 0.4);
}

.rank-word {
  flex-shrink: 0;
  width: 140px;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row.is-top .rank-word {
  font-weight: 600;
  color: var(--color-primary);
  text-shadow: 0 0 8px var(--color-glow);
}

.rank-bar-wrap {
  flex: 1;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-border) 45%, transparent);
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 8px var(--color-glow);
  opacity: 0.7;
  transition: width 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.rank-bar--top {
  opacity: 1;
  box-shadow: 0 0 12px var(--color-glow), inset 0 0 6px rgba(255, 255, 255, 0.3);
}

.rank-count {
  flex-shrink: 0;
  width: 80px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
