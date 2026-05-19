import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findRemoteCheckinEmployeeForUser } from "./geolocation.queries.server"

export type GeolocationSurfaceAccess = {
  readonly canEnter: boolean
  readonly canManage: boolean
  readonly canRead: boolean
  readonly canAudit: boolean
  readonly canManageGeofences: boolean
  readonly hasSelfServiceEmployee: boolean
}

export async function resolveGeolocationSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<GeolocationSurfaceAccess> {
  const [canRead, canSearch, canManage, canAudit, canManageGeofences, employee] =
    await Promise.all([
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "remote_checkin",
          function: "read",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "remote_checkin",
          function: "search",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "remote_checkin",
          function: "update",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "remote_checkin",
          function: "audit",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "geofence",
          function: "update",
        },
      }),
      findRemoteCheckinEmployeeForUser(input.organizationId, input.userId),
    ])

  const canReadOrg = canRead || canSearch || canManage || canAudit
  const hasSelfServiceEmployee = Boolean(employee)
  return {
    canEnter: canReadOrg || hasSelfServiceEmployee,
    canManage,
    canRead: canReadOrg,
    canAudit,
    canManageGeofences,
    hasSelfServiceEmployee,
  }
}
