<template>
  <div class="range-picker" :class="{ 'range-picker--open': open, 'range-picker--disabled': disabled }">
    <button
      type="button"
      class="range-trigger"
      :class="{ 'range-trigger--filled': hasValue }"
      :disabled="disabled"
      ref="triggerRef"
      @click="toggle"
    >
      <AppIcon name="lucide:calendar-range" :size="15" class="range-trigger-icon" />
      <span class="range-trigger-text" :class="{ 'range-trigger-text--placeholder': !hasValue }">
        {{ displayText }}
      </span>
      <span
        v-if="hasValue && !disabled"
        class="range-trigger-clear"
        title="清除"
        @click.stop="clearValue"
        @mousedown.prevent
      >
        <AppIcon name="lucide:x" :size="14" />
      </span>
      <span class="range-trigger-caret">
        <AppIcon name="lucide:chevron-down" :size="14" />
      </span>
    </button>

    <Teleport to="body">
      <Transition name="rp-fade">
        <div v-if="open" class="range-backdrop" @mousedown.prevent @click="close"></div>
      </Transition>
      <Transition name="rp-pop">
        <div
          v-if="open"
          ref="panelRef"
          class="range-panel liquid-edge"
          :style="panelStyle"
          role="dialog"
          aria-label="date range picker"
        >
          <div class="rp-panels">
            <!-- 左侧日历 -->
            <div class="rp-cal">
              <div class="rp-header">
                <template v-if="viewMode === 'date'">
                  <button type="button" class="rp-nav" :title="$t('datePicker.prevYear')" @click="prevYear">
                    <AppIcon name="lucide:chevrons-left" :size="15" />
                  </button>
                  <button type="button" class="rp-nav" :title="$t('datePicker.prevMonth')" @click="prevMonth">
                    <AppIcon name="lucide:chevron-left" :size="15" />
                  </button>
                </template>
                <button v-if="viewMode === 'year'" type="button" class="rp-nav" @click="prevPanel">
                  <AppIcon name="lucide:chevron-left" :size="15" />
                </button>
                <div class="rp-title">
                  <template v-if="viewMode === 'date'">
                    <span class="rp-title-clickable" @click="viewMode = 'year'">{{ leftViewYear }}</span>
                    <span class="rp-title-sep">{{ isZh ? '年' : '' }}</span>
                    <span class="rp-title-clickable" @click="viewMode = 'month'">{{ leftViewMonth + 1 }}{{ isZh ? '月' : monthNamesShort[leftViewMonth] }}</span>
                  </template>
                  <template v-else-if="viewMode === 'month'">
                    <span class="rp-title-clickable" @click="viewMode = 'year'">{{ leftViewYear }}{{ isZh ? '年' : '' }}</span>
                  </template>
                  <template v-else>
                    <span>{{ decadeStart }}-{{ decadeStart + 9 }}</span>
                  </template>
                </div>
              </div>
              <template v-if="viewMode === 'date'">
                <div class="rp-weekdays">
                  <span v-for="w in weekdays" :key="'l'+w" class="rp-weekday">{{ w }}</span>
                </div>
                <div class="rp-grid">
                  <button
                    v-for="cell in leftCells"
                    :key="'l'+cell.key"
                    type="button"
                    class="rp-cell"
                    :class="getCellClass(cell)"
                    :disabled="cell.disabled"
                    @click="pick(cell)"
                    @mouseenter="hoverCell(cell)"
                    @mouseleave="hoverDate = null"
                  >
                    {{ cell.day }}
                  </button>
                </div>
              </template>
              <template v-else-if="viewMode === 'month'">
                <div class="rp-month-grid">
                  <button
                    v-for="(m, i) in monthNames"
                    :key="'l'+i"
                    type="button"
                    class="rp-month-cell"
                    :class="{
                      'rp-month-cell--selected': selectedMonth === i,
                      'rp-month-cell--current': i === today.getMonth() && leftViewYear === today.getFullYear()
                    }"
                    @click="selectMonth(i)"
                  >{{ m }}</button>
                </div>
              </template>
              <template v-else>
                <div class="rp-year-grid">
                  <button
                    v-for="y in yearList"
                    :key="'l'+y"
                    type="button"
                    class="rp-year-cell"
                    :class="{
                      'rp-year-cell--muted': y < decadeStart || y > decadeStart + 9,
                      'rp-year-cell--selected': selectedYear === y,
                      'rp-year-cell--current': y === today.getFullYear()
                    }"
                    @click="selectYear(y)"
                  >{{ y }}</button>
                </div>
              </template>
            </div>

            <!-- 分隔线 -->
            <div class="rp-divider"></div>

            <!-- 右侧日历 -->
            <div class="rp-cal">
              <div class="rp-header">
                <div class="rp-title">
                  <template v-if="viewMode === 'date'">
                    <span class="rp-title-clickable" @click="viewMode = 'year'">{{ rightViewYear }}</span>
                    <span class="rp-title-sep">{{ isZh ? '年' : '' }}</span>
                    <span class="rp-title-clickable" @click="viewMode = 'month'">{{ rightViewMonth + 1 }}{{ isZh ? '月' : monthNamesShort[rightViewMonth] }}</span>
                  </template>
                  <template v-else-if="viewMode === 'month'">
                    <span class="rp-title-clickable" @click="viewMode = 'year'">{{ rightViewYear }}{{ isZh ? '年' : '' }}</span>
                  </template>
                  <template v-else>
                    <span>{{ decadeStart }}-{{ decadeStart + 9 }}</span>
                  </template>
                </div>
                <template v-if="viewMode === 'date'">
                  <button type="button" class="rp-nav" :title="$t('datePicker.nextMonth')" @click="nextMonth">
                    <AppIcon name="lucide:chevron-right" :size="15" />
                  </button>
                  <button type="button" class="rp-nav" :title="$t('datePicker.nextYear')" @click="nextYear">
                    <AppIcon name="lucide:chevrons-right" :size="15" />
                  </button>
                </template>
                <button v-if="viewMode === 'year'" type="button" class="rp-nav" @click="nextPanel">
                  <AppIcon name="lucide:chevron-right" :size="15" />
                </button>
              </div>
              <template v-if="viewMode === 'date'">
                <div class="rp-weekdays">
                  <span v-for="w in weekdays" :key="'r'+w" class="rp-weekday">{{ w }}</span>
                </div>
                <div class="rp-grid">
                  <button
                    v-for="cell in rightCells"
                    :key="'r'+cell.key"
                    type="button"
                    class="rp-cell"
                    :class="getCellClass(cell)"
                    :disabled="cell.disabled"
                    @click="pick(cell)"
                    @mouseenter="hoverCell(cell)"
                    @mouseleave="hoverDate = null"
                  >
                    {{ cell.day }}
                  </button>
                </div>
              </template>
              <template v-else-if="viewMode === 'month'">
                <div class="rp-month-grid">
                  <button
                    v-for="(m, i) in monthNames"
                    :key="'r'+i"
                    type="button"
                    class="rp-month-cell"
                    :class="{
                      'rp-month-cell--selected': selectedMonth === i,
                      'rp-month-cell--current': i === today.getMonth() && rightViewYear === today.getFullYear()
                    }"
                    @click="selectMonth(i)"
                  >{{ m }}</button>
                </div>
              </template>
              <template v-else>
                <div class="rp-year-grid">
                  <button
                    v-for="y in yearList"
                    :key="'r'+y"
                    type="button"
                    class="rp-year-cell"
                    :class="{
                      'rp-year-cell--muted': y < decadeStart || y > decadeStart + 9,
                      'rp-year-cell--selected': selectedYear === y,
                      'rp-year-cell--current': y === today.getFullYear()
                    }"
                    @click="selectYear(y)"
                  >{{ y }}</button>
                </div>
              </template>
            </div>
          </div>

          <div class="rp-footer">
            <button type="button" class="rp-foot-btn rp-foot-btn--today" @click="goToday">
              {{ $t('datePicker.today') }}
            </button>
            <span class="rp-selection-hint">
              {{ selecting === 'start' ? $t('datePicker.startDate') : $t('datePicker.endDate') }}
            </span>
            <button type="button" class="rp-foot-btn rp-foot-btn--clear" :disabled="!hasValue" @click="clear">
              {{ $t('datePicker.clear') }}
            </button>
            <button type="button" class="rp-foot-btn rp-foot-btn--confirm" :disabled="!canConfirm" @click="confirm">
              {{ $t('datePicker.confirm') }}
            </button>
          </div>

          <div class="rp-scanline"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'

