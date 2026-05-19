import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { findClaimEmployeeForUser } from "./claim.queries.server"
import { isEmployeeExpenseFundCustodian } from "./expense-fund.queries.server"

export type ClaimSurfaceAccess = {
  readonly canEnter: boolean
  readonly canReadOrgClaims: boolean
  readonly canSubmitOnBehalf: boolean
  readonly canManage: boolean
  readonly canManageFunds: boolean
  readonly canApproveExceptions: boolean
  readonly canAuditClaims: boolean
  readonly isFundCustodian: boolean
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
    canAuditClaim,
    canManageFunds,
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
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "claim", function: "audit" },
    }),
    canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: { module: "hrm", object: "expense_fund", function: "update" },
    }),
    findClaimEmployeeForUser(input.organizationId, input.userId),
  ])

  const canReadOrgClaims =
    canReadClaim || canSearchClaim || canUpdateClaim || canAuditClaim
  const canSubmitOnBehalf = canCreateClaim || canUpdateClaim
  const hasSelfServiceEmployee = Boolean(employee)
  const isFundCustodian = employee
    ? await isEmployeeExpenseFundCustodian(input.organizationId, employee.id)
    : false

  return {
    canEnter: canReadOrgClaims || canSubmitOnBehalf || hasSelfServiceEmployee,
    canReadOrgClaims,
    canSubmitOnBehalf,
    canManage: canUpdateClaim,
    canManageFunds,
    canApproveExceptions: canUpdateClaim,
    canAuditClaims: canAuditClaim || canReadClaim,
    isFundCustodian,
    hasSelfServiceEmployee,
    selfServiceEmployeeId: employee?.id ?? null,
  }
}
