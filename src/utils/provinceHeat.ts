import type { HeatPeriod, ProvinceMetric } from '@/types/admin'

/** 省份热度统计周期（顺序即滑块顺序）。 */
export const HEAT_PERIODS: { key: HeatPeriod; labelKey: string }[] = [
  { key: 'day', labelKey: 'console.periodDay' },
  { key: 'week', labelKey: 'console.periodWeek' },
  { key: 'month', labelKey: 'console.periodMonth' },
  { key: 'year', labelKey: 'console.periodYear' }
]

/**
 * 省份用户热度权重（统一可配置常量，勿散落各处）。
 * - 新增用户数 25%
 * - 人均对话次数 40%
 * - 总对话次数 20%
 * - Token 消耗量 15%
 */
export const PROVINCE_HEAT_WEIGHTS = {
  newUsers: 0.25,
  avgDialogues: 0.4,
  dialogues: 0.2,
  tokens: 0.15
} as const

const log1p = (v: number): number => Math.log(1 + v)

interface LogScores {
  newUsers: number
  avgDialogues: number
  dialogues: number
  tokens: number
}

/**
 * 计算省份热度（0～100）。
 *
 * 流程：
 * 1. 每个指标先做 Log(1 + 原始值) 压缩，降低极端值影响；
 * 2. 人均对话次数 = 对话次数 ÷ 活跃用户数（活跃用户数为 0 时按 0 处理）；
 * 3. 在当前周期内按省份归一化：指标得分 = 省份 Log 值 ÷ 全部省份该指标最大 Log 值 × 100；
 *    若某指标所有省份均为 0，该指标统一按 0 分处理；
 * 4. 加权求和得到 0～100 热度。
 */
export function computeProvinceHeat(provinces: ProvinceMetric[]): Map<string, number> {
  const scores = new Map<string, LogScores>()
  const maxes = { newUsers: 0, avgDialogues: 0, dialogues: 0, tokens: 0 }

  for (const p of provinces) {
    const dialogues = p.requests
    const avgDialogues = p.active_users > 0 ? p.requests / p.active_users : 0
    const s: LogScores = {
      newUsers: log1p(p.new_users),
      avgDialogues: log1p(avgDialogues),
      dialogues: log1p(dialogues),
      tokens: log1p(p.total_tokens)
    }
    scores.set(p.province, s)
    if (s.newUsers > maxes.newUsers) maxes.newUsers = s.newUsers
    if (s.avgDialogues > maxes.avgDialogues) maxes.avgDialogues = s.avgDialogues
    if (s.dialogues > maxes.dialogues) maxes.dialogues = s.dialogues
    if (s.tokens > maxes.tokens) maxes.tokens = s.tokens
  }

  const result = new Map<string, number>()
  for (const [name, s] of scores) {
    const score =
      (maxes.newUsers > 0 ? (s.newUsers / maxes.newUsers) * 100 : 0) * PROVINCE_HEAT_WEIGHTS.newUsers +
      (maxes.avgDialogues > 0 ? (s.avgDialogues / maxes.avgDialogues) * 100 : 0) *
        PROVINCE_HEAT_WEIGHTS.avgDialogues +
      (maxes.dialogues > 0 ? (s.dialogues / maxes.dialogues) * 100 : 0) * PROVINCE_HEAT_WEIGHTS.dialogues +
      (maxes.tokens > 0 ? (s.tokens / maxes.tokens) * 100 : 0) * PROVINCE_HEAT_WEIGHTS.tokens
    result.set(name, Math.round(Math.min(100, Math.max(0, score)) * 10) / 10)
  }
  return result
}