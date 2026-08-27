<template>
  <div class="user-menu">
    <button
      class="avatar-btn"
      :title="username"
      @click="open = !open"
    >
      <span v-if="auth.user?.avatar" class="avatar-img"><img :src="auth.user.avatar" alt="" /></span>
      <span v-else class="avatar-char">{{ avatarChar }}</span>
      <span v-if="auth.isManager" class="avatar-admin-dot" :title="$t('console.title')"></span>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="open" class="user-backdrop" @click="open = false"></div>
      </Transition>
      <Transition name="sheet">
        <div
          v-if="open"
          class="user-sheet"
          :class="{ dragging: drag }"
          :style="sheetStyle"
          @click.self="open = false"
        >
          <div
            class="sheet-grab"
            @pointerdown="onGrabDown"
            @pointermove="onGrabMove"
            @pointerup="onGrabUp"
            @pointercancel="onGrabUp"
          >
            <span class="sheet-handle"></span>
          </div>

          <div class="sheet-head">
            <span v-if="auth.user?.avatar" class="sheet-avatar-img"><img :src="auth.user.avatar" alt="" /></span>
            <span v-else class="sheet-avatar">{{ avatarChar }}</span>
            <div class="sheet-user">
              <span class="sheet-name">{{ username }}</span>
              <span class="sheet-role">{{ roleLabel }}</span>
            </div>
          </div>

          <div class="sheet-section">
            <div class="sheet-row">
              <span class="sheet-row-label">
                <AppIcon name="lucide:languages" :size="16" />
                {{ $t('common.switchLanguage') }}
              </span>
              <LanguageSwitcher :size="40" />
            </div>

            <div class="sheet-theme">
              <span class="sheet-row-label">
                <AppIcon name="lucide:palette" :size="16" />
                {{ $t('common.switchTheme') }}
              </span>
              <div class="theme-grid">
                <button
                  v-for="theme in availableThemes"
                  :key="theme"
                  :class="['theme-dot', theme, { active: currentTheme === theme }]"
                  :title="themeName(theme)"
                  @click="selectTheme(theme)"
                ></button>
              </div>
            </div>
          </div>

          <div class="sheet-section">
            <button v-if="auth.isManager" class="sheet-action" @click="goAdmin">
              <AppIcon name="lucide:settings-2" :size="16" />
              <span>{{ $t('console.title') }}</span>
            </button>
            <button class="sheet-action" @click="editProfile">
              <AppIcon name="lucide:user-pen" :size="16" />
              <span>{{ $t('profile.title') }}</span>
            </button>
            <button class="sheet-action sheet-action--danger" @click="requestLogout">
              <AppIcon name="lucide:log-out" :size="16" />
              <span>{{ $t('auth.logout') }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { applyTheme } from '@/styles/themes'
import LanguageSwitcher from '@/components/chat/LanguageSwitcher.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { ROLE_LABEL_KEYS } from '@/utils/roles'

const emit = defineEmits<{ (e: 'logout'): void; (e: 'edit-profile'): void }>()

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const store = useChatStore()

const open = ref(false)

const username = computed(() => auth.user?.username || '')
const avatarChar = computed(() => (username.value ? username.value.charAt(0).toUpperCase() : '?'))
const roleLabel = computed(() => {
  const role = auth.user?.role
  const key = role ? ROLE_LABEL_KEYS[role] : 'console.roleUser'
  return t(key)
})

const currentTheme = computed(() => store.currentTheme)
const availableThemes = computed(() => store.availableThemes as ThemeType[])

const themeName = (theme: ThemeType): string => {
  const names: Record<ThemeType, string> = {
    dark: t('theme.dark'),
    light: t('theme.light'),
    neon: t('theme.neon'),
    magenta: t('theme.magenta'),
    midnight: t('theme.midnight'),
    amber: t('theme.amber'),
    mint: t('theme.mint'),
    sand: t('theme.sand')
  }
  return names[theme]
}

const selectTheme = (theme: ThemeType) => {
  store.setTheme(theme)
  applyTheme(theme)
}

const goAdmin = () => {
  open.value = false
  router.push('/admin')
}

const editProfile = () => {
  open.value = false
  emit('edit-profile')
}

const requestLogout = () => {
  open.value = false
  emit('logout')
}

const DRAG_THRESHOLD = 110
const drag = ref<{ startY: number; dy: number; lastY: number; lastT: number; velocity: number } | null>(null)

const sheetStyle = computed(() =>
  drag.value && drag.value.dy > 0 ? { transform: `translateY(${drag.value.dy}px)` } : undefined
)

const onGrabDown = (e: PointerEvent) => {
  drag.value = { startY: e.clientY, dy: 0, lastY: e.clientY, lastT: Date.now(), velocity: 0 }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

const onGrabMove = (e: PointerEvent) => {
  if (!drag.value) return
  e.preventDefault()
  const dy = Math.max(0, e.clientY - drag.value.startY)
  const now = Date.now()
  const dt = now - drag.value.lastT
  if (dt > 0) drag.value.velocity = (e.clientY - drag.value.lastY) / dt
  drag.value.lastY = e.clientY
  drag.value.lastT = now
  drag.value.dy = dy
}

const onGrabUp = () => {
  if (!drag.value) return
  const { dy, velocity } = drag.value
  drag.value = null
  if (dy > DRAG_THRESHOLD || (dy > 40 && velocity > 0.55)) {
    open.value = false
  }
}
</script>

<script lang="ts">
import type { ThemeType } from '@/types/chat'
</script>

<style scoped>
.user-menu {
  position: relative;
}

.avatar-btn {
  position: relative;
  width: var(--control-h);
  height: var(--control-h);
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background:
    linear-gradient(var(--color-glass), var(--color-glass)) padding-box,
    linear-gradient(135deg, var(--color-primary), var(--color-accent)) border-box;
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-normal);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-btn:hover {
  box-shadow: 0 0 14px var(--color-glow), inset 0 0 12px var(--color-glow);
  transform: translateY(-1px);
}

.avatar-char {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  text-shadow: 0 0 10px var(--color-glow);
}

.avatar-admin-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-overlay);
  box-shadow: 0 0 8px var(--color-accent);
}

