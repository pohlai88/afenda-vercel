import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findLeaveEmployeeForUser } from "./leave-request.queries.server"

export type LeaveSurfaceAccess = {
  canEnter: boolean
  canManage: boolean
  canReadOrgLeave: boolean
  hasSelfServiceEmployee: boolean
}

export async function resolveLeaveSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<LeaveSurfaceAccess> {
  const [canReadLeave, canSearchLeave, canManageLeave, employee] =
    await Promise.all([
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: { module: "hrm", object: "leave", function: "read" },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: { module: "hrm", object: "leave", function: "search" },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: { module: "hrm", object: "leave", function: "update" },
      }),
      findLeaveEmployeeForUser(input.organizationId, input.userId),
    ])

  const canReadOrgLeave = canReadLeave || canSearchLeave || canManageLeave
  const hasSelfServiceEmployee = Boolean(employee)

  return {
    canEnter: canReadOrgLeave || hasSelfServiceEmployee,
    canManage: canManageLeave,
    canReadOrgLeave,
    hasSelfServiceEmployee,
  }
}
