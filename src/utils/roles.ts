import type { UserRole } from '@/types/admin'

/** 可进入管理控制台的角色 */
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'system_admin', 'model_admin']

/** 全部角色（展示顺序） */
export const ALL_ROLES: UserRole[] = ['super_admin', 'system_admin', 'model_admin', 'user', 'subscriber']

/** 角色 → i18n 文案 key */
export const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  super_admin: 'console.roleSuperAdmin',
  system_admin: 'console.roleSystemAdmin',
  model_admin: 'console.roleModelAdmin',
  user: 'console.roleUser',
  subscriber: 'console.roleSubscriber'
}

export function isManagerRole(role?: string): boolean {
  return !!role && (ADMIN_ROLES as string[]).includes(role)
}

export function isSuperAdminRole(role?: string): boolean {
  return role === 'super_admin'
}
