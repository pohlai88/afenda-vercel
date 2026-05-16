import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findClaimEmployeeForUser } from "./claim.queries.server"

export type ClaimSurfaceAccess = {
  readonly canEnter: boolean
  readonly canReadOrgClaims: boolean
  readonly canSubmitOnBehalf: boolean
  readonly canManage: boolean
  readonly hasSelfServiceEmployee: boolean
  readonly selfServiceEmployeeId: string | null
}

export async function resolveClaimSurfaceAccess(input: {
  organizationId: string
  userId: string
}): Promise<ClaimSurfaceAccess> {
  const [
    canReadClaim,
    canSearchClaim,
    canCreateClaim,
    canUpdateClaim,
    employee,
  ] = await Promise.all([
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "claim", function: "read" },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "claim", function: "search" },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "claim", function: "create" },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "claim", function: "update" },
    }),
    findClaimEmployeeForUser(input.organizationId, input.userId),
  ])

  const canReadOrgClaims = canReadClaim || canSearchClaim || canUpdateClaim
  const canSubmitOnBehalf = canCreateClaim || canUpdateClaim
  const hasSelfServiceEmployee = Boolean(employee)

  return {
    canEnter: canReadOrgClaims || canSubmitOnBehalf || hasSelfServiceEmployee,
    canReadOrgClaims,
    canSubmitOnBehalf,
    canManage: canUpdateClaim,
    hasSelfServiceEmployee,
    selfServiceEmployeeId: employee?.id ?? null,
  }
}
