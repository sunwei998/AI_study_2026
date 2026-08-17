<template>
  <span
    class="loading"
    :class="{ 'loading--glow': glow }"
    :style="{
      width: size + 'px',
      height: size + 'px',
      ...(color ? { color } : {})
    }"
    role="status"
    aria-label="loading"
  >
    <svg viewBox="0 0 24 24" fill="none" :width="size" :height="size">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        stroke-opacity="0.15"
        stroke-width="3"
      />
      <circle
        class="loading-spin"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="17 39.5"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
    color?: string
    glow?: boolean
  }>(),
  { size: 16, glow: true }
)
</script>

<style scoped>
.loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  line-height: 0;
  vertical-align: middle;
}

.loading svg {
  display: block;
  animation: loading-rotate 0.8s linear infinite;
}

.loading--glow {
  filter: drop-shadow(0 0 4px var(--color-glow));
}

@keyframes loading-rotate {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}
</style>