<template>
  <Teleport to="body">
    <Transition name="profile-fade">
      <div
        v-if="visible"
        class="profile-overlay"
        :class="{ 'profile-overlay--mobile': device.isMobile }"
        @click.self="onCancel"
      >
        <div
          class="profile-panel liquid-edge"
          :class="{ 'profile-panel--mobile': device.isMobile, dragging: drag }"
          :style="sheetStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('profile.title')"
        >
          <span class="profile-accent"></span>
          <div v-if="device.isMobile" class="profile-grab" @pointerdown="onGrabDown" @pointermove="onGrabMove" @pointerup="onGrabUp" @pointercancel="onGrabUp">
            <span class="profile-handle"></span>
          </div>

          <div class="profile-header">
            <h3 class="profile-title">{{ $t('profile.title') }}</h3>
            <button class="profile-close" :title="$t('profile.cancel')" @click="onCancel">
              <AppIcon name="lucide:x" :size="18" />
            </button>
          </div>

          <div class="profile-body">
            <div class="profile-avatar-block">
              <button class="profile-avatar" type="button" @click="pickAvatar" :title="$t('profile.changeAvatar')">
                <img v-if="avatar" :src="avatar" class="profile-avatar-img" alt="" />
                <span v-else class="profile-avatar-char">{{ avatarChar }}</span>
                <span class="profile-avatar-badge">
                  <AppIcon name="lucide:camera" :size="14" />
                </span>
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="profile-file"
                @change="onFileChange"
              />
              <button v-if="avatar" class="profile-avatar-remove" type="button" @click="removeAvatar">
                {{ $t('profile.removeAvatar') }}
              </button>
            </div>

            <div class="profile-form">
              <div class="profile-group">
                <label class="profile-field">
                  <span class="profile-label">{{ $t('profile.username') }}</span>
                  <input
                    v-model="username"
                    class="profile-input"
                    :class="{ 'profile-input--error': usernameError, 'profile-input--ok': usernameOk }"
                    :maxlength="32"
                    :disabled="usernameLocked"
                    :placeholder="usernameLocked ? $t('profile.usernameLimitReached') : ''"
                    @input="onUsernameInput"
                    @blur="onUsernameBlur"
                  />
                  <span v-if="usernameHint" class="profile-hint" :class="usernameHintClass">
                    {{ usernameHint }}
                  </span>
                </label>

                <label class="profile-field">
                  <span class="profile-label">{{ $t('profile.age') }}</span>
                  <input
                    v-model="age"
                    class="profile-input"
                    type="number"
                    min="1"
                    max="120"
                    inputmode="numeric"
                    :placeholder="String(120)"
                  />
                </label>

                <div class="profile-field">
                  <span class="profile-label">{{ $t('profile.gender') }}</span>
                  <div class="profile-segmented">
                    <button
                      v-for="g in genderOptions"
                      :key="g.value"
                      type="button"
                      :class="['profile-seg-item', { active: gender === g.value }]"
                      @click="gender = g.value"
                    >
                      {{ g.label }}
                    </button>
                  </div>
                </div>

                <div class="profile-field">
                  <span class="profile-label">{{ $t('profile.region') }}</span>
                  <RegionSelect v-model="region" :vertical="device.isMobile" />
                </div>
              </div>

              <p v-if="error" class="profile-error">{{ error }}</p>
            </div>
          </div>

          <div class="profile-footer">
            <button class="profile-btn profile-btn--save" type="button" :disabled="saving" @click="save">
              <AppLoading v-if="saving" :size="16" color="#fff" />
              {{ saving ? $t('profile.saving') : $t('profile.save') }}
            </button>
            <button class="profile-btn profile-btn--cancel" type="button" :disabled="saving" @click="onCancel">
              {{ $t('profile.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <AvatarCropDialog v-model:visible="cropVisible" :image="cropImage" @confirm="onCropConfirm" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useDevice } from '@/composables/useDevice'
import { useToast } from '@/composables/useToast'
import { checkUsername } from '@/services/authService'
import { readFileAsDataUrl } from '@/utils/image'
import RegionSelect, { type RegionValue } from '@/components/common/RegionSelect.vue'
import AvatarCropDialog from '@/components/chat/AvatarCropDialog.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppLoading from '@/components/common/AppLoading.vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const { t } = useI18n()
const auth = useAuthStore()
const device = useDevice()
const { showToast } = useToast()

const username = ref('')
const age = ref<string | number>('')
const gender = ref('')
const region = ref<RegionValue>({ province: '', city: '', district: '' })
const avatar = ref('')

const saving = ref(false)
const error = ref('')
const usernameChecking = ref(false)
const usernameAvailable = ref<boolean | null>(null)
let usernameTimer: ReturnType<typeof setTimeout> | null = null

const fileInput = ref<HTMLInputElement | null>(null)
const cropVisible = ref(false)
const cropImage = ref('')

const usernameLocked = computed(() => (auth.user?.username_changes_left ?? 3) <= 0)

const avatarChar = computed(() =>
  (username.value || auth.user?.username || '?').charAt(0).toUpperCase()
)

const genderOptions = computed(() => [
  { value: 'male', label: t('auth.genderMale') },
  { value: 'female', label: t('auth.genderFemale') },
  { value: 'other', label: t('auth.genderOther') }
])

const initForm = () => {
  const u = auth.user
  username.value = u?.username ?? ''
  age.value = u?.age != null ? String(u.age) : ''
  gender.value = u?.gender ?? ''
  region.value = { province: u?.province ?? '', city: u?.city ?? '', district: u?.district ?? '' }
  avatar.value = u?.avatar ?? ''
  error.value = ''
  usernameAvailable.value = null
  if (usernameTimer) clearTimeout(usernameTimer)
}

watch(
  () => auth.user?.username,
  () => {
    if (auth.user?.username) username.value = auth.user.username
  }
)

watch(
  () => props.visible,
  (v) => {
    if (v) initForm()
  }
)

const usernameHint = computed(() => {
  if (usernameLocked.value) return t('profile.usernameLimitReached')
  if (usernameChecking.value) return t('auth.usernameChecking')
  if (usernameAvailable.value === false) return t('auth.usernameTaken')
  if (usernameAvailable.value === true && username.value !== auth.user?.username)
    return t('auth.usernameAvailable')
  if (username.value === auth.user?.username) {
    const left = auth.user?.username_changes_left ?? 3
    return t('profile.usernameChangesLeft', { count: left })
  }
  return ''
})

const usernameHintClass = computed(() => {
  if (usernameAvailable.value === false || usernameLocked.value) return 'profile-hint--error'
  if (usernameAvailable.value === true) return 'profile-hint--ok'
  return ''
})

const usernameError = computed(() => usernameAvailable.value === false)
const usernameOk = computed(() => usernameAvailable.value === true)

const checkUsernameAsync = async (val: string) => {
  usernameChecking.value = true
  usernameAvailable.value = null
  try {
    const ok = await checkUsername(val)
    usernameAvailable.value = ok
  } catch {
    usernameAvailable.value = null
  } finally {
    usernameChecking.value = false
  }
}

const onUsernameInput = () => {
  if (usernameTimer) clearTimeout(usernameTimer)
  const val = username.value.trim()
  if (val === (auth.user?.username ?? '') || val.length < 3) {
    usernameChecking.value = false
    usernameAvailable.value = null
    return
  }
  usernameTimer = setTimeout(() => {
    if (val.length >= 3) checkUsernameAsync(val)
  }, 450)
}

const onUsernameBlur = () => {
  const val = username.value.trim()
  if (val.length >= 3 && val !== (auth.user?.username ?? '')) {
    checkUsernameAsync(val)
  }
}

const pickAvatar = () => {
  fileInput.value?.click()
}

const onFileChange = async () => {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  try {
    cropImage.value = await readFileAsDataUrl(file)
    cropVisible.value = true
  } catch (err) {
    const msg = err instanceof Error ? t(`profile.${err.message}`) : t('profile.avatarReadFailed')
    showToast(msg, 'error')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

const onCropConfirm = (dataUrl: string) => {
  avatar.value = dataUrl
  cropVisible.value = false
}

const removeAvatar = () => {
  avatar.value = ''
}

const save = async () => {
  if (saving.value) return
  const finalName = username.value.trim()
  if (finalName.length < 3 || finalName.length > 32) {
    error.value = t('profile.usernameInvalid')
    return
  }
  if (usernameAvailable.value === false) {
    error.value = t('auth.usernameTaken')
    return
  }
  if (usernameChecking.value) {
    error.value = t('auth.usernameChecking')
    return
  }
  const ageRaw = age.value
  const ageVal = typeof ageRaw === 'number' ? (Number.isNaN(ageRaw) ? '' : String(ageRaw)) : ageRaw.trim()
  if (ageVal !== '') {
    const n = Number(ageVal)
    if (!Number.isInteger(n) || n < 1 || n > 120) {
      error.value = t('auth.ageInvalid')
      return
    }
  }
  if (usernameAvailable.value === null && finalName !== auth.user?.username) {
    try {
      usernameChecking.value = true
      const ok = await checkUsername(finalName)
      usernameAvailable.value = ok
      if (!ok) {
        error.value = t('auth.usernameTaken')
        return
      }
    } catch {
      error.value = t('profile.saveFailed', { msg: t('api.requestFailed', { status: 0 }) })
      return
    } finally {
      usernameChecking.value = false
    }
  }

  saving.value = true
  error.value = ''
  try {
    await auth.updateProfile({
      username: finalName,
      avatar: avatar.value,
      age: ageVal === '' ? null : Number(ageVal),
      gender: gender.value,
      province: region.value.province,
      city: region.value.city,
      district: region.value.district
    })
    emit('update:visible', false)
    showToast(t('profile.saved'), 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === '用户名已存在' || msg.includes('already exists')) error.value = t('auth.usernameTaken')
    else error.value = t('profile.saveFailed', { msg })
  } finally {
    saving.value = false
  }
}

const onCancel = () => {
  if (saving.value) return
  emit('update:visible', false)
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
    onCancel()
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      nextTick(() => {
        window.addEventListener('keydown', onKeydown)
      })
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
  }
}
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.profile-overlay--mobile {
  align-items: flex-end;
  padding: 0;
}

.profile-panel {
  position: relative;
  width: min(460px, 100%);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 var(--glass-edge);
  overflow: hidden;
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.profile-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.55;
  pointer-events: none;
}

.profile-panel--mobile {
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
  padding-bottom: calc(0px + var(--safe-bottom, 0px));
  box-shadow: var(--shadow-lg), inset 0 0 18px var(--color-glow);
}

.profile-panel.dragging {
  transition: none;
}

.profile-grab {
  width: 100%;
  padding: 10px 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.profile-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}

.profile-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text);
  text-shadow: 0 0 14px var(--color-glow);
}

.profile-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.profile-close:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.profile-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 18px 4px;
  -webkit-overflow-scrolling: touch;
}

.profile-avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0 16px;
}

