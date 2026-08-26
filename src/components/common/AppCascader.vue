<template>
  <div
    ref="rootRef"
    class="app-cascader"
    :class="[
      `app-cascader--${size}`,
      {
        'is-open': visible,
        'is-disabled': disabled,
        'is-focused': visible,
        'has-value': hasValue
      }
    ]"
  >
    <!-- 触发器 -->
    <button type="button" class="app-cascader__trigger" :disabled="disabled" @click="toggle">
      <span class="app-cascader__value" :class="{ placeholder: !hasValue }">
        {{ displayText }}
      </span>
      <span class="app-cascader__icons">
        <button
          v-if="clearable && hasValue && !disabled"
          type="button"
          class="app-cascader__clear"
          :title="$t('common.clear')"
          @click.stop="clearValue"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </button>
        <svg
          class="app-cascader__arrow"
          :class="{ rotated: visible }"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>

    <!-- 下拉面板 (Teleport to body) -->
    <Teleport to="body">
      <Transition :name="isMobile ? 'cascader-slide-up' : 'cascader-fade'">
        <div v-if="visible" class="app-cascader__dropdown" :class="{ 'app-cascader__dropdown--mobile': isMobile }" :style="dropdownStyle" @click.stop>
          <!-- 移动端遮罩 -->
          <div v-if="isMobile" class="app-cascader__mask" @click="close"></div>

          <div class="app-cascader__dropdown-body">
            <!-- 移动端顶部导航 -->
            <div v-if="isMobile" class="app-cascader__mobile-header">
              <button
                v-if="mobileLevel > 0"
                type="button"
                class="app-cascader__mobile-back"
                @click="mobileBack"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span class="app-cascader__mobile-title">{{ mobileTitle }}</span>
              <button type="button" class="app-cascader__mobile-close" @click="close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <!-- PC 端：多列级联面板 -->
            <div v-if="!isMobile" class="app-cascader__panels">
              <div v-for="(col, ci) in columns" :key="ci" class="app-cascader__panel">
                <div class="app-cascader__panel-list">
                  <button
                    v-for="item in col"
                    :key="item.code"
                    type="button"
                    class="app-cascader__option"
                    :class="{ active: isActive(ci, item) }"
                    @click="selectOption(ci, item)"
                    @mouseenter="onHover(ci, item)"
                  >
                    <span class="app-cascader__option-label">{{ item.name }}</span>
                    <svg
                      v-if="item.children?.length"
                      class="app-cascader__option-arrow"
                      viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <svg
                      v-else-if="isActive(ci, item)"
                      class="app-cascader__option-check"
                      viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 移动端：单列面板 -->
            <div v-else class="app-cascader__mobile-list">
              <button
                v-for="item in mobileColumns"
                :key="item.code"
                type="button"
                class="app-cascader__option"
                :class="{ active: isMobileActive(item) }"
                @click="mobileSelect(item)"
              >
                <span class="app-cascader__option-label">{{ item.name }}</span>
                <svg
                  v-if="item.children?.length"
                  class="app-cascader__option-arrow"
                  viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <svg
                  v-else-if="isMobileActive(item)"
                  class="app-cascader__option-check"
                  viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="!isMobile" class="app-cascader__scanline"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import regionData from '@/assets/maps/region-data.json'

const { t } = useI18n()

export interface CascaderValue {
  province: string
  city: string
  district: string
}

interface RegionNode {
  code: string
  name: string
  children?: RegionNode[]
}

type InputSize = 'small' | 'default' | 'large'