interface RangeValue {
  start: string
  end: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: RangeValue | null
    placeholder?: string
    disabled?: boolean
  }>(),
  { modelValue: null, placeholder: '', disabled: false }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: RangeValue | null): void }>()

const { locale, t } = useI18n()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const selecting = ref<'start' | 'end'>('start')
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const hoverDate = ref<Date | null>(null)

const leftViewYear = ref(0)
const leftViewMonth = ref(0)
const viewMode = ref<'date' | 'month' | 'year'>('date')

const today = new Date()
today.setHours(0, 0, 0, 0)

const isZh = computed(() => String(locale.value).toLowerCase().startsWith('zh'))

const weekdays = computed(() =>
  isZh.value ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
)

const hasValue = computed(() => !!(props.modelValue?.start && props.modelValue?.end))

const canConfirm = computed(() => !!(startDate.value && endDate.value))

const displayText = computed(() => {
  if (!props.modelValue?.start || !props.modelValue?.end) {
    return props.placeholder || `${t('datePicker.startPlaceholder')} ~ ${t('datePicker.endPlaceholder')}`
  }
  return `${props.modelValue.start} ~ ${props.modelValue.end}`
})

const leftHeaderTitle = computed(() => {
  if (isZh.value) return `${leftViewYear.value} 年 ${leftViewMonth.value + 1} 月`
  const d = new Date(leftViewYear.value, leftViewMonth.value, 1)
  return d.toLocaleDateString(String(locale.value), { year: 'numeric', month: 'long' })
})

