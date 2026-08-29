import { ref, watch } from 'vue'
import { i18n } from '@/locales'
import { DEFAULT_PROVIDERS, type ModelProvider } from '@/config/models'
import { fetchDimValuesByCode } from '@/services/adminService'

/**
 * 模型提供商（model_provider 维表）的统一读取。
 * 优先从维表接口拉取（后端按 Accept-Language 返回对应语言的 name），
 * 维表不可用时回退本地默认字典（按语言取中文/英文名）。
 * 每次组件挂载 + 语言切换时都会重新拉取，保证维表在后台被修改后能及时反映；
 * 同一时刻的并发调用合并为一次请求（loading 缓存），避免重复请求。
 */

// ============ 模块级共享状态 ============
const providers = ref<ModelProvider[]>([])
let loading: Promise<void> | null = null

function applyLocal(locale: string): void {
  const isEn = String(locale).toLowerCase().startsWith('en')
  providers.value = DEFAULT_PROVIDERS.map((p) => ({
    id: p.id,
    name: isEn ? p.nameEn : p.name,
    nameEn: p.nameEn
  }))
}

export function loadProviders(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    try {
      const dims = await fetchDimValuesByCode('model_provider')
      if (dims.length) {
        providers.value = dims.map((d) => ({ id: d.code, name: d.name, nameEn: d.name }))
      } else {
        applyLocal(String(i18n.global.locale.value))
      }
    } catch {
      applyLocal(String(i18n.global.locale.value))
    } finally {
      loading = null
    }
  })()
  return loading
}

// 语言切换时重新拉取（所有调用方共享），保证名称跟随界面语言
watch(
  () => i18n.global.locale.value,
  () => {
    loadProviders()
  }
)

export function useProviders() {
  // 每次组件挂载都拉取最新维表数据（幂等合并，维表修改后进入页面即可见新名称）
  loadProviders()

  /** code -> 当前语言的提供商名（找不到回退 code） */
  const providerName = (id: string): string =>
    providers.value.find((p) => p.id === id)?.name ?? id

  return { providers, providerName, loadProviders }
}
