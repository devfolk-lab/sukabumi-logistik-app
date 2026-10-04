import type { Role } from '#shared/types'

/** Who may approve paid orders and book them on Biteship. */
export function canApproveOrders(role: Role | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN'
}

/** Who may manage the staff: hand out and take back the admin roles. */
export function canManageStaff(role: Role | null | undefined): boolean {
  return role === 'SUPERADMIN'
}

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'Pengguna',
  ADMIN: 'Admin',
  SUPERADMIN: 'Superadmin'
}
