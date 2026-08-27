<template>
  <div class="pagination" v-if="total > 0">
    <!-- 总条数 -->
    <div v-if="showTotal" class="pg-total">
      <span class="pg-total-num">{{ total }}</span> {{ $t('common.itemsUnit') }}
    </div>

    <!-- 每页条数 -->
    <div v-if="showSizePicker" class="pg-sizes">
      <AppSelect
        :model-value="pageSize"
        :options="sizeOptions"
        @update:model-value="(v) => changePageSize(Number(v))"
      />
    </div>

    <!-- 页码按钮 -->
    <div class="pg-pages">
      <button
        class="pg-nav"
        :disabled="page <= 1"
        @click="goPage(page - 1)"
        :title="$t('common.prevPage')"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <template v-for="(p, i) in visiblePages" :key="i">
        <span v-if="p === '...'" class="pg-ellipsis">…</span>
        <button
          v-else
          class="pg-page"
          :class="{ active: page === p }"
          @click="goPage(p)"
        >{{ p }}</button>
      </template>

      <button
        class="pg-nav"
        :disabled="page >= totalPages"
        @click="goPage(page + 1)"
        :title="$t('common.nextPage')"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <!-- 跳转 -->
    <div v-if="showJump" class="pg-jump">
      <span>{{ $t('common.goTo') }}</span>
      <input
        ref="jumpInputRef"
        v-model.number="jumpValue"
        type="number"
        class="pg-jump-input"
        :min="1"
        :max="totalPages"
        @keyup.enter="confirmJump"
        @blur="confirmJump"
      />
      <span>{{ $t('common.pageUnit') }}</span>
    </div>

    <!-- 科技风扫描线 -->
    <div class="pg-scanline"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from './AppSelect.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    pageSize: number
    pageSizes?: number[]
    showSizePicker?: boolean
    showJump?: boolean
    showTotal?: boolean
  }>(),
  {
    pageSizes: () => [10, 20, 50, 100],
    showSizePicker: true,
    showJump: true,
    showTotal: true
  }
)

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'change', payload: { page: number; pageSize: number }): void
}>()

const jumpValue = ref<number | null>(null)
const jumpInputRef = ref<HTMLInputElement | null>(null)

const sizeOptions = computed(() =>
  props.pageSizes.map((s) => ({ label: t('common.itemsPerPage', { size: s }), value: s }))
)

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

// 页码列表：当前页前后各2页，超出用省略号
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.page
  const pages: (number | '...')[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
})

function goPage(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
  emit('change', { page: p, pageSize: props.pageSize })
}

function changePageSize(size: number) {
  if (size === props.pageSize) return
  emit('update:pageSize', size)
  emit('update:page', 1)
  emit('change', { page: 1, pageSize: size })
}

function confirmJump() {
  if (jumpValue.value == null) return
  const target = Math.max(1, Math.min(totalPages.value, Math.floor(jumpValue.value)))
  jumpValue.value = null
  if (target !== props.page) goPage(target)
}
</script>

<style scoped>
.pagination {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 12px;
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 1px 0 var(--glass-edge);
  overflow: hidden;
  flex-wrap: wrap;
}

.pg-total {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.pg-total-num {
  color: var(--color-primary);
  font-weight: 600;
  text-shadow: 0 0 8px var(--color-glow);
}

.pg-sizes {
  display: flex;
  align-items: center;
}

.pg-pages {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.pg-nav {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.pg-nav:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.pg-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pg-page {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.pg-page:hover {
  border-color: var(--color-border);
  color: var(--color-text);
  background: var(--color-surface);
}

.pg-page.active {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 0 12px var(--color-glow);
  font-weight: 600;
}

.pg-ellipsis {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 14px;
  padding: 0 2px;
  opacity: 0.5;
}

.pg-jump {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.pg-jump-input {
  width: 48px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
  outline: none;
  transition: var(--transition-fast);
  -moz-appearance: textfield;
}

.pg-jump-input::-webkit-outer-spin-button,
.pg-jump-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pg-jump-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

/* 科技风扫描线 */
.pg-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.4;
  animation: pg-scan 3s linear infinite;
  pointer-events: none;
}

@keyframes pg-scan {
  0% { top: 0; opacity: 0; }
  10% { opacity: 0.4; }
  90% { opacity: 0.4; }
  100% { top: 100%; opacity: 0; }
}

@media (max-width: 640px) {
  .pagination {
    justify-content: center;
  }
  .pg-pages {
    margin-left: 0;
  }
  .pg-sizes,
  .pg-jump {
    display: none;
  }
}
</style>
