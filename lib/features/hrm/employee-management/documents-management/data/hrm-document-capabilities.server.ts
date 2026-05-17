import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type { HrmDocumentSurfaceCapabilities } from "./hrm-document-capabilities.shared"

export type { HrmDocumentSurfaceCapabilities } from "./hrm-document-capabilities.shared"

/** ERP RBAC flags for the documents vault and employee attach flows. */
export async function resolveHrmDocumentSurfaceCapabilities(): Promise<HrmDocumentSurfaceCapabilities> {
  const [canSearch, canCreate, canUpdate, canAudit] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "document",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "document",
      function: "create",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "document",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "document",
      function: "audit",
    }),
  ])

  return { canSearch, canCreate, canUpdate, canAudit }
}
