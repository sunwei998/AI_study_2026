<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TransferRecord, TransferType } from '@/types/admin'
import { downloadTransfer, exportModelsCsv, fetchTransfers } from '@/services/adminService'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppTag, { type AppTagStatus } from '@/components/common/AppTag.vue'
import Pagination from '@/components/common/Pagination.vue'
import { downloadBlob, formatFileSize } from '@/utils/download'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ type: TransferType }>()

const { t } = useI18n()
const { showToast } = useToast()

const records = ref<TransferRecord[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const isImport = computed(() => props.type === 'import')

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
    formatter: (row: TransferRecord) => row.username || '-'
  },
  {
    key: 'status',
    title: t('console.transferStatus'),
    width: 110,
    align: 'center',
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
    formatter: (row: TransferRecord) => formatTime(row.created_at)
  },
  { key: 'actions', title: t('console.actions'), width: 110, align: 'center', fixed: 'right' }
])

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchTransfers(props.type, { page: currentPage.value, pageSize: pageSize.value })
    records.value = res.items
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
}

watch(currentPage, load)
watch(pageSize, () => {
  currentPage.value = 1
  load()
})
watch(
  () => props.type,
  () => {
    currentPage.value = 1
    load()
  }
)

const downloading = ref<number | null>(null)

// 导入：服务端保留源文件，可下载；导出：不存产物，始终可重新生成
function canDownload(row: TransferRecord): boolean {
  return isImport.value ? row.has_file : true
}

async function onDownload(row: TransferRecord) {
  if (!canDownload(row) || downloading.value !== null) return
  downloading.value = row.id
  try {
    if (isImport.value) {
      await downloadTransfer(row.id, row.filename)
    } else {
      const blob = await exportModelsCsv()
      downloadBlob(row.filename, blob)
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    downloading.value = null
  }
}

function downloadTitle(row: TransferRecord): string {
  if (isImport.value) {
    if (!row.has_file) return t('console.noSourceFile')
    return hasErrors(row) ? t('console.downloadWithErrors') : t('console.downloadFile')
  }
  return t('console.downloadRegenerate')
}

load()
</script>

<template>
  <div class="admin-transfer-records">
    <div v-if="error" class="page-error">{{ error }}</div>

    <div class="tr-table-wrap">
      <AppTable
        :columns="columns"
        :data="records"
        :loading="loading"
        loading-type="skeleton"
        :skeleton-rows="8"
        :empty-text="isImport ? $t('console.noImportRecords') : $t('console.noExportRecords')"
        row-key="id"
        size="small"
      >
        <template #column-filename="{ row }">
          <span class="tr-file" :title="row.filename">
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
        </template>
      </AppTable>
    </div>

    <Pagination :total="total" v-model:page="currentPage" v-model:page-size="pageSize" />
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

.tr-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tr-file-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
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
