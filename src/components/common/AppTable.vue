<template>
  <div
    class="app-table-wrapper"
    :class="[
      `app-table-wrapper--${size}`,
      {
        'has-height': !!height,
        'app-table-wrapper--bordered': bordered,
        'app-table-wrapper--stripe': stripe
      }
    ]"
  >
    <!--
      标题栏：左侧标题 + 右侧操作区，视觉上属于表格卡片的一部分。
      table-title-left / table-title-right 两个子插槽可单独使用，
      操作按钮放右侧即可与表格连成一体，无需在外部另起一行工具栏。
    -->
    <div
      v-if="title || $slots.title || $slots['table-title-left'] || $slots['table-title-right']"
      class="app-table__title-bar"
    >
      <div class="app-table__title-left">
        <slot name="title">{{ title }}</slot>
        <slot name="table-title-left" />
      </div>
      <div v-if="$slots['table-title-right']" class="app-table__title-right">
        <slot name="table-title-right" />
      </div>
    </div>

    <div ref="scrollRef" class="app-table-scroll" :style="scrollStyle">
      <table class="app-table" :class="{ 'app-table--bordered': bordered }" :style="tableStyle">
        <!-- 表头 -->
        <thead class="app-table__thead">
          <!-- 分组表头 -->
          <tr v-if="hasGroupHeader">
            <th
              v-if="selection"
              class="app-table__th app-table__th--selection"
              :rowspan="2"
              :style="stickyStyle('left', 0)"
            >
              <label v-if="selection === 'multiple'" class="app-table__checkbox" :class="{ 'is-checked': allChecked, 'is-indeterminate': indeterminate }">
                <input type="checkbox" :checked="allChecked" :indeterminate="indeterminate" @change="toggleAll" />
                <span class="app-table__checkbox-box">
                  <svg v-if="indeterminate" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <svg v-else-if="allChecked" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </label>
            </th>
            <th v-if="showIndex" class="app-table__th app-table__th--index" :rowspan="2" :style="stickyStyle('left', selection ? 44 : 0)">#</th>
            <template v-for="col in leafHeaders" :key="col.key">
              <th
                v-if="col.children?.length"
                :colspan="col.children.length"
                class="app-table__th app-table__th--group"
                :class="getHeaderCellClass(col)"
                :style="getHeaderCellStyle(col)"
              >
                <div class="app-table__th-content">{{ col.title }}</div>
              </th>
            </template>
          </tr>
          <!-- 列表头 -->
          <tr>
            <template v-for="col in flatColumns" :key="col.key">
              <th
                class="app-table__th"
                :class="[
                  `app-table__th--${col.align || 'left'}`,
                  getHeaderCellClass(col),
                  {
                    'app-table__th--fixed-left': col.fixed === 'left',
                    'app-table__th--fixed-right': col.fixed === 'right',
                    'app-table__th--sortable': col.sortable || col.sorter,
                    'app-table__th--filtered': isFilterActive(col),
                    'app-table__th--resizable': col.resizable
                  }
                ]"
                :style="getHeaderCellStyle(col, thStyle(col))"
                @click="onHeaderClick(col, $event)"
              >
                <div class="app-table__th-content">
                  <span class="app-table__th-title">
                    <slot v-if="$slots[`header-${col.key}`]" :name="`header-${col.key}`" :column="col" />
                    <template v-else>{{ col.title }}</template>
                  </span>

                  <!-- 排序按钮（位于筛选按钮之前） -->
                  <button
                    v-if="col.sortable || col.sorter"
                    type="button"
                    class="app-table__sort-btn"
                    :class="{ active: currentSort.key === col.key && currentSort.order }"
                    @click.stop="toggleSort(col)"
                  >
                    <span class="app-table__sort-icons">
                      <svg class="app-table__sort-up" :class="{ active: currentSort.key === col.key && currentSort.order === 'asc' }" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      <svg class="app-table__sort-down" :class="{ active: currentSort.key === col.key && currentSort.order === 'desc' }" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  <!-- 过滤按钮 -->
                  <button
                    v-if="col.filterable"
                    type="button"
                    class="app-table__filter-btn"
                    :class="{ active: isFilterActive(col) }"
                    @click.stop="toggleFilter(col, $event)"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </button>

                  <!-- 列宽拖拽手柄 -->
                  <span
                    v-if="col.resizable"
                    class="app-table__resizer"
                    @mousedown.stop.prevent="startResize(col, $event)"
                  ></span>
                </div>
              </th>
            </template>
          </tr>
        </thead>

        <!-- 表体 -->
        <tbody class="app-table__tbody">
          <!-- 遮罩 loading -->
          <tr v-if="loading && loadingType === 'overlay'" class="app-table__overlay-row">
            <td :colspan="totalCols" class="app-table__overlay-cell">
              <div class="app-table__overlay">
                <TableLoading />
              </div>
            </td>
          </tr>

          <!-- 骨架屏 loading -->
          <template v-if="loading && loadingType === 'skeleton'">
            <tr v-for="n in skeletonRows" :key="`skeleton-${n}`" class="app-table__row app-table__row--skeleton">
              <td v-if="selection" class="app-table__td app-table__td--selection" :style="stickyStyle('left', 0)">
                <div class="app-table__skeleton" style="width: 16px; height: 16px; border-radius: 4px;"></div>
              </td>
              <td v-if="showIndex" class="app-table__td app-table__td--index" :style="stickyStyle('left', selection ? 44 : 0)">
                <div class="app-table__skeleton" style="width: 24px; height: 14px;"></div>
              </td>
              <td v-for="col in flatColumns" :key="col.key" class="app-table__td" :class="getCellClass(col)" :style="getCellStyle(col)">
                <div class="app-table__skeleton" :style="{ width: Math.random() * 40 + 50 + '%' }"></div>
              </td>
            </tr>
          </template>

          <!-- 数据行 -->
          <template v-else>
            <template v-for="(row, ri) in processedData" :key="getRowKey(row, ri)">
              <tr
                class="app-table__row"
                :class="[
                  getRowClassName(row, ri),
                  {
                    'app-table__row--selected': isSelected(row, ri),
                    'app-table__row--current': isCurrentRow(row, ri),
                    'app-table__row--hoverable': selection || !!rowClickable,
                    'app-table__row--expanded': expandedKeys.includes(getRowKey(row, ri))
                  }
                ]"
                :style="getRowStyle(row, ri)"
                @click="onRowClick(row, ri, $event)"
                @dblclick="onRowDblclick(row, ri, $event)"
                @contextmenu="onRowContextmenu(row, ri, $event)"
              >
                <!-- 多选 -->
                <td
                  v-if="selection === 'multiple'"
                  class="app-table__td app-table__td--selection"
                  :style="stickyStyle('left', 0)"
                  @click.stop
                >
                  <label class="app-table__checkbox" :class="{ 'is-checked': isSelected(row, ri), 'is-disabled': !isSelectable(row, ri) }">
                    <input type="checkbox" :checked="isSelected(row, ri)" :disabled="!isSelectable(row, ri)" @change="toggleRow(row, ri)" />
                    <span class="app-table__checkbox-box">
                      <svg v-if="isSelected(row, ri)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </label>
                </td>

                <!-- 单选 -->
                <td
                  v-else-if="selection === 'single'"
                  class="app-table__td app-table__td--selection"
                  :style="stickyStyle('left', 0)"
                  @click.stop
                >
                  <label class="app-table__radio" :class="{ 'is-checked': isSelected(row, ri), 'is-disabled': !isSelectable(row, ri) }">
                    <input type="radio" :checked="isSelected(row, ri)" :disabled="!isSelectable(row, ri)" @change="selectSingle(row, ri)" />
                    <span class="app-table__radio-circle"></span>
                  </label>
                </td>

                <!-- 序号 -->
                <td
                  v-if="showIndex"
                  class="app-table__td app-table__td--index"
                  :style="stickyStyle('left', selection ? 44 : 0)"
                >
                  {{ (currentPage - 1) * pageSize + ri + 1 }}
                </td>

                <!-- 数据单元格 -->
                <td
                  v-for="col in flatColumns"
                  :key="col.key"
                  class="app-table__td"
                  :class="getCellClass(col, row, ri)"
                  :style="getCellStyle(col, row, ri, getSpan(row, col, ri))"
                  :rowspan="getSpan(row, col, ri).rowspan"
                  :colspan="getSpan(row, col, ri).colspan"
                  @click="onCellClick(row, col, ri, $event)"
                  @dblclick="onCellDblclick(row, col, ri, $event)"
                >
                  <slot :name="`column-${col.key}`" :row="row" :index="ri" :value="getCellValue(row, col)" :column="col">
                    <AppTooltip v-if="col.ellipsis" :content="String(formatCell(row, col, ri) ?? '')">
                      <span class="app-table__ellipsis">{{ formatCell(row, col, ri) }}</span>
                    </AppTooltip>
                    <template v-else>{{ formatCell(row, col, ri) }}</template>
                  </slot>
                </td>
              </tr>

              <!-- 展开行 -->
              <tr v-if="expandable && expandedKeys.includes(getRowKey(row, ri))" class="app-table__row--expanded-content">
                <td :colspan="totalCols" class="app-table__expanded-cell">
                  <slot name="expandedRow" :row="row" :index="ri" />
                </td>
              </tr>
            </template>

            <!-- 空状态 -->
            <tr v-if="processedData.length === 0 && !loading">
              <td class="app-table__empty" :colspan="totalCols">
                <slot name="empty">
                  <div class="app-table__empty-inner">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    <span>{{ emptyText }}</span>
                  </div>
                </slot>
              </td>
            </tr>
          </template>
        </tbody>

        <!-- 合计行 -->
        <tfoot v-if="$slots.summary || summaryMethod" class="app-table__tfoot">
          <tr>
            <td v-if="selection" class="app-table__td app-table__td--selection" :style="stickyStyle('left', 0)"></td>
            <td v-if="showIndex" class="app-table__td app-table__td--index" :style="stickyStyle('left', selection ? 44 : 0)"></td>
            <slot name="summary" :data="processedData" :columns="flatColumns">
              <td
                v-for="col in flatColumns"
                :key="col.key"
                class="app-table__td app-table__td--summary"
                :class="getCellClass(col)"
                :style="getCellStyle(col)"
              >
                {{ getSummaryCell(col) }}
              </td>
            </slot>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 底部插槽 -->
    <div v-if="$slots.footer" class="app-table__footer">
      <slot name="footer" />
    </div>

    <!-- 追加插槽 -->
    <div v-if="$slots.append" class="app-table__append">
      <slot name="append" />
    </div>

    <!-- 过滤面板 -->
    <Teleport to="body">
      <Transition name="filter-pop">
        <div
          v-if="filterPanel.visible"
          ref="filterPanelRef"
          class="app-table__filter-panel"
          :style="filterPanel.style"
          @click.stop
        >
          <!-- 过滤搜索 -->
          <div v-if="filterPanel.filterSearch" class="app-table__filter-search">
            <AppInput
              v-model="filterPanel.searchText"
              type="text"
              size="small"
              :placeholder="$t('common.search')"
              :clearable="true"
            />
          </div>

          <!-- checkbox 多选（带「全部」） -->
          <div v-if="filterPanel.filterType === 'checkbox'" class="app-table__filter-list">
            <label class="app-table__filter-item app-table__filter-item--all">
              <input
                type="checkbox"
                :checked="filterPanel.selected.length === 0"
                @change="onAllFilterChange"
              />
              <span class="app-table__filter-label">{{ $t('common.all') }}</span>
            </label>
            <label
              v-for="f in filteredPanelFilters"
              :key="String(f.value)"
              class="app-table__filter-item"
            >
              <input
                type="checkbox"
                :checked="filterPanel.selected.includes(f.value)"
                @change="onFilterCheck(f.value)"
              />
              <span class="app-table__filter-label">{{ f.text }}</span>
            </label>
            <div v-if="filteredPanelFilters.length === 0" class="app-table__filter-empty">
              {{ $t('common.noData') }}
            </div>
          </div>

          <!-- radio 单选（带「全部」） -->
          <div v-else-if="filterPanel.filterType === 'radio'" class="app-table__filter-list">
            <AppRadio
              class="app-table__filter-item app-table__filter-item--all"
              :value="''"
              :label="t('common.all')"
              :model-value="filterPanel.selected.length === 0 ? '' : null"
              :name="radioGroupName"
              size="small"
              @update:model-value="onRadioSelect('')"
            />
            <AppRadio
              v-for="f in filteredPanelFilters"
              :key="String(f.value)"
              class="app-table__filter-item"
              :value="f.value"
              :label="f.text"
              :model-value="filterPanel.selected[0]"
              :name="radioGroupName"
              size="small"
              @update:model-value="(v: any) => onRadioSelect(v)"
            />
            <div v-if="filteredPanelFilters.length === 0" class="app-table__filter-empty">
              {{ $t('common.noData') }}
            </div>
          </div>

          <!-- select 下拉 -->
          <div v-else-if="filterPanel.filterType === 'select'" class="app-table__filter-select">
            <AppSelect
              :model-value="filterPanel.selected[0] ?? ''"
              :options="selectOptions"
              :placeholder="filterPanel.placeholder"
              @update:model-value="onSelectChange"
            />
          </div>

          <!-- input 输入框 -->
          <div v-else-if="filterPanel.filterType === 'input'" class="app-table__filter-list">
            <AppInput
              :model-value="filterPanel.inputValue"
              type="text"
              size="small"
              :placeholder="filterPanel.placeholder"
              clearable
              @update:model-value="onInputFilterChange"
            />
          </div>

          <!-- 兼容旧版：原生 checkbox/radio -->
          <div v-else class="app-table__filter-list">
            <label
              v-for="f in filteredPanelFilters"
              :key="String(f.value)"
              class="app-table__filter-item"
            >
              <input
                :type="filterPanel.mode === 'multiple' ? 'checkbox' : 'radio'"
                :checked="filterPanel.selected.includes(f.value)"
                @change="onFilterCheck(f.value)"
              />
              <span class="app-table__filter-label">{{ f.text }}</span>
            </label>
            <div v-if="filteredPanelFilters.length === 0" class="app-table__filter-empty">
              {{ $t('common.noData') }}
            </div>
          </div>
          <div class="app-table__filter-actions">
            <button type="button" class="app-table__filter-btn-reset" @click="resetFilter">
              {{ $t('common.reset') }}
            </button>
            <button type="button" class="app-table__filter-btn-ok" @click="applyFilter">
              {{ $t('confirm.ok') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppRadio from '@/components/common/AppRadio.vue'
import AppTooltip from '@/components/common/AppTooltip.vue'
import TableLoading from '@/components/common/TableLoading.vue'

const { t } = useI18n()

// ============ 类型定义 ============
export interface TableFilter {
  text: string
  value: string | number | boolean
}

export interface TableColumn {
  key: string
  title: string
  dataIndex?: string
  width?: number | string
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  ellipsis?: boolean
  tooltip?: boolean
  sortable?: boolean
  sorter?: ((a: any, b: any) => number) | boolean
  defaultSortOrder?: 'asc' | 'desc' | null
  sortOrder?: 'asc' | 'desc' | null
  filterable?: boolean
  filterType?: 'checkbox' | 'radio' | 'select' | 'input'
  filters?: TableFilter[]
  filterMode?: 'single' | 'multiple'
  filterSearch?: boolean
  filterPlaceholder?: string
  filterMethod?: (value: any, row: any) => boolean
  filteredValue?: any[]
  defaultFilteredValue?: any[]
  selectable?: (row: any, index: number) => boolean
  formatter?: (row: any, column: TableColumn, value: any, index: number) => string | number
  className?: string
  headerClassName?: string
  resizable?: boolean
  children?: TableColumn[]
  [key: string]: any
}

export interface SortState {
  key: string
  order: 'asc' | 'desc' | null
}

export interface SpanMethodProps {
  row: any
  column: TableColumn
  rowIndex: number
  columnIndex: number
}

// ============ Props ============
const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    data: any[]
    selection?: 'single' | 'multiple' | null
    selectedKeys?: (string | number)[]
    rowKey?: string | ((row: any) => string | number)
    showIndex?: boolean
    loading?: boolean
    loadingType?: 'skeleton' | 'overlay'
    emptyText?: string
    bordered?: boolean
    stripe?: boolean
    size?: 'small' | 'default' | 'large'
    height?: string | number
    maxHeight?: string | number
    skeletonRows?: number
    currentPage?: number
    pageSize?: number
    title?: string
    showHeader?: boolean
    highlightCurrentRow?: boolean
    currentRowKey?: string | number | null
    expandable?: boolean
    expandedRowKeys?: (string | number)[]
    defaultExpandAll?: boolean
    rowClassName?: string | ((row: any, index: number) => string)
    rowStyle?: Record<string, any> | ((row: any, index: number) => Record<string, any>)
    cellClassName?: string | ((row: any, column: TableColumn, index: number) => string)
    cellStyle?: Record<string, any> | ((row: any, column: TableColumn, index: number) => Record<string, any>)
    headerCellClassName?: string | ((column: TableColumn) => string)
    headerCellStyle?: Record<string, any> | ((column: TableColumn) => Record<string, any>)
    spanMethod?: (props: SpanMethodProps) => { rowspan: number; colspan: number } | undefined
    summaryMethod?: (data: any[], column: TableColumn) => string | number
    defaultSort?: SortState
    customSort?: boolean
    sortMethod?: (key: string, order: 'asc' | 'desc' | null) => void
    indentSize?: number
  }>(),
  {
    selection: null,
    selectedKeys: () => [],
    rowKey: 'id',
    showIndex: false,
    loading: false,
    loadingType: 'skeleton',
    emptyText: '',
    bordered: false,
    stripe: false,
    size: 'default',
    skeletonRows: 5,
    currentPage: 1,
    pageSize: 10,
    showHeader: true,
    highlightCurrentRow: false,
    customSort: false,
    expandable: false,
    expandedRowKeys: () => [],
    defaultExpandAll: false,
    indentSize: 16
  }
)

