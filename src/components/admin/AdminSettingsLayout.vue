<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminTabLayout from '@/components/admin/AdminTabLayout.vue'

const { t } = useI18n()

const tabs = computed(() => [
  { key: 'base', icon: 'lucide:book-open', label: t('console.settingsBase'), path: '/admin/settings/base', name: 'admin-settings-base' },
  { key: 'search', icon: 'lucide:search', label: t('console.settingsSearch'), path: '/admin/settings/search', name: 'admin-settings-search' },
  { key: 'dict', icon: 'lucide:table', label: t('console.dictConfig'), path: '/admin/settings/dict', name: 'admin-settings-dict' }
])
</script>

<template>
  <AdminTabLayout :tabs="tabs" />
</template>
