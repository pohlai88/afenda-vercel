import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findOtmEmployeeForUser } from "./otm.queries.server"

export type OtmSurfaceAccess = {
  canEnter: boolean
  canManage: boolean
  canReadOrg: boolean
  hasSelfServiceEmployee: boolean
}

export async function resolveOtmSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<OtmSurfaceAccess> {
  const [canRead, canSearch, canUpdate, canCreate, employee] = await Promise.all([
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "read",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "search",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "update",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "create",
      },
    }),
    findOtmEmployeeForUser(input.organizationId, input.userId),
  ])

  const canManage = canUpdate || canCreate
  const canReadOrg = canRead || canSearch || canManage
  const hasSelfServiceEmployee = Boolean(employee)

  return {
    canEnter: canReadOrg || hasSelfServiceEmployee,
    canManage,
    canReadOrg,
    hasSelfServiceEmployee,
  }
}