// ============ Emits ============
const emit = defineEmits<{
  (e: 'selectionChange', keys: (string | number)[], rows: any[]): void
  (e: 'filterChange', filters: Record<string, any[]>): void
  (e: 'sortChange', key: string, order: 'asc' | 'desc' | null): void
  (e: 'rowClick', row: any, index: number, event: Event): void
  (e: 'rowDblclick', row: any, index: number, event: Event): void
  (e: 'rowContextmenu', row: any, index: number, event: Event): void
  (e: 'cellClick', row: any, column: TableColumn, index: number, event: Event): void
  (e: 'cellDblclick', row: any, column: TableColumn, index: number, event: Event): void
  (e: 'headerClick', column: TableColumn, event: Event): void
  (e: 'expandChange', row: any, expanded: boolean, record: any): void
  (e: 'expandedRowsChange', keys: (string | number)[]): void
  (e: 'currentChange', row: any | null, key: string | number | null): void
  (e: 'change', sorter: SortState, filters: Record<string, any[]>): void
  (e: 'update:expandedRowKeys', keys: (string | number)[]): void
}>()

// ============ 内部状态 ============
const scrollRef = ref<HTMLElement | null>(null)
const innerSort = ref<SortState>({ key: '', order: null })
const innerFilters = ref<Record<string, any[]>>({})
const innerExpandedKeys = ref<(string | number)[]>([])
const innerCurrentKey = ref<string | number | null>(null)
const columnWidths = ref<Record<string, number>>({})

