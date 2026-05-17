import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import type { ErpPermissionTuple } from "#features/erp-rbac"

import type { ErpPermissionRequirement } from "../schemas/erp-permission-requirement.schema"

export async function resolveGovernedErpPermissionAllowed(
  requirement: ErpPermissionRequirement | undefined
): Promise<boolean> {
  if (!requirement) {
    return true
  }
  const permission: ErpPermissionTuple = {
    module: requirement.module,
    object: requirement.object,
    function: requirement.function,
  }
  return canUseErpPermissionForCurrentOrg(permission)
}
