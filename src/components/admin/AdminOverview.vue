<template>
  <div class="admin-overview">
    <div v-if="error" class="ov-error">{{ error }}</div>
    <div v-if="loading" class="ov-loading">
      <AppLoading :size="28" glow />
    </div>
    <template v-else>
      <div class="ov-cards">
        <div v-for="card in cards" :key="card.key" class="ov-card">
          <AppIcon :name="card.icon" :size="22" glow />
          <div class="ov-card-value">{{ card.value }}</div>
          <div class="ov-card-label">{{ card.label }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminStats } from '@/types/admin'
import { fetchStats } from '@/services/adminService'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const { t } = useI18n()

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const error = ref('')

const cards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { key: 'users', icon: 'lucide:users', label: t('console.statUsers'), value: String(s.users) },
    { key: 'activeToday', icon: 'lucide:activity', label: t('console.statActiveToday'), value: String(s.active_today) },
    { key: 'active7d', icon: 'lucide:flame', label: t('console.statActive7d'), value: String(s.active_7d) },
    { key: 'requests', icon: 'lucide:send', label: t('console.statRequests'), value: String(s.requests) },
    { key: 'todayTokens', icon: 'lucide:zap', label: t('console.statTodayTokens'), value: formatNumber(s.today_tokens) },
    { key: 'totalTokens', icon: 'lucide:database', label: t('console.statTotalTokens'), value: formatNumber(s.total_tokens) }
  ]
})

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

onMounted(async () => {
  try {
    stats.value = await fetchStats()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ov-error {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 77, 94, 0.1);
  border: 1px solid rgba(255, 77, 94, 0.4);
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
}

.ov-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.ov-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.ov-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
}

.ov-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-glow);
  transform: translateY(-2px);
}

.ov-card-value {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  text-shadow: 0 0 16px var(--color-glow);
}

.ov-card-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}
</style>