.user-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.user-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1201;
  border-radius: 18px 18px 0 0;
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  border-bottom: none;
  box-shadow: var(--shadow-lg), inset 0 0 18px var(--color-glow), inset 0 1px 0 var(--glass-edge);
  padding: 0 16px calc(16px + var(--safe-bottom, 0px));
  max-height: 80vh;
  overflow-y: auto;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

.user-sheet.dragging {
  transition: none;
}

.sheet-grab {
  width: 100%;
  padding: 10px 0 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
}

.sheet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 16px var(--color-glow);
  overflow: hidden;
}

.sheet-avatar-img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--color-glow);
}

.sheet-avatar-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.sheet-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sheet-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-role {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.sheet-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}

.sheet-section:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}

.sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sheet-row-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text);
}

.sheet-theme {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  justify-items: center;
  gap: 10px;
  padding: 4px 0;
}

.theme-dot {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.theme-dot:hover {
  transform: scale(1.08);
}

.theme-dot.active {
  border-color: var(--color-text);
  box-shadow: 0 0 12px var(--color-glow);
}

.theme-dot.dark {
  background: linear-gradient(135deg, #070a1a 0%, #00e5ff 50%, #7c5cff 100%);
}

.theme-dot.light {
  background: linear-gradient(135deg, #f9fafb 0%, #4f46e5 50%, #7c3aed 100%);
}

.theme-dot.neon {
  background: linear-gradient(135deg, #0a0918 0%, #00ff88 50%, #ff2ea6 100%);
}

.theme-dot.magenta {
  background: linear-gradient(135deg, #120510 0%, #ff2d95 50%, #00e5ff 100%);
}

.theme-dot.midnight {
  background: linear-gradient(135deg, #0a0714 0%, #b388ff 50%, #ff79c6 100%);
}

.theme-dot.amber {
  background: linear-gradient(135deg, #140d04 0%, #ffb74d 50%, #ff6d00 100%);
}

.theme-dot.mint {
  background: linear-gradient(135deg, #001a12 0%, #00b359 70%, #9dffd4 100%);
}

.theme-dot.sand {
  background: linear-gradient(135deg, #faf4e8 0%, #7a4f1f 50%, #8b3a0a 100%);
}

.sheet-action {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition-fast);
  text-align: left;
}

.sheet-action:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.sheet-action--danger {
  color: #ff5b6a;
}

.sheet-action--danger:hover {
  border-color: #ff5b6a;
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0.6;
}
</style>