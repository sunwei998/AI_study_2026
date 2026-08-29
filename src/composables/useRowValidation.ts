import { ref } from 'vue'

/**
 * 表格行内编辑的字段级校验。
 *
 * 维表配置页与数据字典配置页共用：调用方只提供自己的 `validate(row)`，
 * 返回 `{ 字段名: 错误文案 }`（无错返回空对象）。
 *
 * 用法：
 * - `fieldError(row.id, 'sort_order')` → 绑 AppInput 的 `error` prop 驱动红框
 * - `check(row)` → 失焦或保存时调用，返回**首条**错误文案（无错返回空串）
 * - `clearRow(row.id)` → 保存成功后清掉该行错误
 *
 * 行 key 取 `row.id ?? row.key`（数据字典页以 key 为主键）。
 */
export function useRowValidation<K extends string>(
  validate: (row: any) => Partial<Record<K, string>>
) {
  const errors = ref<Record<string | number, Partial<Record<K, string>>>>({})

  const rowKeyOf = (row: any): string | number => row?.id ?? row?.key

  const fieldError = (id: string | number, field: K): string => errors.value[id]?.[field] ?? ''

  const clearRow = (id: string | number): void => {
    delete errors.value[id]
  }

  /**
   * 校验一行并记录错误；返回首条错误文案（无错返回 ''）。
   * 调用方据此决定是否继续提交——校验不过就**不发请求**，
   * 避免像 `Number(x) || 0` 那样把脏值静默写成 0。
   */
  const check = (row: any): string => {
    const found = validate(row)
    const id = rowKeyOf(row)
    if (Object.keys(found).length) {
      errors.value[id] = found
    } else {
      delete errors.value[id]
    }
    return (Object.values(found)[0] as string | undefined) ?? ''
  }

  return { errors, fieldError, clearRow, check }
}
