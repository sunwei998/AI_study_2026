<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TransferRecord, TransferType } from '@/types/admin'
import {
  deleteTransfer,
  downloadTransfer,
  fetchAdmins,
  fetchTransfers
} from '@/services/adminService'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppTag, { type AppTagStatus } from '@/components/common/AppTag.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import { formatFileSize } from '@/utils/download'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{ type: TransferType }>()

const { t } = useI18n()
const { showToast } = useToast()
const auth = useAuthStore()

const records = ref<TransferRecord[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 筛选 / 排序状态（服务端）
const statusFilter = ref<string[]>([])
const usernameFilter = ref<string[]>([])
const sortFilter = ref<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null })

// 操作人筛选下拉框选项：所有管理员
const admins = ref<string[]>([])

const isImport = computed(() => props.type === 'import')

// 源文件/产物保留时长（小时），由后端按数据字典配置返回，用于提示语说明清理范围
const retentionHours = ref(720)
const exportRetentionHours = ref(720)
const retentionTip = computed(() =>
  isImport.value
    ? t('console.importRetentionTip', {
        hours: retentionHours.value,
        days: retentionHours.value / 24
      })
    : t('console.exportRetentionTip', {
        hours: exportRetentionHours.value,
        days: exportRetentionHours.value / 24
      })
)

function formatTime(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 记录状态 → AppTag 状态/文案：导入 success/partial/failed，导出 success/failed
function statusTag(row: TransferRecord): { status: AppTagStatus; label: string } {
  switch (row.status) {
    case 'success':
      return { status: 'success', label: t('console.statusSuccess') }
    case 'partial':
      return { status: 'warning', label: t('console.statusPartial') }
    case 'failed':
      return { status: 'error', label: t('console.statusFailed') }
    default:
      return { status: 'none', label: t('console.statusUnknown') }
  }
}

// 失败/部分失败的导入记录：下载文件带错误分析列
function hasErrors(row: TransferRecord): boolean {
  return isImport.value && (row.status === 'failed' || row.status === 'partial')
}

// 状态筛选选项：导入含 partial，导出不含
const statusFilters = computed(() => {
  const list = [
    { text: t('console.statusSuccess'), value: 'success' },
    { text: t('console.statusPartial'), value: 'partial' },
    { text: t('console.statusFailed'), value: 'failed' }
  ]
  return isImport.value ? list : list.filter((f) => f.value !== 'partial')
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'filename',
    title: t('console.transferFile'),
    ellipsis: true,
    formatter: (row: TransferRecord) => row.filename
  },
  {
    key: 'username',
    title: t('console.transferOperator'),
    width: 140,
    filterable: true,
    filterType: 'select',
    filterMultiple: true,
    filters: admins.value.map((a) => ({ text: a, value: a })),
    formatter: (row: TransferRecord) => row.username || '-'
  },
  {
    key: 'status',
    title: t('console.transferStatus'),
    width: 110,
    align: 'center',
    filterable: true,
    filterType: isImport.value ? 'checkbox' : 'radio',
    filters: statusFilters.value,
    formatter: (row: TransferRecord) => statusTag(row).label
  },
  {
    key: 'file_size',
    title: t('console.transferSize'),
    width: 110,
    align: 'right',
    className: 'cell-num',
    formatter: (row: TransferRecord) => formatFileSize(row.file_size)
  },
  {
    key: 'remark',
    title: t('console.transferRemark'),
    ellipsis: true,
    formatter: (row: TransferRecord) => row.remark || '-'
  },
  {
    key: 'created_at',
    title: t('console.transferTime'),
    width: 180,
    className: 'cell-time',
    sortable: true,
    formatter: (row: TransferRecord) => formatTime(row.created_at)
  },
  { key: 'actions', title: t('console.actions'), width: auth.isSuperAdmin ? 140 : 76, align: 'center', fixed: 'right' }
])

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchTransfers(props.type, {
      page: currentPage.value,
      pageSize: pageSize.value,
      statuses: statusFilter.value.length ? statusFilter.value : undefined,
      usernames: usernameFilter.value.length ? usernameFilter.value : undefined,
      sort: sortFilter.value.order ? sortFilter.value.key : undefined,
      order: sortFilter.value.order ?? undefined
    })
    records.value = res.items
    total.value = res.total
    if (res.retention_hours) retentionHours.value = res.retention_hours
    if (res.export_retention_hours) exportRetentionHours.value = res.export_retention_hours
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

// 服务端排序
function onServerSort(key: string, order: 'asc' | 'desc' | null) {
  sortFilter.value = { key, order }
  if (currentPage.value === 1) load()
  else currentPage.value = 1
}

// 服务端筛选：状态（导入多选/导出单选）、操作人多选下拉
function onFilterChange(filters: Record<string, any[]>) {
  statusFilter.value = (filters.status ?? []).map(String)
  usernameFilter.value = (filters.username ?? []).map(String)
  if (currentPage.value === 1) load()
  else currentPage.value = 1
}

watch(currentPage, () => {
  if (!resetting) load()
})
watch(pageSize, () => {
  if (resetting) return
  currentPage.value = 1
  load()
})
watch(
  () => props.type,
  () => {
    // 切换导入/导出时重置筛选与排序，避免状态串页
    statusFilter.value = []
    usernameFilter.value = []
    sortFilter.value = { key: '', order: null }
    currentPage.value = 1
    load()
  }
)

// ============ 重置（逻辑同其他管理页） ============
const tableRef = ref<InstanceType<typeof AppTable> | null>(null)
let resetting = false

