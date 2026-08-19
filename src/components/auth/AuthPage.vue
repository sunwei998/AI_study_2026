<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <AppIcon name="lucide:sparkles" :size="34" themeFill />
        <h1 class="auth-brand">{{ $t('app.name') }}</h1>
        <p class="auth-sub">{{ $t('auth.subtitle') }}</p>
      </div>

      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          {{ $t('auth.login') }}
        </button>
        <button
          class="auth-tab"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          {{ $t('auth.register') }}
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field">
          <span class="auth-label">{{ $t('auth.username') }}</span>
          <input
            v-model="username"
            type="text"
            class="auth-input"
            autocomplete="username"
            :placeholder="$t('auth.usernamePlaceholder')"
            :disabled="submitting"
          />
        </label>
        <label class="auth-field">
          <span class="auth-label">{{ $t('auth.password') }}</span>
          <input
            v-model="password"
            type="password"
            class="auth-input"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :placeholder="$t('auth.passwordPlaceholder')"
            :disabled="submitting"
          />
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

        <label v-if="mode === 'register'" class="auth-field">
          <span class="auth-label">
            {{ $t('auth.region') }}
            <em class="auth-required">*</em>
          </span>
          <RegionSelect v-model="region" :disabled="submitting" />
          <span v-if="regionTouched && !regionComplete" class="auth-hint">
            {{ $t('auth.regionRequired') }}
          </span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import AppLoading from '@/components/common/AppLoading.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RegionSelect, { type RegionValue } from '@/components/common/RegionSelect.vue'

const { t } = useI18n()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const confirm = ref('')
const region = ref<RegionValue>({ province: '', city: '', district: '' })
const regionTouched = ref(false)
const error = ref('')
const submitting = ref(false)

const regionComplete = computed(() =>
  Boolean(region.value.province && region.value.city && region.value.district)
)

const switchMode = (m: 'login' | 'register') => {
  mode.value = m
  error.value = ''
  confirm.value = ''
  region.value = { province: '', city: '', district: '' }
  regionTouched.value = false
}

const submit = async () => {
  if (submitting.value) return
  error.value = ''
  const name = username.value.trim()
  if (!name || !password.value) {
    error.value = t('auth.fillAll')
    return
  }
  if (mode.value === 'register') {
    if (password.value.length < 6) {
      error.value = t('auth.passwordTooShort')
      return
    }
    if (password.value !== confirm.value) {
      error.value = t('auth.passwordMismatch')
      return
    }
    regionTouched.value = true
    if (!regionComplete.value) {
      error.value = t('auth.regionRequired')
      return
    }
  }
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(name, password.value)
    } else {
      await auth.register(name, password.value, region.value)
    }
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
  background: var(--color-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 40px var(--color-glow);
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

.auth-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  margin-bottom: 22px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.auth-tab {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.auth-tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: 0 4px 12px var(--color-glow);
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