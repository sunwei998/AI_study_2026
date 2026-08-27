<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TransferRecord, TransferType } from '@/types/admin'
import { downloadTransfer, fetchTransfers } from '@/services/adminService'
import AppTable, { type TableColumn } from '@/components/common/AppTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Pagination from '@/components/common/Pagination.vue'
import { formatFileSize } from '@/utils/download'
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
async function onDownload(row: TransferRecord) {
  if (!row.has_file || downloading.value !== null) return
  downloading.value = row.id
  try {
    await downloadTransfer(row.id, row.filename)
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('common.errorOccurred'), 'error')
  } finally {
    downloading.value = null
  }
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

        <template #column-actions="{ row }">
          <button
            class="row-btn"
            :class="{ 'is-disabled': !row.has_file }"
            :title="row.has_file ? $t('console.downloadFile') : $t('console.noSourceFile')"
            :disabled="!row.has_file || downloading !== null"
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