// 初始化默认排序/过滤/展开
const initialized = ref(false)
function initDefaults() {
  if (initialized.value) return
  initialized.value = true
  // 默认排序
  if (props.defaultSort) {
    innerSort.value = { ...props.defaultSort }
  } else {
    for (const col of props.columns) {
      if (col.sortOrder) {
        innerSort.value = { key: col.key, order: col.sortOrder }
        break
      }
      if (col.defaultSortOrder) {
        innerSort.value = { key: col.key, order: col.defaultSortOrder }
        break
      }
    }
  }
  // 默认过滤
  for (const col of flatColumns.value) {
    if (col.filteredValue) {
      innerFilters.value[col.key] = [...col.filteredValue]
    } else if (col.defaultFilteredValue) {
      innerFilters.value[col.key] = [...col.defaultFilteredValue]
    }
  }
  // 默认展开
  if (props.expandable) {
    if (props.defaultExpandAll) {
      innerExpandedKeys.value = props.data.map((r, i) => getRowKey(r, i))
    } else if (props.expandedRowKeys.length) {
      innerExpandedKeys.value = [...props.expandedRowKeys]
    }
  }
}

// ============ 列处理 ============
// 扁平化列（用于渲染表体）
const flatColumns = computed<TableColumn[]>(() => {
  const result: TableColumn[] = []
  function flatten(cols: TableColumn[]) {
    for (const col of cols) {
      if (col.children?.length) {
        flatten(col.children)
      } else {
        result.push(col)
      }
    }
  }
  flatten(props.columns)
  return result
})

