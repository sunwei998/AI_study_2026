<template>
  <Teleport to="body">
    <Transition name="confirm" appear>
      <div
        v-if="visible"
        class="confirm-overlay"
        @click.self="onCancel"
      >
        <div
          ref="modalEl"
          class="confirm-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <span class="confirm-corner confirm-corner--tl"></span>
          <span class="confirm-corner confirm-corner--tr"></span>
          <span class="confirm-corner confirm-corner--bl"></span>
          <span class="confirm-corner confirm-corner--br"></span>
          <span class="confirm-accent-line"></span>

          <div class="confirm-icon" :class="{ 'confirm-icon--danger': danger }">
            <svg
              v-if="danger"
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message">{{ message }}</p>

          <div class="confirm-actions">
            <button
              type="button"
              class="confirm-btn confirm-btn--ghost"
              @click="onCancel"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              ref="confirmBtn"
              type="button"
              class="confirm-btn"
              :class="danger ? 'confirm-btn--danger' : 'confirm-btn--confirm'"
              :disabled="confirming"
              @click="onConfirm"
            >
              <AppLoading v-if="confirming" :size="14" color="#fff" glow />
              {{ resolvedConfirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLoading from './AppLoading.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    confirming?: boolean
  }>(),
  {
    confirmText: '',
    cancelText: '',
    danger: true,
    confirming: false
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
  cancel: []
}>()

const resolvedConfirmText = computed(() => props.confirmText || t('confirm.ok'))
const resolvedCancelText = computed(() => props.cancelText || t('confirm.cancel'))

const modalEl = ref<HTMLElement | null>(null)
const confirmBtn = ref<HTMLElement | null>(null)

const onCancel = () => {
  if (props.confirming) return
  emit('update:visible', false)
  emit('cancel')
}

const onConfirm = () => {
  if (props.confirming) return
  emit('confirm')
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    onCancel()
    return
  }
  if (e.key === 'Enter' && !e.isComposing) {
    onConfirm()
    return
  }
  if (e.key === 'Tab') {
    const focusables = modalEl.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      nextTick(() => confirmBtn.value?.focus())
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.confirm-modal {
  position: relative;
  width: min(360px, 100%);
  padding: 28px 26px 24px;
  background: var(--color-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 40px var(--color-glow);
}

.confirm-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.confirm-corner--tl {
  top: 8px;
  left: 8px;
  border-top: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-top-left-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.confirm-corner--tr {
  top: 8px;
  right: 8px;
  border-top: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-top-right-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.confirm-corner--bl {
  bottom: 8px;
  left: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-left: 2px solid var(--color-primary);
  border-bottom-left-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.confirm-corner--br {
  bottom: 8px;
  right: 8px;
  border-bottom: 2px solid var(--color-primary);
  border-right: 2px solid var(--color-primary);
  border-bottom-right-radius: 4px;
  box-shadow: 0 0 8px var(--color-glow);
}

.confirm-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.7;
}

.confirm-icon {
  position: relative;
  width: 62px;
  height: 62px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 229, 255, 0.1);
  color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.3), 0 0 24px var(--color-glow);
}

.confirm-icon::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px dashed rgba(0, 229, 255, 0.35);
  animation: confirm-spin 12s linear infinite;
}

.confirm-icon--danger {
  background: rgba(255, 77, 94, 0.12);
  color: #ff4d5e;
  box-shadow: 0 0 0 1px rgba(255, 77, 94, 0.35), 0 0 24px rgba(255, 77, 94, 0.3);
}

.confirm-icon--danger::after {
  border-color: rgba(255, 77, 94, 0.35);
}

.confirm-title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text);
  text-shadow: 0 0 18px var(--color-glow);
}

.confirm-message {
  margin: 0 0 24px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  height: 42px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: var(--transition-fast);
}

.confirm-btn--ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.confirm-btn--ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
  box-shadow: 0 0 12px var(--color-glow);
}

.confirm-btn--danger {
  border: none;
  background: linear-gradient(135deg, #ff5b6a, #ff2d44);
  color: #fff;
  box-shadow:
    0 6px 18px rgba(255, 77, 94, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.confirm-btn--danger:hover {
  filter: brightness(1.08);
  box-shadow: 0 8px 24px rgba(255, 77, 94, 0.55), 0 0 18px rgba(255, 77, 94, 0.45);
  transform: translateY(-1px);
}

.confirm-btn--danger:active {
  transform: translateY(0);
}

.confirm-btn--confirm {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 6px 18px var(--color-glow);
}

.confirm-btn--confirm:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.confirm-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-background),
    0 0 0 4px var(--color-primary);
}

.confirm-enter-active {
  transition: opacity 0.25s ease;
}

.confirm-enter-active .confirm-modal {
  transition:
    transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-leave-active .confirm-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-enter-from {
  opacity: 0;
}

.confirm-enter-from .confirm-modal {
  transform: translateY(16px) scale(0.92);
  opacity: 0;
}

.confirm-leave-to {
  opacity: 0;
}

.confirm-leave-to .confirm-modal {
  transform: translateY(8px) scale(0.96);
  opacity: 0;
}

@keyframes confirm-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>