import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

export type AppLocale = 'zh-CN' | 'en-US'

const saved = localStorage.getItem('chatLocale') as AppLocale | null
const initialLocale: AppLocale = saved === 'en-US' ? 'en-US' : 'zh-CN'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  localStorage.setItem('chatLocale', locale)
  document.documentElement.lang = locale
}

export function getLocale(): AppLocale {
  return i18n.global.locale.value as AppLocale
}

document.documentElement.lang = initialLocale