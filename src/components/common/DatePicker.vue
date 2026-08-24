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
            <button type="button" class="dp-nav" :title="prevYearTitle" @click="prevYear">
              <AppIcon name="lucide:chevrons-left" :size="15" />
            </button>
            <button type="button" class="dp-nav" :title="prevMonthTitle" @click="prevMonth">
              <AppIcon name="lucide:chevron-left" :size="15" />
            </button>
            <div class="dp-title">{{ headerTitle }}</div>
            <button type="button" class="dp-nav" :title="nextMonthTitle" @click="nextMonth">
              <AppIcon name="lucide:chevron-right" :size="15" />
            </button>
            <button type="button" class="dp-nav" :title="nextYearTitle" @click="nextYear">
              <AppIcon name="lucide:chevrons-right" :size="15" />
            </button>
          </div>

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

          <div class="dp-footer">
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
  }>(),
  { modelValue: '', placeholder: '', min: '', max: '', disabled: false }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const { locale, t } = useI18n()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const viewYear = ref(0)
const viewMonth = ref(0)

const today = new Date()
today.setHours(0, 0, 0, 0)

const selected = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(`${props.modelValue}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
})

const maxDate = computed(() => parseDate(props.max))
const minDate = computed(() => parseDate(props.min))

function parseDate(v: string): Date | null {
  if (!v) return null
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const isZh = computed(() => String(locale.value).toLowerCase().startsWith('zh'))

const weekdays = computed(() =>
  isZh.value ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
)

const headerTitle = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  if (isZh.value) return `${viewYear.value} 年 ${viewMonth.value + 1} 月`
  return d.toLocaleDateString(String(locale.value), { year: 'numeric', month: 'long' })
})

const prevYearTitle = computed(() => t('datePicker.prevYear'))
const nextYearTitle = computed(() => t('datePicker.nextYear'))
const prevMonthTitle = computed(() => t('datePicker.prevMonth'))
const nextMonthTitle = computed(() => t('datePicker.nextMonth'))

const syncView = () => {
  const d = selected.value ?? today
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
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
const GAP = 8

const reposition = () => {
  const trig = triggerRef.value
  if (!trig) return
  const rect = trig.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(Math.max(GAP, rect.left), vw - PANEL_WIDTH - GAP)
  const below = rect.bottom + GAP
  const above = rect.top - GAP
  let top: number
  let bottom = ''
  if (below + 330 <= vh || below >= above) {
    top = below
  } else {
    top = 0
    bottom = `${vh - above}px`
  }
  panelStyle.value = { top: `${top}px`, left: `${left}px`, ...(bottom ? { bottom } : {}) }
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

const goToday = () => {
  emit('update:modelValue', toISODate(today))
  open.value = false
}

const clear = () => {
  emit('update:modelValue', '')
  open.value = false
}

const pick = (cell: Cell) => {
  if (cell.disabled) return
  emit('update:modelValue', toISODate(new Date(cell.year, cell.month, cell.day)))
  open.value = false
}

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDisplay(v: string): string {
  const d = new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
