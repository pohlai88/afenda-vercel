import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type { OffboardingSurfaceCapabilities } from "./offboarding-capabilities.shared"

export type { OffboardingSurfaceCapabilities } from "./offboarding-capabilities.shared"

/** ERP RBAC flags for org offboarding dashboard and employee exit workflows. */
export async function resolveOffboardingSurfaceCapabilities(): Promise<OffboardingSurfaceCapabilities> {
  const [canSearch, canCreate, canUpdate] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee",
      function: "create",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee",
      function: "update",
    }),
  ])

  return { canSearch, canCreate, canUpdate }
}
