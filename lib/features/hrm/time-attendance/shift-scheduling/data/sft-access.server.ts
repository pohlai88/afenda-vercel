import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findSftEmployeeForUser } from "./sft.queries.server"

export type SftSurfaceAccess = {
  canEnter: boolean
  canManage: boolean
  canReadOrg: boolean
  hasSelfServiceEmployee: boolean
}

export async function resolveSftSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<SftSurfaceAccess> {
  const [canRead, canSearch, canUpdate, canCreate, employee] =
    await Promise.all([
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "shift_schedule",
          function: "read",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "shift_schedule",
          function: "search",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "shift_schedule",
          function: "update",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "shift_schedule",
          function: "create",
        },
      }),
      findSftEmployeeForUser(input.organizationId, input.userId),
    ])

  const canManage = canUpdate || canCreate
  const canReadOrg = canRead || canSearch || canManage

  return {
    canEnter: canReadOrg || Boolean(employee),
    canManage,
    canReadOrg,
    hasSelfServiceEmployee: Boolean(employee),
  }
}