const props = withDefaults(
  defineProps<{
    modelValue: CascaderValue
    disabled?: boolean
    clearable?: boolean
    placeholder?: string
    size?: InputSize
    changeOnSelect?: boolean
  }>(),
  {
    disabled: false,
    clearable: true,
    placeholder: '',
    size: 'default',
    changeOnSelect: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: CascaderValue): void
  (e: 'change', v: CascaderValue): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const isMobile = ref(false)
const mobileLevel = ref(0)

const provinces = regionData as RegionNode[]

const hasValue = computed(() => !!props.modelValue.province)

const displayText = computed(() => {
  const { province, city, district } = props.modelValue
  const parts = [province, city, district].filter(Boolean)
  if (parts.length === 0) return props.placeholder || ''
  return parts.join(' / ')
})

// 当前选中路径
const selectedPath = computed<RegionNode[]>(() => {
  const path: RegionNode[] = []
  const { province, city, district } = props.modelValue
  const p = provinces.find((x) => x.name === province)
  if (p) {
    path.push(p)
    const c = p.children?.find((x) => x.name === city)
    if (c) {
      path.push(c)
      const d = c.children?.find((x) => x.name === district)
      if (d) path.push(d)
    }
  }
  return path
})

// 临时选中路径（用于 hover 展开）
const tempPath = ref<RegionNode[]>([])

// PC 端列数据
const columns = computed<RegionNode[][]>(() => {
  const path = tempPath.value.length ? tempPath.value : selectedPath.value
  const cols: RegionNode[][] = [provinces]
  if (path[0]?.children) cols.push(path[0].children)
  if (path[1]?.children) cols.push(path[1].children)
  return cols
})

// 移动端当前列数据
const mobileColumns = computed<RegionNode[]>(() => {
  if (mobileLevel.value === 0) return provinces
  if (mobileLevel.value === 1) return tempPath.value[0]?.children ?? []
  if (mobileLevel.value === 2) return tempPath.value[1]?.children ?? []
  return []
})

const mobileTitle = computed(() => {
  if (mobileLevel.value === 0) return t('auth.selectProvince')
  if (mobileLevel.value === 1) return t('auth.selectCity')
  return t('auth.selectDistrict')
})

function isActive(level: number, item: RegionNode): boolean {
  const path = tempPath.value.length ? tempPath.value : selectedPath.value
  return path[level]?.code === item.code
}

function isMobileActive(item: RegionNode): boolean {
  const path = tempPath.value.length ? tempPath.value : selectedPath.value
  return path[mobileLevel.value]?.code === item.code
}

function onHover(level: number, item: RegionNode) {
  if (isMobile.value) return
  if (!item.children?.length) return
  const newPath = tempPath.value.slice(0, level)
  newPath.push(item)
  tempPath.value = newPath
}

function selectOption(level: number, item: RegionNode) {
  const newPath = tempPath.value.slice(0, level)
  newPath.push(item)
  tempPath.value = newPath

  if (!item.children?.length) {
    // 叶子节点，确认选择
    const val = pathToValue(newPath)
    emit('update:modelValue', val)
    emit('change', val)
    close()
  } else if (props.changeOnSelect && level === 0) {
    const val = pathToValue(newPath)
    emit('update:modelValue', val)
    emit('change', val)
  }
}

function mobileSelect(item: RegionNode) {
  const newPath = tempPath.value.slice(0, mobileLevel.value)
  newPath.push(item)
  tempPath.value = newPath

  if (item.children?.length) {
    mobileLevel.value++
  } else {
    const val = pathToValue(newPath)
    emit('update:modelValue', val)
    emit('change', val)
    close()
  }
}

function mobileBack() {
  if (mobileLevel.value > 0) {
    mobileLevel.value--
    tempPath.value = tempPath.value.slice(0, mobileLevel.value + 1)
  }
}

function pathToValue(path: RegionNode[]): CascaderValue {
  return {
    province: path[0]?.name || '',
    city: path[1]?.name || '',
    district: path[2]?.name || ''
  }
}

function detectMobile() {
  isMobile.value = document.documentElement.dataset.device === 'mobile' || window.innerWidth < 640
}

function toggle() {
  if (props.disabled) return
  visible.value ? close() : open()
}

function open() {
  detectMobile()
  tempPath.value = [...selectedPath.value]
  mobileLevel.value = 0
  visible.value = true
  if (!isMobile.value) updatePosition()
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('resize', onResize)
  if (!isMobile.value) window.addEventListener('scroll', updatePosition, true)
}

function close() {
  visible.value = false
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', updatePosition, true)
}

function onDocClick(e: MouseEvent) {
  if (isMobile.value) return // 移动端通过遮罩和关闭按钮关闭
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close()
  }
}

