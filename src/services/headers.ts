import { i18n } from '@/locales'

/**
 * 为请求头统一注入当前语言（Accept-Language）。
 * 后端据此返回对应语言的文案（如操作日志等）。
 * 传入的 headers 会被就地修改并返回，方便链式使用。
 */
export function withAcceptLanguage(headers: Record<string, string> = {}): Record<string, string> {
  try {
    const lang = i18n.global.locale.value
    if (lang) headers['Accept-Language'] = String(lang)
  } catch {
    /* ignore */
  }
  return headers
}