const monthNames = computed(() =>
  isZh.value
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
)

const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const decadeStart = computed(() => Math.floor(leftViewYear.value / 10) * 10)

const selectedYear = computed(() => (startDate.value ? startDate.value.getFullYear() : null))
const selectedMonth = computed(() => (startDate.value ? startDate.value.getMonth() : null))

const yearList = computed(() => {
  const start = decadeStart.value - 1
  return Array.from({ length: 12 }, (_, i) => start + i)
})

const rightViewYear = computed(() => (leftViewMonth.value === 11 ? leftViewYear.value + 1 : leftViewYear.value))
const rightViewMonth = computed(() => (leftViewMonth.value + 1) % 12)

const rightHeaderTitle = computed(() => {
  if (isZh.value) return `${rightViewYear.value} 年 ${rightViewMonth.value + 1} 月`
  const d = new Date(rightViewYear.value, rightViewMonth.value, 1)
  return d.toLocaleDateString(String(locale.value), { year: 'numeric', month: 'long' })
})

interface Cell {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  isStart: boolean
  isEnd: boolean
  inRange: boolean
  rangeStart: boolean
  rangeEnd: boolean
  disabled: boolean
  date: Date
}

function buildCells(year: number, month: number): Cell[] {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const out: Cell[] = []

  const start = firstWeekday === 0 ? -6 : 1 - firstWeekday
  const end = start + 41

  for (let i = start; i <= end; i++) {
    let y = year
    let m = month
    let day = i
    let inMonth = true
    if (i < 1) {
      m = month === 0 ? 11 : month - 1
      y = month === 0 ? year - 1 : year
      day = prevDays + i
      inMonth = false
    } else if (i > daysInMonth) {
      m = month === 11 ? 0 : month + 1
      y = month === 11 ? year + 1 : year
      day = i - daysInMonth
      inMonth = false
    }
    const d = new Date(y, m, day)
    d.setHours(0, 0, 0, 0)
    out.push({
      key: `${y}-${m}-${day}`,
      day,
      inMonth,
      isToday: d.getTime() === today.getTime(),
      isStart: !!startDate.value && d.getTime() === startDate.value.getTime(),
      isEnd: !!endDate.value && d.getTime() === endDate.value.getTime(),
      inRange: isInRange(d),
      rangeStart: isRangeEdge(d, 'start'),
      rangeEnd: isRangeEdge(d, 'end'),
      disabled: false,
      date: d
    })
  }
  return out
}

function isInRange(d: Date): boolean {
  const s = startDate.value
  const e = endDate.value || hoverDate.value
  if (!s || !e) return false
  const t = d.getTime()
  const st = s.getTime()
  const et = e.getTime()
  return t > Math.min(st, et) && t < Math.max(st, et)
}

function isRangeEdge(d: Date, edge: 'start' | 'end'): boolean {
  const s = startDate.value
  const e = endDate.value || hoverDate.value
  if (!s || !e) return false
  const t = d.getTime()
  const st = s.getTime()
  const et = e.getTime()
  if (edge === 'start') return t === Math.min(st, et)
  return t === Math.max(st, et)
}

const leftCells = computed(() => buildCells(leftViewYear.value, leftViewMonth.value))
const rightCells = computed(() => buildCells(rightViewYear.value, rightViewMonth.value))

