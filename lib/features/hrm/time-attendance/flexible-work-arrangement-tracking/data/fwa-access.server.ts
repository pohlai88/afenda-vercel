import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findFwaEmployeeForUser } from "./fwa.queries.server"

export type FwaSurfaceAccess = {
  canEnter: boolean
  canManage: boolean
  canReadOrg: boolean
  hasSelfServiceEmployee: boolean
}

export async function resolveFwaSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<FwaSurfaceAccess> {
  const [canRead, canSearch, canManage, employee] = await Promise.all([
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "read",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "search",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "update",
      },
    }),
    findFwaEmployeeForUser(input.organizationId, input.userId),
  ])

  const canReadOrg = canRead || canSearch || canManage
  const hasSelfServiceEmployee = Boolean(employee)

  return {
    canEnter: canReadOrg || hasSelfServiceEmployee,
    canManage: canManage,
    canReadOrg,
    hasSelfServiceEmployee,
  }
}