// 是否有分组表头
const hasGroupHeader = computed(() => props.columns.some((c) => c.children?.length))

// 分组表头行（只渲染有 children 的列）
const leafHeaders = computed(() => props.columns)

const totalCols = computed(() => {
  let n = flatColumns.value.length
  if (props.selection) n++
  if (props.showIndex) n++
  return n
})

// ============ 数据取值 ============
function getCellValue(row: any, col: TableColumn): any {
  if (col.dataIndex) {
    // 支持嵌套路径 a.b.c
    return col.dataIndex.split('.').reduce((obj, key) => obj?.[key], row)
  }
  return row[col.key]
}

function formatCell(row: any, col: TableColumn, index: number): string | number {
  const value = getCellValue(row, col)
  if (col.formatter) return col.formatter(row, col, value, index)
  return value ?? ''
}

// ============ RowKey ============
function getRowKey(row: any, index: number): string | number {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  return row[props.rowKey] ?? index
}

// ============ 选择 ============
function isSelected(row: any, index: number): boolean {
  return props.selectedKeys.includes(getRowKey(row, index))
}

function isSelectable(row: any, index: number): boolean {
  const col = flatColumns.value.find((c) => c.key === '_selection')
  // 从 selection 配置中找 selectable
  for (const c of props.columns) {
    if (c.selectable && !c.selectable(row, index)) return false
  }
  return true
}

const allChecked = computed(() => {
  const selectableRows = props.data.filter((r, i) => isSelectable(r, i))
  if (selectableRows.length === 0) return false
  return selectableRows.every((r, i) => isSelected(r, props.data.indexOf(r)))
})

const indeterminate = computed(() => {
  const checkedCount = props.data.filter((r, i) => isSelected(r, i)).length
  return checkedCount > 0 && checkedCount < props.data.length
})

function toggleAll() {
  if (allChecked.value) {
    emit('selectionChange', [], [])
  } else {
    const selectableRows = props.data.filter((r, i) => isSelectable(r, i))
    const keys = selectableRows.map((r) => getRowKey(r, props.data.indexOf(r)))
    emit('selectionChange', keys, selectableRows)
  }
}

function toggleRow(row: any, index: number) {
  const key = getRowKey(row, index)
  const keys = [...props.selectedKeys]
  const idx = keys.indexOf(key)
  if (idx > -1) {
    keys.splice(idx, 1)
  } else {
    keys.push(key)
  }
  emit('selectionChange', keys, props.data.filter((r, i) => keys.includes(getRowKey(r, i))))
}

function selectSingle(row: any, index: number) {
  const key = getRowKey(row, index)
  emit('selectionChange', [key], [row])
}

// ============ 高亮当前行 ============
const currentKey = computed(() =>
  props.currentRowKey !== undefined ? props.currentRowKey : innerCurrentKey.value
)

function isCurrentRow(row: any, index: number): boolean {
  return props.highlightCurrentRow && currentKey.value === getRowKey(row, index)
}

// ============ 排序 ============
const currentSort = computed<SortState>(() => {
  // 受控模式
  for (const col of flatColumns.value) {
    if (col.sortOrder !== undefined && col.key === innerSort.value.key) {
      return { key: col.key, order: col.sortOrder }
    }
  }
  return innerSort.value
})

