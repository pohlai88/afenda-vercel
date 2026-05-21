import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

export type TimeClockSurfaceAccess = {
  readonly canEnter: boolean
  readonly canManageDevices: boolean
  readonly canManageMappings: boolean
  readonly canDecideExceptions: boolean
  readonly canIngest: boolean
  readonly canRead: boolean
  readonly canAudit: boolean
}

export async function resolveTimeClockSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<TimeClockSurfaceAccess> {
  const [
    canSearch,
    canRead,
    canManageDevice,
    canManageMapping,
    canDecideException,
    canIngest,
    canAudit,
  ] = await Promise.all([
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock",
          function: "search",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock",
          function: "read",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock_device",
          function: "update",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock_mapping",
          function: "update",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock_punch",
          function: "create",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock_punch",
          function: "update",
        },
      }),
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: {
          module: "hrm",
          object: "time_clock",
          function: "audit",
        },
      }),
    ])

  const canReadOrg = canSearch || canRead || canManageDevice || canAudit

  return {
    canEnter: canReadOrg || canManageMapping || canIngest,
    canManageDevices: canManageDevice,
    canManageMappings: canManageMapping,
    canDecideExceptions: canDecideException,
    canIngest,
    canRead: canReadOrg,
    canAudit,
  }
}
