<template>
  <div class="date-picker" :class="{ 'date-picker--open': open, 'date-picker--disabled': disabled }">
    <button
      type="button"
      class="date-trigger"
      :class="{ 'date-trigger--filled': !!modelValue }"
      :disabled="disabled"
      ref="triggerRef"
      @click="toggle"
    >
      <AppIcon name="lucide:calendar" :size="15" class="date-trigger-icon" />
      <span class="date-trigger-text" :class="{ 'date-trigger-text--placeholder': !modelValue }">
        {{ modelValue ? formatDisplay(modelValue) : (placeholder || '') }}
      </span>
      <span
        v-if="modelValue && !disabled"
        class="date-trigger-clear"
        title="清除"
        @click.stop="clearValue"
        @mousedown.prevent
      >
        <AppIcon name="lucide:x" :size="14" />
      </span>
      <span class="date-trigger-caret">
        <AppIcon name="lucide:chevron-down" :size="14" />
      </span>
    </button>

    <Teleport to="body">
      <Transition name="dp-fade">
        <div v-if="open" class="date-backdrop" @mousedown.prevent @click="close"></div>
      </Transition>
      <Transition name="dp-pop">
        <div
          v-if="open"
          ref="panelRef"
          class="date-panel liquid-edge"
          :style="panelStyle"
          role="dialog"
          aria-label="date picker"
        >
          <div class="dp-header">
            <template v-if="viewMode === 'date'">
              <button type="button" class="dp-nav" :title="prevYearTitle" @click="prevYear">
                <AppIcon name="lucide:chevrons-left" :size="15" />
              </button>
              <button type="button" class="dp-nav" :title="prevMonthTitle" @click="prevMonth">
                <AppIcon name="lucide:chevron-left" :size="15" />
              </button>
            </template>
            <button v-if="viewMode === 'year'" type="button" class="dp-nav" @click="prevPanel">
              <AppIcon name="lucide:chevron-left" :size="15" />
            </button>

            <div class="dp-title">
              <template v-if="viewMode === 'date'">
                <span class="dp-title-clickable" @click="viewMode = 'year'">{{ viewYear }}</span>
                <span class="dp-title-sep">{{ isZh ? '年' : '' }}</span>
                <span class="dp-title-clickable" @click="viewMode = 'month'">{{ viewMonth + 1 }}{{ isZh ? '月' : monthNamesShort[viewMonth] }}</span>
              </template>
              <template v-else-if="viewMode === 'month'">
                <span class="dp-title-clickable" @click="viewMode = 'year'">{{ viewYear }}{{ isZh ? '年' : '' }}</span>
              </template>
              <template v-else>
                <span>{{ decadeStart }}-{{ decadeStart + 9 }}</span>
              </template>
            </div>

            <template v-if="viewMode === 'date'">
              <button type="button" class="dp-nav" :title="nextMonthTitle" @click="nextMonth">
                <AppIcon name="lucide:chevron-right" :size="15" />
              </button>
              <button type="button" class="dp-nav" :title="nextYearTitle" @click="nextYear">
                <AppIcon name="lucide:chevrons-right" :size="15" />
              </button>
            </template>
            <button v-if="viewMode === 'year'" type="button" class="dp-nav" @click="nextPanel">
              <AppIcon name="lucide:chevron-right" :size="15" />
            </button>
          </div>

          <!-- 日期面板 -->
          <template v-if="viewMode === 'date'">
            <div class="dp-weekdays">
              <span v-for="w in weekdays" :key="w" class="dp-weekday">{{ w }}</span>
            </div>
            <div class="dp-grid">
              <button
                v-for="cell in cells"
                :key="cell.key"
                type="button"
                class="dp-cell"
                :class="{
                  'dp-cell--muted': !cell.inMonth,
                  'dp-cell--today': cell.isToday,
                  'dp-cell--selected': cell.isSelected,
                  'dp-cell--disabled': cell.disabled
                }"
                :disabled="cell.disabled"
                @click="pick(cell)"
              >
                {{ cell.day }}
              </button>
            </div>
          </template>

          <!-- 月份面板 -->
          <template v-else-if="viewMode === 'month'">
            <div class="dp-month-grid">
              <button
                v-for="(m, i) in monthNames"
                :key="i"
                type="button"
                class="dp-month-cell"
                :class="{
                  'dp-month-cell--selected': selectedMonth === i,
                  'dp-month-cell--current': i === today.getMonth() && viewYear === today.getFullYear()
                }"
                @click="selectMonth(i)"
              >{{ m }}</button>
            </div>
          </template>

          <!-- 年份面板 -->
          <template v-else>
            <div class="dp-year-grid">
              <button
                v-for="y in yearList"
                :key="y"
                type="button"
                class="dp-year-cell"
                :class="{
                  'dp-year-cell--muted': y < decadeStart || y > decadeStart + 9,
                  'dp-year-cell--selected': selectedYear === y,
                  'dp-year-cell--current': y === today.getFullYear()
                }"
                @click="selectYear(y)"
              >{{ y }}</button>
            </div>
          </template>

          <div class="dp-footer">
            <template v-if="showTime">
              <div class="dp-time">
                <div class="dp-time-col">
                  <span class="dp-time-label">{{ $t('datePicker.hour') }}</span>
                  <div class="dp-time-input-wrap">
                    <button type="button" class="dp-time-btn" @click="adjustTime('hour', 1)">▲</button>
                    <input
                      v-model.number="tempHour"
                      type="number"
                      class="dp-time-input"
                      min="0"
                      max="23"
                      @blur="clampTime"
                    />
                    <button type="button" class="dp-time-btn" @click="adjustTime('hour', -1)">▼</button>
                  </div>
                </div>
                <span class="dp-time-sep">:</span>
                <div class="dp-time-col">
                  <span class="dp-time-label">{{ $t('datePicker.minute') }}</span>
                  <div class="dp-time-input-wrap">
                    <button type="button" class="dp-time-btn" @click="adjustTime('minute', 1)">▲</button>
                    <input
                      v-model.number="tempMinute"
                      type="number"
                      class="dp-time-input"
                      min="0"
                      max="59"
                      @blur="clampTime"
                    />
                    <button type="button" class="dp-time-btn" @click="adjustTime('minute', -1)">▼</button>
                  </div>
                </div>
                <span class="dp-time-sep">:</span>
                <div class="dp-time-col">
                  <span class="dp-time-label">{{ $t('datePicker.second') }}</span>
                  <div class="dp-time-input-wrap">
                    <button type="button" class="dp-time-btn" @click="adjustTime('second', 1)">▲</button>
                    <input
                      v-model.number="tempSecond"
                      type="number"
                      class="dp-time-input"
                      min="0"
                      max="59"
                      @blur="clampTime"
                    />
                    <button type="button" class="dp-time-btn" @click="adjustTime('second', -1)">▼</button>
                  </div>
                </div>
              </div>
              <div class="dp-time-actions">
                <button type="button" class="dp-foot-btn dp-foot-btn--clear" :disabled="!modelValue" @click="clear">
                  {{ $t('datePicker.clear') }}
                </button>
                <button type="button" class="dp-foot-btn dp-foot-btn--today" @click="goToday">
                  {{ $t('datePicker.today') }}
                </button>
                <button type="button" class="dp-foot-btn dp-foot-btn--confirm" @click="confirmDateTime">
                  {{ $t('datePicker.confirm') }}
                </button>
              </div>
            </template>
            <template v-else>
              <button type="button" class="dp-foot-btn dp-foot-btn--today" @click="goToday">
                {{ $t('datePicker.today') }}
              </button>
              <button
                type="button"
                class="dp-foot-btn dp-foot-btn--clear"
                :disabled="!modelValue"
                @click="clear"
              >
                {{ $t('datePicker.clear') }}
              </button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    min?: string
    max?: string
    disabled?: boolean
    showTime?: boolean
  }>(),
  { modelValue: '', placeholder: '', min: '', max: '', disabled: false, showTime: false }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const { locale, t } = useI18n()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const viewYear = ref(0)