function getCellClass(cell: Cell) {
  return {
    'rp-cell--muted': !cell.inMonth,
    'rp-cell--today': cell.isToday,
    'rp-cell--start': cell.isStart,
    'rp-cell--end': cell.isEnd,
    'rp-cell--in-range': cell.inRange,
    'rp-cell--range-start': cell.rangeStart && !cell.isStart,
    'rp-cell--range-end': cell.rangeEnd && !cell.isEnd,
    'rp-cell--disabled': cell.disabled
  }
}

function hoverCell(cell: Cell) {
  if (selecting.value === 'end' && startDate.value) {
    hoverDate.value = cell.date
  }
}

function pick(cell: Cell) {
  if (cell.disabled) return
  const d = cell.date
  if (selecting.value === 'start') {
    startDate.value = d
    endDate.value = null
    hoverDate.value = null
    selecting.value = 'end'
  } else {
    if (startDate.value && d.getTime() < startDate.value.getTime()) {
      endDate.value = startDate.value
      startDate.value = d
    } else {
      endDate.value = d
    }
    hoverDate.value = null
  }
}

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDate(v: string): Date | null {
  if (!v) return null
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const syncView = () => {
  const d = parseDate(props.modelValue?.start || '') ?? today
  leftViewYear.value = d.getFullYear()
  leftViewMonth.value = d.getMonth()
  viewMode.value = 'date'
  startDate.value = parseDate(props.modelValue?.start || '')
  endDate.value = parseDate(props.modelValue?.end || '')
  selecting.value = 'start'
  hoverDate.value = null
}

watch(
  () => props.modelValue,
  () => {
    if (open.value) syncView()
  }
)

watch(open, (v) => {
  if (v) {
    syncView()
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', reposition)
  } else {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', reposition)
  }
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

const PANEL_WIDTH = 600
const GAP = 8

const reposition = () => {
  const trig = triggerRef.value
  if (!trig) return
  const rect = trig.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const panelH = 400
  const left = Math.min(Math.max(GAP, rect.left), vw - PANEL_WIDTH - GAP)

  // 优先向下展开
  let top = rect.bottom + GAP
  // 向下空间不够，向上展开
  if (top + panelH > vh - GAP) {
    top = rect.top - GAP - panelH
  }
  // 向上也不够，贴顶显示
  if (top < GAP) {
    top = GAP
  }
  const maxHeight = vh - GAP * 2
  panelStyle.value = { top: `${top}px`, left: `${left}px`, maxHeight: `${maxHeight}px` }
}

const toggle = () => {
  if (!props.disabled) {
    open.value = !open.value
    if (open.value) nextTick(reposition)
  }
}

const close = () => {
  open.value = false
}

const prevMonth = () => {
  if (leftViewMonth.value === 0) {
    leftViewMonth.value = 11
    leftViewYear.value -= 1
  } else {
    leftViewMonth.value -= 1
  }
}

const nextMonth = () => {
  if (leftViewMonth.value === 11) {
    leftViewMonth.value = 0
    leftViewYear.value += 1
  } else {
    leftViewMonth.value += 1
  }
}

const prevYear = () => {
  leftViewYear.value -= 1
}

const nextYear = () => {
  leftViewYear.value += 1
}

const selectMonth = (m: number) => {
  leftViewMonth.value = m
  viewMode.value = 'date'
}

const selectYear = (y: number) => {
  leftViewYear.value = y
  viewMode.value = 'month'
}

const prevPanel = () => {
  if (viewMode.value === 'month') {
    leftViewYear.value -= 1
  } else if (viewMode.value === 'year') {
    leftViewYear.value -= 10
  }
}

const nextPanel = () => {
  if (viewMode.value === 'month') {
    leftViewYear.value += 1
  } else if (viewMode.value === 'year') {
    leftViewYear.value += 10
  }
}

const goToday = () => {
  startDate.value = new Date(today)
  endDate.value = new Date(today)
  selecting.value = 'start'
}

const clear = () => {
  startDate.value = null
  endDate.value = null
  hoverDate.value = null
  selecting.value = 'start'
  emit('update:modelValue', null)
  open.value = false
}

const clearValue = () => {
  startDate.value = null
  endDate.value = null
  hoverDate.value = null
  selecting.value = 'start'
  emit('update:modelValue', null)
  open.value = false
}

const confirm = () => {
  if (!startDate.value || !endDate.value) return
  emit('update:modelValue', {
    start: toISODate(startDate.value),
    end: toISODate(endDate.value)
  })
  open.value = false
}

onMounted(() => {
  syncView()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', reposition)
})
</script>

<style scoped>
.range-picker {
  position: relative;
  min-width: 0;
  width: 100%;
}

.range-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
  text-align: left;
}

.range-trigger:hover:not(:disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.range-trigger-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.range-trigger-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.range-trigger-text--placeholder {
  color: var(--color-text-secondary);
  opacity: 0.75;
}

.range-trigger-caret {
  display: flex;
  color: var(--color-text-secondary);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.range-trigger-clear {
  display: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
  flex-shrink: 0;
  margin-left: auto;
}

.range-trigger:hover .range-trigger-clear {
  display: flex;
}

.range-trigger:hover .range-trigger-clear + .range-trigger-caret {
  display: none;
}

.range-trigger-clear:hover {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.range-picker--open .range-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow), inset 0 0 10px var(--color-glow);
}

.range-picker--open .range-trigger-caret {
  transform: rotate(180deg);
  color: var(--color-primary);
}

.range-picker--disabled .range-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.range-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2150;
}

.range-panel {
  position: fixed;
  z-index: 2151;
  width: 600px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.5),
    0 0 32px var(--color-glow),
    inset 0 1px 0 var(--glass-edge);
  overflow-y: auto;
  overflow-x: hidden;
}

.range-panel::-webkit-scrollbar {
  width: 4px;
}

.range-panel::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 2px;
}