function toggleSort(col: TableColumn) {
  if (currentSort.value.key === col.key) {
    if (currentSort.value.order === 'asc') {
      innerSort.value = { key: col.key, order: 'desc' }
    } else if (currentSort.value.order === 'desc') {
      innerSort.value = { key: '', order: null }
    }
  } else {
    innerSort.value = { key: col.key, order: 'asc' }
  }
  emit('sortChange', innerSort.value.key, innerSort.value.order)
  emit('change', innerSort.value, activeFilters.value)
  // 自定义排序（服务端排序）：把排序状态交给外部处理后端请求
  props.sortMethod?.(innerSort.value.key, innerSort.value.order)
}

function sort(key: string, order: 'asc' | 'desc' | null) {
  innerSort.value = { key, order }
  emit('sortChange', key, order)
  emit('change', innerSort.value, activeFilters.value)
}

function clearSort() {
  innerSort.value = { key: '', order: null }
  emit('sortChange', '', null)
  emit('change', innerSort.value, activeFilters.value)
}

// ============ 过滤 ============
const activeFilters = computed<Record<string, any[]>>(() => {
  const result: Record<string, any[]> = {}
  for (const col of flatColumns.value) {
    if (col.filteredValue !== undefined) {
      result[col.key] = col.filteredValue
    } else if (innerFilters.value[col.key]) {
      result[col.key] = innerFilters.value[col.key]
    }
  }
  return result
})

function isFilterActive(col: TableColumn): boolean {
  return (activeFilters.value[col.key]?.length ?? 0) > 0
}

const filterPanel = ref({
  visible: false,
  colKey: '',
  mode: 'multiple' as 'single' | 'multiple',
  filterType: 'checkbox' as 'checkbox' | 'radio' | 'select' | 'input',
  filters: [] as TableFilter[],
  selected: [] as any[],
  inputValue: '' as string,
  searchText: '',
  filterSearch: false,
  placeholder: '',
  style: {} as Record<string, string>
})
const filterPanelRef = ref<HTMLElement | null>(null)

const filteredPanelFilters = computed(() => {
  if (!filterPanel.value.filterSearch || !filterPanel.value.searchText) return filterPanel.value.filters
  const kw = filterPanel.value.searchText.toLowerCase()
  return filterPanel.value.filters.filter((f) => f.text.toLowerCase().includes(kw))
})

// 各类型 options
const radioGroupName = computed(() => `app-table-filter-${filterPanel.value.colKey}`)

const selectOptions = computed(() => [
  { label: t('common.all'), value: '' },
  ...filteredPanelFilters.value.map((f) => ({ label: f.text, value: f.value }))
])

function onAllFilterChange() {
  filterPanel.value.selected = []
}

function onRadioSelect(value: any) {
  // 选中「全部」(value 为空) 表示不筛选
  filterPanel.value.selected = value === '' || value === undefined || value === null ? [] : [value]
}

function onSelectChange(value: any) {
  filterPanel.value.selected = value === '' || value === undefined ? [] : [value]
}

function onInputFilterChange(value: string | number | null) {
  filterPanel.value.inputValue = String(value ?? '')
  filterPanel.value.selected = value ? [String(value)] : []
}

