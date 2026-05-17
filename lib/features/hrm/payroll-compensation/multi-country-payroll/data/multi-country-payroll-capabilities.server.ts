import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type { MultiCountryPayrollSurfaceCapabilities } from "./multi-country-payroll-capabilities.shared"

export type { MultiCountryPayrollSurfaceCapabilities } from "./multi-country-payroll-capabilities.shared"

export async function resolveMultiCountryPayrollSurfaceCapabilities(): Promise<MultiCountryPayrollSurfaceCapabilities> {
  const [canSearch, canCreate, canUpdate, canAudit] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "payroll",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "payroll",
      function: "create",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "payroll",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "payroll",
      function: "audit",
    }),
  ])

  return { canSearch, canCreate, canUpdate, canAudit }
}
