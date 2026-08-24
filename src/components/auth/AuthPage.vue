<template>
  <div class="auth-page">
    <div class="auth-card liquid-edge">
      <div class="auth-head">
        <AppIcon name="lucide:sparkles" :size="34" themeFill />
        <h1 class="auth-brand">{{ $t('app.name') }}</h1>
        <p class="auth-sub">{{ $t('auth.subtitle') }}</p>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field">
          <span class="auth-label">{{ $t('auth.username') }}<em v-if="mode === 'register'" class="auth-required">*</em></span>
          <input
            v-model="username"
            type="text"
            class="auth-input"
            autocomplete="username"
            :placeholder="$t('auth.usernamePlaceholder')"
            :disabled="submitting"
            @blur="checkUsernameBlur"
          />
          <span
            v-if="mode === 'register' && usernameCheckState"
            class="auth-hint"
            :class="usernameCheckState === 'taken' ? 'auth-hint--error' : usernameCheckState === 'checking' ? '' : 'auth-hint--ok'"
          >
            {{
              usernameCheckState === 'checking'
                ? $t('auth.usernameChecking')
                : usernameCheckState === 'taken'
                  ? $t('auth.usernameTaken')
                  : $t('auth.usernameAvailable')
            }}
          </span>
        </label>
        <label class="auth-field">
          <span class="auth-label">{{ $t('auth.password') }}<em v-if="mode === 'register'" class="auth-required">*</em></span>
          <input
            v-model="password"
            type="password"
            class="auth-input"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :placeholder="$t('auth.passwordPlaceholder')"
            :disabled="submitting"
            @input="pwTouched = true"
          />
          <span v-if="mode === 'register' && password.length" class="auth-pw-row">
            <span class="auth-pw-meters">
              <i
                v-for="idx in 3"
                :key="idx"
                class="auth-pw-meter"
                :class="{ on: pwScore >= idx }"
                :data-level="pwStrength"
              ></i>
            </span>
            <span class="auth-pw-label" :data-level="pwStrength">
              {{
                pwScore === 0
                  ? $t('auth.passwordWeak')
                  : pwScore === 1
                    ? $t('auth.passwordMedium')
                    : $t('auth.passwordStrong')
              }}
            </span>
          </span>
          <span v-if="mode === 'register' && password.length && pwScore === 0" class="auth-hint auth-hint--error">
            {{ $t('auth.passwordTooWeak') }}
          </span>
          <span v-else-if="mode === 'register'" class="auth-hint">{{ $t('auth.passwordRule') }}</span>
        </label>
        <label v-if="mode === 'register'" class="auth-field">
          <span class="auth-label">{{ $t('auth.confirmPassword') }}</span>
          <input
            v-model="confirm"
            type="password"
            class="auth-input"
            autocomplete="new-password"
            :placeholder="$t('auth.confirmPasswordPlaceholder')"
            :disabled="submitting"
          />
        </label>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="submit" class="auth-submit" :disabled="submitting">
          <AppLoading v-if="submitting" :size="16" color="#fff" glow />
          {{
            submitting
              ? mode === 'login'
                ? $t('auth.loggingIn')
                : $t('auth.registering')
              : mode === 'login'
                ? $t('auth.login')
                : $t('auth.register')
          }}
        </button>
      </form>

      <div class="auth-switch">
        <RouterLink v-if="mode === 'login'" class="auth-switch-link" to="/register">
          {{ $t('auth.noAccount') }}
        </RouterLink>
        <RouterLink v-else class="auth-switch-link" to="/login">
          {{ $t('auth.hasAccount') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { checkUsername } from '@/services/authService'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{ mode?: 'login' | 'register' }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const submitting = ref(false)
const pwTouched = ref(false)
const usernameCheckState = ref<'checking' | 'taken' | 'available' | ''>('')

// 登录页 ⇄ 注册页相互切换时清空表单，避免把已填写的信息带过去回显
watch(
  () => props.mode,
  () => {
    username.value = ''
    password.value = ''
    confirm.value = ''
    error.value = ''
    pwTouched.value = false
    usernameCheckState.value = ''
  }
)

const pwScore = computed(() => {
  const v = password.value
  if (!v) return 0
  let kinds = 0
  if (/[a-zA-Z]/.test(v)) kinds++
  if (/[0-9]/.test(v)) kinds++
  if (/[^a-zA-Z0-9]/.test(v)) kinds++
  if (v.length < 8 || kinds < 2) return 0
  if (kinds >= 3) return 2
  return 1
})

const pwStrength = computed<'weak' | 'medium' | 'strong'>(() =>
  pwScore.value === 0 ? 'weak' : pwScore.value === 1 ? 'medium' : 'strong'
)

const checkUsernameBlur = async () => {
  const name = username.value.trim()
  if (props.mode !== 'register' || name.length < 3) {
    usernameCheckState.value = ''
    return
  }
  usernameCheckState.value = 'checking'
  try {
    const available = await checkUsername(name)
    usernameCheckState.value = available ? 'available' : 'taken'
  } catch {
    usernameCheckState.value = ''
  }
}

const submit = async () => {
  if (submitting.value) return
  error.value = ''
  const name = username.value.trim()
  if (!name || !password.value) {
    error.value = t('auth.fillAll')
    return
  }
  if (props.mode === 'register') {
    if (pwScore.value === 0) {
      error.value = t('auth.passwordTooWeak')
      return
    }
    if (password.value !== confirm.value) {
      error.value = t('auth.passwordMismatch')
      return
    }
    if (usernameCheckState.value === 'taken') {
      error.value = t('auth.usernameTaken')
      return
    }
  }
  submitting.value = true
  try {
    if (props.mode === 'login') {
      await auth.login(name, password.value)
    } else {
      await auth.register(name, password.value)
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect && redirect.startsWith('/') ? redirect : '/chat')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('common.errorOccurred')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px;
}

.auth-card {
  width: min(400px, 100%);
  padding: 38px 32px 30px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(30px) saturate(var(--glass-saturate));
  border: 1px solid var(--color-border);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 40px var(--color-glow),
    inset 0 1px 0 var(--glass-edge);
  animation: fadeIn 0.5s ease-out;
}

.auth-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  text-align: center;
}

.auth-brand {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 3px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px var(--color-glow);
}

.auth-sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.auth-switch {
  margin-top: 18px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.auth-switch-link {
  color: var(--color-primary);
  text-decoration: none;
  transition: var(--transition-fast);
}

.auth-switch-link:hover {
  text-shadow: 0 0 10px var(--color-glow);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.auth-input {
  height: 44px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: var(--transition-normal);
}

.auth-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.auth-input:disabled {
  opacity: 0.6;
}

.auth-error {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: #ff5b6a;
  text-shadow: 0 0 8px rgba(255, 77, 94, 0.4);
}

.auth-required {
  font-style: normal;
  color: #ff5b6a;
}

.auth-hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #ffb74d;
}

.auth-hint--error {
  color: #ff5b6a;
}

.auth-hint--ok {
  color: #34d399;
}

.auth-notice {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-secondary);
  opacity: 0.85;
}

.auth-pw-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-pw-meters {
  display: flex;
  gap: 4px;
  flex: 1;
}

.auth-pw-meter {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: var(--transition-fast);
}

.auth-pw-meter.on[data-level='weak'] {
  background: #ff5b6a;
  border-color: #ff5b6a;
  box-shadow: 0 0 6px rgba(255, 77, 94, 0.6);
}

.auth-pw-meter.on[data-level='medium'] {
  background: #ffb74d;
  border-color: #ffb74d;
  box-shadow: 0 0 6px rgba(255, 183, 77, 0.6);
}

.auth-pw-meter.on[data-level='strong'] {
  background: #34d399;
  border-color: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
}

.auth-pw-label {
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.auth-pw-label[data-level='weak'] {
  color: #ff5b6a;
}

.auth-pw-label[data-level='medium'] {
  color: #ffb74d;
}

.auth-pw-label[data-level='strong'] {
  color: #34d399;
}

.auth-gender {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.auth-gender-option {
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.auth-gender-option:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.auth-gender-option.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px var(--color-glow);
}

.auth-gender-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-submit {
  height: 44px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px var(--color-glow);
  transition: var(--transition-fast);
}

.auth-submit:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.auth-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>