function toggleFilter(col: TableColumn, event: Event) {
  if (filterPanel.value.visible && filterPanel.value.colKey === col.key) {
    closeFilterPanel()
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  filterPanel.value = {
    visible: true,
    colKey: col.key,
    mode: col.filterMode || (col.filterType === 'radio' || col.filterType === 'select' ? 'single' : 'multiple'),
    filterType: col.filterType || 'checkbox',
    filters: col.filters || [],
    selected: [...(activeFilters.value[col.key] || [])],
    inputValue: (activeFilters.value[col.key]?.[0] as string) || '',
    searchText: '',
    filterSearch: !!col.filterSearch,
    placeholder: col.filterPlaceholder || t('common.search'),
    style: {
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      left: `${Math.max(rect.right - 200, 8)}px`,
      zIndex: '10001'
    }
  }
  document.addEventListener('click', onFilterDocClick, true)
}

function onFilterCheck(value: any) {
  const sel = filterPanel.value.selected
  if (filterPanel.value.mode === 'multiple') {
    const idx = sel.indexOf(value)
    if (idx > -1) sel.splice(idx, 1)
    else sel.push(value)
  } else {
    filterPanel.value.selected = [value]
  }
}

function applyFilter() {
  innerFilters.value = {
    ...innerFilters.value,
    [filterPanel.value.colKey]: [...filterPanel.value.selected]
  }
  emit('filterChange', activeFilters.value)
  emit('change', currentSort.value, activeFilters.value)
  closeFilterPanel()
}

function resetFilter() {
  filterPanel.value.selected = []
  filterPanel.value.inputValue = ''
}

function clearFilter(columnKeys?: string[]) {
  if (columnKeys) {
    for (const key of columnKeys) {
      delete innerFilters.value[key]
    }
  } else {
    innerFilters.value = {}
  }
  emit('filterChange', activeFilters.value)
  emit('change', currentSort.value, activeFilters.value)
}

function closeFilterPanel() {
  filterPanel.value.visible = false
  document.removeEventListener('click', onFilterDocClick, true)
}

function onFilterDocClick(e: MouseEvent) {
  const target = e.target as Node
  // 点击筛选图标本身时交给 toggleFilter 处理（用于再次点击收起），不在此处关闭
  if ((target as Element | null)?.closest?.('.app-table__filter-btn')) return
  if (filterPanelRef.value && !filterPanelRef.value.contains(target)) {
    closeFilterPanel()
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('click', onFilterDocClick, true)
})

// ============ 数据处理（排序+过滤） ============
const processedData = computed(() => {
  let result = [...props.data]

  // 过滤
  for (const [key, values] of Object.entries(activeFilters.value)) {
    if (!values?.length) continue
    const col = flatColumns.value.find((c) => c.key === key)
    if (col?.filterMethod) {
      result = result.filter((row) => values.some((v) => col.filterMethod!(v, row)))
    } else {
      result = result.filter((row) => values.includes(getCellValue(row, col!)))
    }
  }

  // 排序（customSort 为服务端排序模式：数据顺序由后端返回，前端不再排序）
  const { key, order } = currentSort.value
  if (!props.customSort && key && order) {
    const col = flatColumns.value.find((c) => c.key === key)
    const dir = order === 'asc' ? 1 : -1
    const sorter = col?.sorter
    if (typeof sorter === 'function') {
      result.sort((a, b) => sorter(a, b) * dir)
    } else {
      result.sort((a, b) => {
        const va = getCellValue(a, col!)
        const vb = getCellValue(b, col!)
        if (va == null) return 1
        if (vb == null) return -1
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
        return String(va).localeCompare(String(vb)) * dir
      })
    }
  }

  return result
})

// ============ 展开行 ============
const expandedKeys = computed(() =>
  props.expandedRowKeys.length ? props.expandedRowKeys : innerExpandedKeys.value
)

function toggleExpand(row: any, index: number) {
  const key = getRowKey(row, index)
  const keys = [...expandedKeys.value]
  const idx = keys.indexOf(key)
  const expanded = idx === -1
  if (expanded) keys.push(key)
  else keys.splice(idx, 1)
  innerExpandedKeys.value = keys
  emit('update:expandedRowKeys', keys)
  emit('expandedRowsChange', keys)
  emit('expandChange', row, expanded, row)
}

// ============ 样式回调 ============
function getRowClassName(row: any, index: number): string {
  if (typeof props.rowClassName === 'function') return props.rowClassName(row, index)
  return props.rowClassName || ''
}

function getRowStyle(row: any, index: number): Record<string, any> {
  if (typeof props.rowStyle === 'function') return props.rowStyle(row, index)
  return props.rowStyle || {}
}

function getCellClass(col: TableColumn, row?: any, index?: number): string[] {
  const classes: any[] = [
    `app-table__td--${col.align || 'left'}`,
    {
      'app-table__td--fixed-left': col.fixed === 'left',
      'app-table__td--fixed-right': col.fixed === 'right'
    }
  ]
  if (col.className) classes.push(col.className)
  if (props.cellClassName && row !== undefined && index !== undefined) {
    if (typeof props.cellClassName === 'function') classes.push(props.cellClassName(row, col, index))
    else classes.push(props.cellClassName)
  }
  return classes
}

function getCellStyle(col: TableColumn, row?: any, index?: number, span?: { rowspan: number; colspan: number }): Record<string, any> {
  const style: Record<string, any> = {}
  if (col.width) style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
  if (columnWidths.value[col.key]) style.width = `${columnWidths.value[col.key]}px`
  if (col.fixed === 'left') {
    style.position = 'sticky'
    style.left = `${getLeftOffset(col)}px`
    style.zIndex = span?.rowspan === 0 ? -1 : 3
  } else if (col.fixed === 'right') {
    style.position = 'sticky'
    style.right = `${getRightOffset(col)}px`
    style.zIndex = span?.rowspan === 0 ? -1 : 3
  }
  if (props.cellStyle && row !== undefined && index !== undefined) {
    if (typeof props.cellStyle === 'function') Object.assign(style, props.cellStyle(row, col, index))
    else Object.assign(style, props.cellStyle)
  }
  if (span?.rowspan === 0 || span?.colspan === 0) {
    style.display = 'none'
  }
  return style
}

function getHeaderCellClass(col: TableColumn): string[] {
  const classes: any[] = []
  if (col.headerClassName) classes.push(col.headerClassName)
  if (props.headerCellClassName) {
    if (typeof props.headerCellClassName === 'function') classes.push(props.headerCellClassName(col))
    else classes.push(props.headerCellClassName)
  }
  return classes
}

function getHeaderCellStyle(col: TableColumn, extra?: Record<string, any>): Record<string, any> {
  const style: Record<string, any> = { ...(extra || {}) }
  if (props.headerCellStyle) {
    if (typeof props.headerCellStyle === 'function') Object.assign(style, props.headerCellStyle(col))
    else Object.assign(style, props.headerCellStyle)
  }
  return style
}

function thStyle(col: TableColumn): Record<string, string> {
  const style: Record<string, string> = {}
  if (col.width) style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
  if (columnWidths.value[col.key]) style.width = `${columnWidths.value[col.key]}px`
  if (col.fixed === 'left') {
    style.position = 'sticky'
    style.left = `${getLeftOffset(col)}px`
    style.zIndex = '4'
  } else if (col.fixed === 'right') {
    style.position = 'sticky'
    style.right = `${getRightOffset(col)}px`
    style.zIndex = '4'
  }
  return style
}

function stickyStyle(side: 'left' | 'right', offset: number) {
  return {
    position: 'sticky' as const,
    [side]: `${offset}px`,
    zIndex: 4
  }
}

function getLeftOffset(col: TableColumn): number {
  let offset = 0
  if (props.selection) offset += 44
  if (props.showIndex) offset += 56
  for (const c of flatColumns.value) {
    if (c.key === col.key) break
    if (c.fixed === 'left') {
      const w = columnWidths.value[c.key] || (typeof c.width === 'number' ? c.width : 120)
      offset += w
    }
  }
  return offset
}

function getRightOffset(col: TableColumn): number {
  let offset = 0
  const idx = flatColumns.value.findIndex((c) => c.key === col.key)
  for (let i = flatColumns.value.length - 1; i > idx; i--) {
    const c = flatColumns.value[i]
    if (c.fixed === 'right') {
      const w = columnWidths.value[c.key] || (typeof c.width === 'number' ? c.width : 120)
      offset += w
    }
  }
  return offset
}

// ============ 单元格合并 ============
function getSpan(row: any, col: TableColumn, index: number): { rowspan: number; colspan: number } {
  if (props.spanMethod) {
    const colIndex = flatColumns.value.indexOf(col)
    const result = props.spanMethod({ row, column: col, rowIndex: index, columnIndex: colIndex })
    if (result) return result
  }
  return { rowspan: 1, colspan: 1 }
}

// ============ 合计行 ============
function getSummaryCell(col: TableColumn): string | number {
  if (props.summaryMethod) return props.summaryMethod(processedData.value, col)
  return ''
}

// ============ 事件 ============
const rowClickable = computed(() => true)

function onRowClick(row: any, index: number, event: Event) {
  if (props.highlightCurrentRow) {
    innerCurrentKey.value = getRowKey(row, index)
    emit('currentChange', row, getRowKey(row, index))
  }
  emit('rowClick', row, index, event)
}

function onRowDblclick(row: any, index: number, event: Event) {
  emit('rowDblclick', row, index, event)
}

function onRowContextmenu(row: any, index: number, event: Event) {
  emit('rowContextmenu', row, index, event)
}

function onCellClick(row: any, col: TableColumn, index: number, event: Event) {
  emit('cellClick', row, col, index, event)
}

function onCellDblclick(row: any, col: TableColumn, index: number, event: Event) {
  emit('cellDblclick', row, col, index, event)
}

function onHeaderClick(col: TableColumn, event: Event) {
  emit('headerClick', col, event)
}

// ============ 列宽拖拽 ============
let resizingCol: TableColumn | null = null
let resizeStartX = 0
let resizeStartWidth = 0

function startResize(col: TableColumn, event: MouseEvent) {
  resizingCol = col
  resizeStartX = event.clientX
  resizeStartWidth = (event.target as HTMLElement).closest('.app-table__th')?.getBoundingClientRect().width || 100
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(event: MouseEvent) {
  if (!resizingCol) return
  const delta = event.clientX - resizeStartX
  const newWidth = Math.max(60, resizeStartWidth + delta)
  columnWidths.value[resizingCol.key] = newWidth
}

function stopResize() {
  resizingCol = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ============ 滚动样式 ============
const scrollStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.height) style.maxHeight = typeof props.height === 'number' ? `${props.height}px` : props.height
  if (props.maxHeight) style.maxHeight = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  return style
})

const tableStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.height) style.height = '100%'
  return style
})

// ============ 暴露方法 ============
function clearSelection() {
  emit('selectionChange', [], [])
}

function toggleRowSelection(row: any, selected?: boolean) {
  const index = props.data.indexOf(row)
  if (index === -1) return
  const key = getRowKey(row, index)
  const keys = [...props.selectedKeys]
  const idx = keys.indexOf(key)
  const shouldSelect = selected !== undefined ? selected : idx === -1
  if (shouldSelect && idx === -1) {
    keys.push(key)
  } else if (!shouldSelect && idx > -1) {
    keys.splice(idx, 1)
  }
  emit('selectionChange', keys, props.data.filter((r, i) => keys.includes(getRowKey(r, i))))
}

function toggleAllSelection() {
  toggleAll()
}

function setCurrentRow(row: any | null) {
  if (row === null) {
    innerCurrentKey.value = null
    emit('currentChange', null, null)
  } else {
    const index = props.data.indexOf(row)
    if (index > -1) {
      innerCurrentKey.value = getRowKey(row, index)
      emit('currentChange', row, getRowKey(row, index))
    }
  }
}

function scrollToTop() {
  scrollRef.value?.scrollTo({ top: 0 })
}

function scrollToRow(row: any) {
  const index = props.data.indexOf(row)
  if (index > -1 && scrollRef.value) {
    const rowEl = scrollRef.value.querySelectorAll('.app-table__row')[index] as HTMLElement
    rowEl?.scrollIntoView({ block: 'nearest' })
  }
}

function doLayout() {
  // 触发表格重新布局（nextTick 后浏览器自动重排）
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.style.display = 'none'
      scrollRef.value.offsetHeight // 强制重排
      scrollRef.value.style.display = ''
    }
  })
}

defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  clearSort,
  clearFilter,
  sort,
  setCurrentRow,
  toggleExpand,
  scrollTo: scrollToTop,
  scrollToRow,
  doLayout
})

// ============ 初始化 ============
initDefaults()
</script>

<style scoped>
/* 容器 */
.app-table-wrapper {
  width: 100%;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.app-table-wrapper--bordered {
  border: 1px solid var(--color-border);
}

/* 标题栏：左侧标题 + 右侧操作区，两者均可选 */
.app-table__title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  /* 8px 纵向内边距：既给按钮留呼吸感，又不至于让标题栏过高
     （按钮 38px 时整条 56px；无左侧标题的页面也不会比原外部工具栏高太多） */
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
}

.app-table__title-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  /* 字体样式只作用于左侧，避免右侧按钮被加粗 */
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

.app-table__title-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

/* 滚动区 */
.app-table-scroll {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.app-table-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.app-table-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
  border-radius: 3px;
}

.app-table-scroll::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.app-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

/* 尺寸 */
.app-table-wrapper--small .app-table__th { padding: 8px 10px; font-size: 11px; }
.app-table-wrapper--small .app-table__td { padding: 7px 10px; font-size: 12px; }
.app-table-wrapper--small .app-table__th--selection,
.app-table-wrapper--small .app-table__td--selection { width: 36px; min-width: 36px; }
.app-table-wrapper--small .app-table__th--index,
.app-table-wrapper--small .app-table__td--index { width: 44px; min-width: 44px; }

.app-table-wrapper--large .app-table__th { padding: 14px 16px; font-size: 13px; }
.app-table-wrapper--large .app-table__td { padding: 14px 16px; font-size: 14px; }

/* 表头 */
.app-table__thead {
  position: sticky;
  top: 0;
  z-index: 4;
}

.app-table__th {
  padding: 14px 14px;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(12px) saturate(var(--glass-saturate));
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  user-select: none;
  position: relative;
}

/* 列间分割线：中间一段、垂直居中（不顶天立地） */
.app-table__th::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 1px;
  height: 50%;
  background: color-mix(in srgb, var(--color-border) 45%, transparent);
  pointer-events: none;
}

.app-table__th:last-child::after {
  display: none;
}

.app-table__th--center { text-align: center; }
.app-table__th--right { text-align: right; }

.app-table__th--selection,
.app-table__td--selection {
  width: 44px;
  min-width: 44px;
  text-align: center;
  padding: 0 8px;
}

