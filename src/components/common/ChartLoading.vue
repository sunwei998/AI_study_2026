<template>
  <div class="chart-loading" role="status" aria-label="loading">
    <div class="cl-orbit">
      <div class="cl-ring cl-ring--outer"></div>
      <div class="cl-ring cl-ring--inner"></div>
      <div class="cl-core"></div>
      <div class="cl-dot cl-dot--1"></div>
      <div class="cl-dot cl-dot--2"></div>
      <div class="cl-dot cl-dot--3"></div>
    </div>
    <div class="cl-text">{{ text }}</div>
    <div class="cl-grid"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
  }>(),
  { text: '图表渲染中…' }
)
</script>

<style scoped>
.chart-loading {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* 轨道容器 */
.cl-orbit {
  position: relative;
  width: 72px;
  height: 72px;
}

/* 双环 */
.cl-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid transparent;
}

.cl-ring--outer {
  inset: 0;
  border-top-color: var(--color-primary);
  border-right-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  animation: cl-spin 1.4s linear infinite;
  filter: drop-shadow(0 0 6px var(--color-glow));
}

.cl-ring--inner {
  inset: 12px;
  border-bottom-color: var(--color-accent);
  border-left-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  animation: cl-spin-reverse 1s linear infinite;
  filter: drop-shadow(0 0 4px var(--color-glow));
}

/* 中心核心 */
.cl-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow:
    0 0 8px var(--color-primary),
    0 0 16px var(--color-glow);
  animation: cl-pulse 1.2s ease-in-out infinite;
}

/* 轨道粒子 */
.cl-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
}

.cl-dot--1 {
  top: 0;
  left: 50%;
  margin-left: -2px;
  animation: cl-orbit-1 1.4s linear infinite;
}

.cl-dot--2 {
  bottom: 4px;
  right: 8px;
  animation: cl-orbit-2 1.4s linear infinite;
}

.cl-dot--3 {
  bottom: 4px;
  left: 8px;
  animation: cl-orbit-3 1.4s linear infinite;
}

.cl-text {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  text-shadow: 0 0 8px var(--color-glow);
}

/* 背景科技网格 */
.cl-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--color-primary) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 5%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.6;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}

@keyframes cl-spin {
  to { transform: rotate(360deg); }
}

@keyframes cl-spin-reverse {
  to { transform: rotate(-360deg); }
}

@keyframes cl-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}

@keyframes cl-orbit-1 {
  0% { transform: rotate(0deg) translateY(-36px) rotate(0deg); }
  100% { transform: rotate(360deg) translateY(-36px) rotate(-360deg); }
}

@keyframes cl-orbit-2 {
  0% { transform: rotate(120deg) translateY(-36px) rotate(-120deg); }
  100% { transform: rotate(480deg) translateY(-36px) rotate(-480deg); }
}

@keyframes cl-orbit-3 {
  0% { transform: rotate(240deg) translateY(-36px) rotate(-240deg); }
  100% { transform: rotate(600deg) translateY(-36px) rotate(-600deg); }
}
</style>