.profile-avatar {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 0 24px var(--color-glow);
  transition: var(--transition-normal);
}

.profile-avatar:hover {
  transform: scale(1.04);
  box-shadow: 0 0 32px var(--color-glow);
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-char {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.6);
}

.profile-avatar-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.profile-avatar-remove {
  border: none;
  background: transparent;
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}

.profile-file {
  display: none;
}

.profile-form {
  padding-bottom: 12px;
}

.profile-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.profile-field {
  display: block;
  padding: 12px 14px;
}

.profile-field + .profile-field {
  border-top: 1px solid var(--color-border);
}

.profile-label {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.profile-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-glass);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  transition: var(--transition-fast);
}

.profile-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.profile-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-input--error {
  border-color: #ff5b6a;
}

.profile-input--ok {
  border-color: #00c853;
}

.profile-hint {
  display: block;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.profile-hint--ok {
  color: #00c853;
}

.profile-hint--error {
  color: #ff5b6a;
}

.profile-segmented {
  display: flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--color-glass);
  border: 1px solid var(--color-border);
}

.profile-seg-item {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.profile-seg-item.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 10px var(--color-glow);
}

.profile-error {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 77, 94, 0.12);
  border: 1px solid rgba(255, 77, 94, 0.4);
  color: #ff5b6a;
  font-family: var(--font-mono);
  font-size: 12px;
}

.profile-footer {
  display: flex;
  gap: 12px;
  padding: 14px 18px 18px;
}

.profile-panel--mobile .profile-footer {
  padding-bottom: 10px;
}

.profile-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.profile-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-btn--save {
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 6px 18px var(--color-glow);
}

.profile-btn--save:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.profile-btn--cancel {
  flex: 1;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
}

.profile-btn--cancel:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-text);
  box-shadow: 0 0 12px var(--color-glow);
}

.profile-fade-enter-active,
.profile-fade-leave-active {
  transition: opacity 0.25s ease;
}

.profile-fade-enter-active .profile-panel {
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.profile-fade-leave-active .profile-panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.profile-fade-enter-from,
.profile-fade-leave-to {
  opacity: 0;
}

.profile-fade-enter-from .profile-panel {
  transform: translateY(24px) scale(0.96);
  opacity: 0;
}

.profile-fade-leave-to .profile-panel {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}

.profile-overlay--mobile .profile-panel {
  transform: translateY(0);
}

.profile-overlay--mobile.profile-fade-enter-from .profile-panel,
.profile-overlay--mobile.profile-fade-leave-to .profile-panel {
  transform: translateY(100%);
  opacity: 1;
}
</style>