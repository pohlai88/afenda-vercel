import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

export type AatSurfaceAccess = {
  canEnter: boolean
  canReadOrg: boolean
  canAudit: boolean
  canConfigureThresholds: boolean
  canViewSensitiveReasons: boolean
  canExportReport: boolean
  canViewTeamScope: boolean
}

export async function resolveAatSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<AatSurfaceAccess> {
  const [canSearch, canRead, canAudit, canUpdate] = await Promise.all([
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "absence_analytics",
        function: "search",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "absence_analytics",
        function: "read",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "absence_analytics",
        function: "audit",
      },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "absence_analytics",
        function: "update",
      },
    }),
  ])

  const canReadOrg = canSearch || canRead || canAudit

  const { findAatManagerContextForUser } = await import(
    "./aat-employee-context.server"
  )
  const managerContext = await findAatManagerContextForUser({
    organizationId: input.organizationId,
    userId: input.userId,
  })

  return {
    canEnter: canReadOrg,
    canReadOrg,
    canAudit,
    canConfigureThresholds: canUpdate,
    canViewSensitiveReasons: canRead || canAudit,
    canExportReport: canRead || canAudit,
    canViewTeamScope: managerContext !== null,
  }
}
