import "server-only"

import { canUseErpPermission } from "#features/erp-rbac/server"

import { isClaimAssignedApprover } from "./claim.queries.server"
import type { ClaimRow } from "./claim.queries.server"

export async function canDecideClaimKanbanMove(input: {
  organizationId: string
  userId: string
  claim: Pick<ClaimRow, "state" | "currentApprovalId">
}): Promise<boolean> {
  if (input.claim.state !== "submitted") return false

  if (
    await isClaimAssignedApprover({
      organizationId: input.organizationId,
      userId: input.userId,
      currentApprovalId: input.claim.currentApprovalId,
    })
  ) {
    return true
  }

  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })
}