function onResize() {
  detectMobile()
  if (!isMobile.value && visible.value) updatePosition()
}

function clearValue() {
  const empty = { province: '', city: '', district: '' }
  emit('update:modelValue', empty)
  emit('change', empty)
}

function updatePosition() {
  if (!rootRef.value || !visible.value || isMobile.value) return
  const rect = rootRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.bottom + 6}px`,
    minWidth: `${rect.width}px`,
    zIndex: '9999'
  }
}

watch(visible, (v) => {
  if (v) nextTick(() => { if (!isMobile.value) updatePosition() })
})

onMounted(() => {
  detectMobile()
  if (selectedPath.value.length) {
    tempPath.value = [...selectedPath.value]
  }
})

onBeforeUnmount(() => {
  close()
})
</script>

<style scoped>
/* 触发器 */
.app-cascader {
  position: relative;
  display: inline-flex;
  width: 100%;
}

.app-cascader__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: var(--control-h);
  padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition-normal);
  text-align: left;
  gap: 8px;
}

.app-cascader__trigger:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
}

.app-cascader.is-focused .app-cascader__trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent), 0 0 12px var(--color-glow);
}

.app-cascader.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.app-cascader--small .app-cascader__trigger {
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  border-radius: var(--radius-sm);
}

.app-cascader--large .app-cascader__trigger {
  height: 48px;
  padding: 0 14px;
  font-size: 15px;
}

.app-cascader__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-cascader__value.placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.app-cascader__icons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.app-cascader__arrow {
  transition: transform 0.25s ease;
}

.app-cascader__arrow.rotated {
  transform: rotate(180deg);
}

.app-cascader__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.app-cascader__clear:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

/* 下拉面板 - PC */
.app-cascader__dropdown {
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px var(--color-glow);
  overflow: hidden;
  position: relative;
}

.app-cascader__panels {
  display: flex;
  max-height: 280px;
  position: relative;
  z-index: 1;
}

.app-cascader__panel {
  min-width: 140px;
  max-height: 280px;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
}

.app-cascader__panel:last-child {
  border-right: none;
}

.app-cascader__panel::-webkit-scrollbar {
  width: 4px;
}

.app-cascader__panel::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-radius: 2px;
}

.app-cascader__panel-list {
  padding: 4px;
}

.app-cascader__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
  gap: 6px;
  text-align: left;
}

.app-cascader__option:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.app-cascader__option.active {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
  font-weight: 600;
}

.app-cascader__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-cascader__option-arrow {
  flex-shrink: 0;
  opacity: 0.5;
}

.app-cascader__option-check {
  flex-shrink: 0;
}

/* 扫描线 */
.app-cascader__scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.6;
  animation: cascader-scan 2.5s linear infinite;
  pointer-events: none;
}

@keyframes cascader-scan {
  0% { transform: translateY(0); opacity: 0.6; }
  100% { transform: translateY(280px); opacity: 0; }
}

/* 移动端面板 */
.app-cascader__dropdown--mobile {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  top: auto !important;
  min-width: 0 !important;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5), 0 0 30px var(--color-glow);
  z-index: 10000 !important;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.app-cascader__mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: -1;
}

.app-cascader__dropdown-body {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  flex: 1;
}

.app-cascader__mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.app-cascader__mobile-back,
.app-cascader__mobile-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.app-cascader__mobile-back:active,
.app-cascader__mobile-close:active {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.app-cascader__mobile-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.app-cascader__mobile-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
}

.app-cascader__mobile-list .app-cascader__option {
  padding: 14px 12px;
  font-size: 15px;
}

/* 过渡动画 */
.cascader-fade-enter-active,
.cascader-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.cascader-fade-enter-from,
.cascader-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.cascader-slide-up-enter-active,
.cascader-slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cascader-slide-up-enter-from,
.cascader-slide-up-leave-to {
  transform: translateY(100%);
}
</style>