.range-panel::-webkit-scrollbar-track {
  background: transparent;
}

.rp-panels {
  display: flex;
  gap: 0;
}

.rp-cal {
  flex: 1;
  min-width: 0;
}

.rp-divider {
  width: 1px;
  background: var(--color-border);
  margin: 0 12px;
}

.rp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.rp-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text);
  text-shadow: 0 0 14px var(--color-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.rp-title-clickable {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: var(--transition-fast);
}

.rp-title-clickable:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.rp-title-sep {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.rp-nav {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.rp-nav:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.rp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
}

.rp-weekday {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  padding: 4px 0;
}

.rp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.rp-cell {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
  position: relative;
}

.rp-cell:hover:not(:disabled):not(.rp-cell--start):not(.rp-cell--end) {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.rp-cell--muted {
  color: var(--color-text-secondary);
  opacity: 0.4;
}

.rp-cell--today {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
}

.rp-cell--in-range {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-radius: 0;
  color: var(--color-text);
}

.rp-cell--range-start {
  border-radius: 8px 0 0 8px;
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.rp-cell--range-end {
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.rp-cell--start,
.rp-cell--end {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 12px var(--color-glow);
  border-radius: 8px;
  z-index: 1;
}

.rp-cell--disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.rp-month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px 4px;
}

.rp-month-cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.rp-month-cell:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.rp-month-cell--current {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
}

.rp-month-cell--selected {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 14px var(--color-glow);
}

.rp-year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px 4px;
}

.rp-year-cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.rp-year-cell:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.rp-year-cell--muted {
  color: var(--color-text-secondary);
  opacity: 0.35;
}

.rp-year-cell--current {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
}

.rp-year-cell--selected {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 14px var(--color-glow);
}

.rp-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.rp-selection-hint {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-primary);
  letter-spacing: 0.06em;
  text-shadow: 0 0 8px var(--color-glow);
}

.rp-foot-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
}

.rp-foot-btn--today {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
}

.rp-foot-btn--today:hover {
  box-shadow: 0 0 10px var(--color-glow);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.rp-foot-btn--clear {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
}

.rp-foot-btn--clear:hover:not(:disabled) {
  color: #ff5b6a;
  border-color: rgba(255, 77, 94, 0.5);
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.35);
}

.rp-foot-btn--clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rp-foot-btn--confirm {
  border: 1px solid var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-weight: 600;
}

.rp-foot-btn--confirm:hover:not(:disabled) {
  box-shadow: 0 0 14px var(--color-glow);
}

.rp-foot-btn--confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rp-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.6;
  animation: rp-scan 3s linear infinite;
  pointer-events: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

@keyframes rp-scan {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(380px); opacity: 0; }
}

.rp-fade-enter-active,
.rp-fade-leave-active {
  transition: opacity 0.2s ease;
}

.rp-fade-enter-from,
.rp-fade-leave-to {
  opacity: 0;
}

.rp-pop-enter-active,
.rp-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rp-pop-enter-from,
.rp-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
