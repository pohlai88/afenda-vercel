import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type { OrgStructureSurfaceCapabilities } from "./org-structure-capabilities.shared"

export type { OrgStructureSurfaceCapabilities } from "./org-structure-capabilities.shared"

/** ERP RBAC flags for organization structure pages and chart mutations. */
export async function resolveOrgStructureSurfaceCapabilities(): Promise<OrgStructureSurfaceCapabilities> {
  const [canCreate, canUpdate, canDelete] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "organization",
      function: "create",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "organization",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "organization",
      function: "delete",
    }),
  ])

  return { canCreate, canUpdate, canDelete }
}