const viewMonth = ref(0)
const viewMode = ref<'date' | 'month' | 'year'>('date')
const tempHour = ref(0)
const tempMinute = ref(0)
const tempSecond = ref(0)

const today = new Date()
today.setHours(0, 0, 0, 0)

const selected = computed(() => {
  if (!props.modelValue) return null
  const d = parseDateTime(props.modelValue)
  return d
})

const maxDate = computed(() => parseDate(props.max))
const minDate = computed(() => parseDate(props.min))

function parseDateTime(v: string): Date | null {
  if (!v) return null
  const normalized = v.includes('T') ? v : v.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseDate(v: string): Date | null {
  if (!v) return null
  const d = parseDateTime(v)
  if (d) d.setHours(0, 0, 0, 0)
  return d
}

const isZh = computed(() => String(locale.value).toLowerCase().startsWith('zh'))

const weekdays = computed(() =>
  isZh.value ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
)

const monthNames = computed(() =>
  isZh.value
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
)

const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const decadeStart = computed(() => Math.floor(viewYear.value / 10) * 10)

const selectedYear = computed(() => (selected.value ? selected.value.getFullYear() : null))
const selectedMonth = computed(() => (selected.value ? selected.value.getMonth() : null))

const yearList = computed(() => {
  const start = decadeStart.value - 1
  return Array.from({ length: 12 }, (_, i) => start + i)
})

const prevYearTitle = computed(() => t('datePicker.prevYear'))
const nextYearTitle = computed(() => t('datePicker.nextYear'))
const prevMonthTitle = computed(() => t('datePicker.prevMonth'))
const nextMonthTitle = computed(() => t('datePicker.nextMonth'))

const syncView = () => {
  const d = selected.value ?? today
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  viewMode.value = 'date'
  if (props.showTime && selected.value) {
    tempHour.value = selected.value.getHours()
    tempMinute.value = selected.value.getMinutes()
    tempSecond.value = selected.value.getSeconds()
  } else {
    tempHour.value = 0
    tempMinute.value = 0
    tempSecond.value = 0
  }
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

interface Cell {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  disabled: boolean
  year: number
  month: number
}

const cells = computed<Cell[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const out: Cell[] = []

  const build = (y: number, m: number, day: number, inMonth: boolean): Cell => {
    const d = new Date(y, m, day)
    d.setHours(0, 0, 0, 0)
    let disabled = false
    if (maxDate.value && d.getTime() > maxDate.value.getTime()) disabled = true
    if (minDate.value && d.getTime() < minDate.value.getTime()) disabled = true
    return {
      key: `${y}-${m}-${day}`,
      day,
      inMonth,
      isToday: d.getTime() === today.getTime(),
      isSelected: !!selected.value && d.getTime() === selected.value.getTime(),
      disabled,
      year: y,
      month: m
    }
  }

  const start = firstWeekday === 0 ? -6 : 1 - firstWeekday
  const end = start + 41
  for (let i = start; i <= end; i++) {
    if (i < 1) {
      out.push(build(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, prevDays + i, false))
    } else if (i > daysInMonth) {
      out.push(build(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i - daysInMonth, false))
    } else {
      out.push(build(year, month, i, true))
    }
  }
  return out
})

const PANEL_WIDTH = 292
const PANEL_WIDTH_TIME = 320
const GAP = 8

const reposition = () => {
  const trig = triggerRef.value
  if (!trig) return
  const rect = trig.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const panelW = props.showTime ? PANEL_WIDTH_TIME : PANEL_WIDTH
  const panelH = props.showTime ? 440 : 340
  const left = Math.min(Math.max(GAP, rect.left), vw - panelW - GAP)

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
  panelStyle.value = { top: `${top}px`, left: `${left}px`, width: `${panelW}px`, maxHeight: `${maxHeight}px` }
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
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

const prevYear = () => {
  viewYear.value -= 1
}

const nextYear = () => {
  viewYear.value += 1
}

const selectMonth = (m: number) => {
  viewMonth.value = m
  viewMode.value = 'date'
}

const selectYear = (y: number) => {
  viewYear.value = y
  viewMode.value = 'month'
}

const prevPanel = () => {
  if (viewMode.value === 'month') {
    viewYear.value -= 1
  } else if (viewMode.value === 'year') {
    viewYear.value -= 10
  }
}

const nextPanel = () => {
  if (viewMode.value === 'month') {
    viewYear.value += 1
  } else if (viewMode.value === 'year') {
    viewYear.value += 10
  }
}

const goToday = () => {
  emit('update:modelValue', toISODate(today))
  open.value = false
}

const clear = () => {
  emit('update:modelValue', '')
  open.value = false
}

const clearValue = () => {
  emit('update:modelValue', '')
  open.value = false
}

const pick = (cell: Cell) => {
  if (cell.disabled) return
  const d = new Date(cell.year, cell.month, cell.day)
  if (props.showTime) {
    d.setHours(tempHour.value, tempMinute.value, tempSecond.value, 0)
    viewYear.value = cell.year
    viewMonth.value = cell.month
    return
  }
  emit('update:modelValue', toISODate(d))
  open.value = false
}

function adjustTime(field: 'hour' | 'minute' | 'second', delta: number) {
  if (field === 'hour') {
    tempHour.value = (tempHour.value + delta + 24) % 24
  } else if (field === 'minute') {
    tempMinute.value = (tempMinute.value + delta + 60) % 60
  } else {
    tempSecond.value = (tempSecond.value + delta + 60) % 60
  }
}

function clampTime() {
  tempHour.value = Math.max(0, Math.min(23, Math.floor(tempHour.value) || 0))
  tempMinute.value = Math.max(0, Math.min(59, Math.floor(tempMinute.value) || 0))
  tempSecond.value = Math.max(0, Math.min(59, Math.floor(tempSecond.value) || 0))
}

function confirmDateTime() {
  clampTime()
  const d = new Date(viewYear.value, viewMonth.value, 1)
  const selectedCell = cells.value.find((c) => c.isSelected && c.inMonth)
  const day = selectedCell ? selectedCell.day : 1
  d.setFullYear(viewYear.value, viewMonth.value, day)
  d.setHours(tempHour.value, tempMinute.value, tempSecond.value, 0)
  emit('update:modelValue', toISODate(d))
  open.value = false
}

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (props.showTime) {
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  return date
}

function formatDisplay(v: string): string {
  return v
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
.date-picker {
  position: relative;
  min-width: 0;
  width: 100%;
}

.date-trigger {
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

.date-trigger:hover:not(:disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.date-trigger-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.date-trigger-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-trigger-text--placeholder {
  color: var(--color-text-secondary);
  opacity: 0.75;
}

.date-trigger-caret {
  display: flex;
  color: var(--color-text-secondary);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.date-trigger-clear {
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

.date-trigger:hover .date-trigger-clear {
  display: flex;
}

.date-trigger:hover .date-trigger-clear + .date-trigger-caret {
  display: none;
}

.date-trigger-clear:hover {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.date-picker--open .date-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-glow), inset 0 0 10px var(--color-glow);
}

.date-picker--open .date-trigger-caret {
  transform: rotate(180deg);
  color: var(--color-primary);
}

.date-picker--disabled .date-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2150;
}

.date-panel {
  position: fixed;
  z-index: 2151;
  width: 292px;
  padding: 14px;
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

.date-panel::-webkit-scrollbar {
  width: 4px;
}

.date-panel::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 2px;
  opacity: 0.5;
}

.date-panel::-webkit-scrollbar-track {
  background: transparent;
}

.dp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 10px;
}

.dp-title {
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

.dp-title-clickable {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: var(--transition-fast);
}

.dp-title-clickable:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.dp-title-sep {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.dp-nav {
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

.dp-nav:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
}

.dp-weekday {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  padding: 4px 0;
}

.dp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.dp-cell {
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
}

.dp-cell:hover:not(:disabled):not(.dp-cell--selected) {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.dp-cell--muted {
  color: var(--color-text-secondary);
  opacity: 0.45;
}

.dp-cell--today {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
  box-shadow: inset 0 0 8px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.dp-cell--selected {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 12px var(--color-glow);
}

.dp-cell--disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dp-cell--disabled:hover {
  border-color: transparent;
  box-shadow: none;
}

.dp-month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 0;
}

.dp-month-cell {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.dp-month-cell:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.dp-month-cell--current {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
}

.dp-month-cell--selected {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 14px var(--color-glow);
}

.dp-year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 0;
}

.dp-year-cell {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.dp-year-cell:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.dp-year-cell--muted {
  color: var(--color-text-secondary);
  opacity: 0.35;
}

.dp-year-cell--current {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  color: var(--color-primary);
}

.dp-year-cell--selected {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 14px var(--color-glow);
}

.dp-footer {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.dp-foot-btn {
  flex: 1;
  height: 30px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.dp-foot-btn--today {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
}

.dp-foot-btn--today:hover {
  box-shadow: 0 0 10px var(--color-glow);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.dp-foot-btn--clear {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
}

.dp-foot-btn--clear:hover:not(:disabled) {
  color: #ff5b6a;
  border-color: rgba(255, 77, 94, 0.5);
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.35);
}

.dp-foot-btn--clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dp-foot-btn--confirm {
  border: 1px solid var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-weight: 600;
}

.dp-foot-btn--confirm:hover {
  box-shadow: 0 0 14px var(--color-glow);
}

.dp-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0;
}

.dp-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dp-time-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.dp-time-input-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.dp-time-input {
  width: 44px;
  height: 28px;
  text-align: center;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: var(--transition-fast);
  -moz-appearance: textfield;
}

.dp-time-input::-webkit-outer-spin-button,
.dp-time-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.dp-time-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.dp-time-btn {
  width: 28px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 8px;
  cursor: pointer;
  transition: var(--transition-fast);
  padding: 0;
}

.dp-time-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 6px var(--color-glow);
}

.dp-time-sep {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 8px var(--color-glow);
  padding-bottom: 14px;
}

.dp-time-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.dp-time-actions .dp-foot-btn {
  flex: 1;
  height: 28px;
  font-size: 11px;
}

.dp-fade-enter-active,
.dp-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dp-fade-enter-from,
.dp-fade-leave-to {
  opacity: 0;
}

.dp-pop-enter-active,
.dp-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dp-pop-enter-from,
.dp-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
