import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type { ComplianceSurfaceCapabilities } from "./compliance-capabilities.shared"

export type { ComplianceSurfaceCapabilities } from "./compliance-capabilities.shared"

/** ERP RBAC flags for the compliance dashboard and exception panel. */
export async function resolveComplianceSurfaceCapabilities(): Promise<ComplianceSurfaceCapabilities> {
  const [canSearch, canCreate, canUpdate, canAudit] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "compliance",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "compliance",
      function: "create",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "compliance",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "compliance",
      function: "audit",
    }),
  ])

  return { canSearch, canCreate, canUpdate, canAudit }
}
