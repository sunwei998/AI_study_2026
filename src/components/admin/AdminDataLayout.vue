<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminTabLayout from '@/components/admin/AdminTabLayout.vue'

const { t } = useI18n()

const tabs = computed(() => [
  { key: 'import', icon: 'lucide:upload', label: t('console.importManage'), path: '/admin/data/import', name: 'admin-data-import' },
  { key: 'export', icon: 'lucide:download', label: t('console.exportManage'), path: '/admin/data/export', name: 'admin-data-export' }
])
</script>

<template>
  <AdminTabLayout :tabs="tabs" />
</template>
