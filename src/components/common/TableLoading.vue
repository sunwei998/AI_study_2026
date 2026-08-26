<template>
  <div class="table-loading" role="status" aria-label="loading">
    <div class="tl-header">
      <span class="tl-spinner"></span>
      <span class="tl-text">{{ text }}</span>
    </div>
    <div class="tl-skeleton">
      <div v-for="i in rows" :key="i" class="tl-row">
        <div
          v-for="j in cols"
          :key="j"
          class="tl-cell"
          :style="{ width: cellWidth(j) + '%' }"
        ></div>
      </div>
    </div>
    <div class="tl-scanline"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    cols?: number
    text?: string
  }>(),
  { rows: 6, cols: 5, text: '数据加载中…' }
)

// 列宽分布：首尾列稍窄，中间列稍宽，模拟真实表格
function cellWidth(col: number): number {
  if (col === 1) return 12
  if (col === 5) return 10
  return (100 - 22) / 3
}
</script>

<style scoped>
.table-loading {
  position: relative;
  width: 100%;
  padding: 20px 16px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.tl-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.tl-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: tl-spin 0.7s linear infinite;
  filter: drop-shadow(0 0 4px var(--color-glow));
  flex-shrink: 0;
}

.tl-text {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.tl-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tl-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.tl-cell {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-glass) 0%,
    color-mix(in srgb, var(--color-primary) 8%, var(--color-glass)) 50%,
    var(--color-glass) 100%
  );
  background-size: 200% 100%;
  animation: tl-shimmer 1.6s ease-in-out infinite;
}

.tl-row:nth-child(even) .tl-cell {
  animation-delay: 0.3s;
}

.tl-row:nth-child(3n) .tl-cell {
  animation-delay: 0.6s;
}

/* 科技风扫描线 */
.tl-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-primary),
    transparent
  );
  opacity: 0.5;
  animation: tl-scan 2.5s linear infinite;
  pointer-events: none;
}

@keyframes tl-spin {
  to { transform: rotate(360deg); }
}

@keyframes tl-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes tl-scan {
  0% { top: 0; opacity: 0; }
  10% { opacity: 0.5; }
  90% { opacity: 0.5; }
  100% { top: 100%; opacity: 0; }
}
</style>
