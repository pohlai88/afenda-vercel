import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export type EmployeeRecordCapabilities = {
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly canReadSensitive: boolean
}

/** ERP RBAC flags for workforce list + employee detail mutation surfaces. */
export async function resolveEmployeeRecordCapabilities(): Promise<EmployeeRecordCapabilities> {
  const [canCreate, canUpdate, canReadSensitive] = await Promise.all([
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
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee_sensitive",
      function: "read",
    }),
  ])

  return { canCreate, canUpdate, canReadSensitive }
}
