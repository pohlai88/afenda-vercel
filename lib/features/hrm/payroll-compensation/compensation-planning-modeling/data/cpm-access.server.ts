import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

export type CompensationPlanningSurfaceAccess = {
  canEnter: boolean
  canManage: boolean
  canReadOrg: boolean
}

export async function resolveCompensationPlanningSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<CompensationPlanningSurfaceAccess> {
  const [canRead, canSearch, canManage] = await Promise.all([
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "compensation_planning",
        function: "read",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "compensation_planning",
        function: "search",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "compensation_planning",
        function: "update",
      },
    }),
  ])

  const canReadOrg = canRead || canSearch || canManage

  return {
    canEnter: canReadOrg,
    canManage: canManage,
    canReadOrg,
  }
}