.app-table__th--index,
.app-table__td--index {
  width: 56px;
  min-width: 56px;
  text-align: center;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.app-table__th--group {
  text-align: center;
  border-bottom: 1px solid var(--color-border);
}

.app-table__th-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.app-table__th--center .app-table__th-content { justify-content: center; }
.app-table__th--right .app-table__th-content { justify-content: flex-end; }

/* 固定列阴影 */
.app-table__th--fixed-left::after,
.app-table__td--fixed-left::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(90deg, rgba(0,0,0,0.15), transparent);
  pointer-events: none;
}

.app-table__th--fixed-right::before,
.app-table__td--fixed-right::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(270deg, rgba(0,0,0,0.15), transparent);
  pointer-events: none;
}

.app-table__th--fixed-left,
.app-table__td--fixed-left {
  background: color-mix(in srgb, var(--color-surface) 90%, transparent);
}

.app-table__th--fixed-right,
.app-table__td--fixed-right {
  background: color-mix(in srgb, var(--color-surface) 90%, transparent);
}

/* 表头标题 */
.app-table__th-title {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
}

/* 排序按钮（位于筛选按钮之前，风格与筛选按钮一致） */
.app-table__sort-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.app-table__sort-btn:hover,
.app-table__sort-btn.active {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.app-table__sort-icons {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
}

.app-table__sort-up,
.app-table__sort-down {
  opacity: 0.3;
  transition: var(--transition-fast);
}

.app-table__sort-up.active,
.app-table__sort-down.active {
  opacity: 1;
  color: var(--color-primary);
}

/* 过滤按钮 */
.app-table__filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.app-table__filter-btn:hover,
.app-table__filter-btn.active {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

/* 列宽拖拽 */
.app-table__resizer {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
}

.app-table__resizer:hover {
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
}

/* 表体 */
.app-table__row {
  transition: var(--transition-fast);
}

.app-table-wrapper--stripe .app-table__tbody .app-table__row:nth-child(even) .app-table__td {
  background: color-mix(in srgb, var(--color-primary) 3%, transparent);
}

.app-table__row:hover .app-table__td {
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
}

.app-table__row--selected .app-table__td {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent) !important;
}

.app-table__row--current .app-table__td {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent) !important;
  box-shadow: inset 2px 0 0 var(--color-primary);
}

.app-table__td {
  padding: 11px 14px;
  color: var(--color-text);
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  vertical-align: middle;
  position: relative;
}

.app-table__td--center { text-align: center; }
.app-table__td--right { text-align: right; }

.app-table__row:last-child .app-table__td {
  border-bottom: none;
}

.app-table__ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 展开行 */
.app-table__expanded-cell {
  padding: 16px !important;
  background: color-mix(in srgb, var(--color-primary) 3%, transparent) !important;
}

.app-table__row--expanded .app-table__td:first-child {
  box-shadow: inset 2px 0 0 var(--color-primary);
}

/* Checkbox / Radio */
.app-table__checkbox,
.app-table__radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.app-table__checkbox input,
.app-table__radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.app-table__checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: #fff;
  transition: var(--transition-fast);
}

.app-table__checkbox.is-checked .app-table__checkbox-box {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-table__checkbox.is-indeterminate .app-table__checkbox-box {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-table__checkbox.is-disabled,
.app-table__radio.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-table__radio-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: transparent;
  transition: var(--transition-fast);
  position: relative;
}

.app-table__radio.is-checked .app-table__radio-circle {
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
}

.app-table__radio.is-checked .app-table__radio-circle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 6px var(--color-glow);
}

/* 骨架屏 */
.app-table__skeleton {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-border) 30%, transparent) 25%,
    color-mix(in srgb, var(--color-border) 60%, transparent) 50%,
    color-mix(in srgb, var(--color-border) 30%, transparent) 75%
  );
  background-size: 200% 100%;
  animation: table-skeleton 1.4s ease infinite;
}

@keyframes table-skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 遮罩 loading */
.app-table__overlay-row td {
  position: relative;
}

.app-table__overlay-cell {
  padding: 0 !important;
  position: relative;
}

.app-table__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
  backdrop-filter: blur(2px);
  z-index: 5;
}

/* 空状态 */
.app-table__empty {
  padding: 48px 20px;
  text-align: center;
}

.app-table__empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* 合计行 */
.app-table__tfoot .app-table__td {
  font-weight: 600;
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  border-top: 1px solid var(--color-border);
  border-bottom: none;
}

.app-table__td--summary {
  color: var(--color-primary);
}

/* 底部 */
.app-table__footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.app-table__append {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

/* 过滤面板 */
.app-table__filter-panel {
  width: 200px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px var(--color-glow);
  padding: 8px;
}

.app-table__filter-search {
  margin-bottom: 6px;
}

.app-table__filter-list {
  max-height: 220px;
  overflow-y: auto;
}

/* 让 AppRadio 在筛选列表中纵向铺满 */
.app-table__filter-list :deep(.app-radio) {
  display: flex;
  width: 100%;
}

.app-table__filter-select {
  padding: 2px 0;
}

.app-table__filter-select :deep(.app-select) {
  display: block;
  width: 100%;
}

.app-table__filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text);
  transition: var(--transition-fast);
}

.app-table__filter-item:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.app-table__filter-item--all {
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-primary);
  font-weight: 600;
}

.app-table__filter-item--all :deep(.app-radio__label) {
  color: var(--color-primary);
}

.app-table__filter-item input {
  accent-color: var(--color-primary);
}

.app-table__filter-empty {
  padding: 16px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.app-table__filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid var(--color-border);
}

.app-table__filter-btn-reset,
.app-table__filter-btn-ok {
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
  border: 1px solid var(--color-border);
}

.app-table__filter-btn-reset {
  background: transparent;
  color: var(--color-text-secondary);
}

.app-table__filter-btn-reset:hover {
  border-color: var(--color-text-secondary);
  color: var(--color-text);
}

.app-table__filter-btn-ok {
  background: var(--color-primary);
  color: #000;
  border-color: var(--color-primary);
  font-weight: 600;
}

.app-table__filter-btn-ok:hover {
  box-shadow: 0 0 10px var(--color-glow);
}

/* 过渡 */
.filter-pop-enter-active,
.filter-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.filter-pop-enter-from,
.filter-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