function onReset() {
  resetting = true
  try {
    statusFilter.value = []
    usernameFilter.value = []
    sortFilter.value = { key: '', order: null }
    pageSize.value = 10
    currentPage.value = 1
    tableRef.value?.resetState()
  } finally {
    resetting = false
  }
  load()
}

const downloading = ref<number | null>(null)

// 导入源文件 / 导出产物均按保留期存盘：保留期内可下载，超期清理后 has_file=false
function canDownload(row: TransferRecord): boolean {
  return row.has_file
}

async function onDownload(row: TransferRecord) {
  if (!canDownload(row) || downloading.value !== null) return
  downloading.value = row.id
  try {
    await downloadTransfer(row.id, row.filename)
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    downloading.value = null
  }
}

function downloadTitle(row: TransferRecord): string {
  if (!row.has_file) return t('console.noSourceFile')
  if (isImport.value && hasErrors(row)) return t('console.downloadWithErrors')
  return isImport.value ? t('console.downloadFile') : t('console.downloadSnapshot')
}

// ============ 删除（二次确认） ============
const confirmVisible = ref(false)
const confirmLoading = ref(false)
const deletingId = ref<number | null>(null)
const deletingName = ref('')

const askDelete = (row: TransferRecord) => {
  deletingId.value = row.id
  deletingName.value = row.filename
  confirmVisible.value = true
}

const doDelete = async () => {
  if (deletingId.value == null) return
  confirmLoading.value = true
  try {
    await deleteTransfer(deletingId.value)
    showToast(t('console.deleted'), 'success')
    confirmVisible.value = false
    await load()
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
    confirmVisible.value = false
  } finally {
    confirmLoading.value = false
  }
}

// 操作人筛选下拉框选项：所有管理员
async function loadAdmins() {
  try {
    admins.value = await fetchAdmins()
  } catch {
    /* 静默失败，下拉框为空即可 */
  }
}

loadAdmins()
load()
</script>

<template>
  <div class="admin-transfer-records">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div class="tr-table-wrap">
      <AppTable
        ref="tableRef"
        :columns="columns"
        :data="records"
        :loading="loading"
        loading-type="skeleton"
        :skeleton-rows="8"
        :empty-text="isImport ? $t('console.noImportRecords') : $t('console.noExportRecords')"
        row-key="id"
        size="small"
        custom-sort
        :sort-method="onServerSort"
        @filter-change="onFilterChange"
      >
        <template #table-title-left>
          <span class="tr-retention-hint">
            <AppIcon name="lucide:info" :size="12" />
            {{ retentionTip }}
          </span>
        </template>

        <template #table-title-right>
          <AppButton
            size="middle"
            type="default"
            :title="$t('console.resetFilters')"
            @click="onReset"
          >
            <AppIcon name="lucide:rotate-ccw" :size="15" />
          </AppButton>
        </template>

        <template #column-filename="{ row }">
          <span
            class="tr-file"
            :class="{ 'is-purged': !row.has_file }"
            :title="!row.has_file ? $t('console.sourceFilePurged') : row.filename"
          >
            <AppIcon name="lucide:file-text" :size="14" class="tr-file-icon" />
            {{ row.filename }}
          </span>
        </template>

        <template #column-status="{ row }">
          <AppTag :status="statusTag(row).status" size="small">
            {{ statusTag(row).label }}
          </AppTag>
        </template>

        <template #column-actions="{ row }">
          <div class="row-actions">
            <button
              class="row-btn"
              :class="{ 'is-disabled': !canDownload(row) }"
              :title="downloadTitle(row)"
              :disabled="!canDownload(row) || downloading !== null"
              @click="onDownload(row)"
            >
              <AppIcon
                v-if="downloading === row.id"
                name="lucide:loader-2"
                :size="15"
                class="spin"
              />
              <AppIcon v-else name="lucide:download" :size="15" />
            </button>
            <button
              v-if="auth.isSuperAdmin"
              class="row-btn row-btn--danger"
              :title="$t('console.delete')"
              @click="askDelete(row)"
            >
              <AppIcon name="lucide:trash-2" :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
    </div>

    <Pagination :total="total" v-model:page="currentPage" v-model:page-size="pageSize" />

    <ConfirmModal
      v-model:visible="confirmVisible"
      :title="$t('console.deleteTransferTitle')"
      :message="$t('console.deleteTransferMessage', { name: deletingName })"
      :confirming="confirmLoading"
      danger
      @confirm="doDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.admin-transfer-records {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
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

.tr-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tr-table-wrap :deep(.app-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tr-table-wrap :deep(.app-table-scroll) {
  flex: 1;
  min-height: 0;
}

/* 与重置按钮同行的保留期提示语：弱化、不抢眼 */
.tr-retention-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-secondary);
  opacity: 0.75;
  letter-spacing: 0.02em;
}

.tr-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tr-file-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* 源文件已过期清理、仅保留记录：文件名加删除线并弱化 */
.tr-file.is-purged {
  color: var(--color-text-secondary);
  text-decoration-line: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in srgb, var(--color-text-secondary) 75%, transparent);
  opacity: 0.75;
}

.tr-file.is-purged .tr-file-icon {
  opacity: 0.6;
}

.row-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.row-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.row-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.row-btn--danger:hover {
  color: #ff5b6a;
  border-color: #ff5b6a;
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.45);
}

.row-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.row-btn:disabled {
  cursor: not-allowed;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(.cell-num) {
  font-family: var(--font-mono);
}

:deep(.cell-time) {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
