import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export type EmployeeRecordCapabilities = {
  readonly canCreate: boolean
  readonly canUpdate: boolean
}

/** ERP RBAC flags for workforce list + employee detail mutation surfaces. */
export async function resolveEmployeeRecordCapabilities(): Promise<EmployeeRecordCapabilities> {
  const [canCreate, canUpdate] = await Promise.all([
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

  return { canCreate, canUpdate }
}
