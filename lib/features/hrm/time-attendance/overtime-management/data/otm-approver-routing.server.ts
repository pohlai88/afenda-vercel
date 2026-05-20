import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { listUserIdsWithErpPermission } from "#features/erp-rbac/server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { managerChainDepthClamped } from "./otm-approval-routing.shared"

export { OTM_MANAGER_CHAIN_MAX_DEPTH_LIMIT } from "./otm-approval-routing.shared"
export {
  readOtmApprovalStage,
  resolveInitialOtmApprovalStage,
} from "./otm-approval-routing.shared"

export async function resolveOtmHrApproverUserId(
  organizationId: string
): Promise<string | null> {
  const [fallbackApproverUserId] = await listUserIdsWithErpPermission({
    organizationId,
    permission: {
      module: "hrm",
      object: "overtime",
      function: "update",
    },
  })
  return fallbackApproverUserId ?? null
}

async function resolveManagerApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string
}): Promise<string | null> {
  const manager = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.managerEmployeeId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: { linkedUserId: true },
  })
  return manager?.linkedUserId ?? null
}

export async function resolveOtmManagerChainApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
  maxDepth: number
}): Promise<string | null> {
  const depthLimit = managerChainDepthClamped(input.maxDepth)

  let currentManagerId = input.managerEmployeeId
  for (let depth = 0; depth < depthLimit && currentManagerId; depth += 1) {
    const linkedUserId = await resolveManagerApproverUserId({
      organizationId: input.organizationId,
      managerEmployeeId: currentManagerId,
    })
    if (linkedUserId) return linkedUserId

    const row = await db.query.hrmEmployee.findFirst({
      where: and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, currentManagerId),
        isNull(hrmEmployee.archivedAt)
      ),
      columns: { managerEmployeeId: true },
    })
    currentManagerId = row?.managerEmployeeId ?? null
  }

  return null
}

export async function resolveOtmApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
  managerChainMaxDepth: number
}): Promise<string | null> {
  const managerUserId = await resolveOtmManagerChainApproverUserId({
    organizationId: input.organizationId,
    managerEmployeeId: input.managerEmployeeId,
    maxDepth: input.managerChainMaxDepth,
  })
  if (managerUserId) return managerUserId
  return resolveOtmHrApproverUserId(input.organizationId)
}
