import { db } from "#lib/db"
import { hrmOrgStructureChangeHistory } from "#lib/db/schema"

import type {
  HrmOrgStructureResourceType,
  OrgStructureFieldChange,
} from "./org-structure-change-history.shared"

type OrgStructureDbTx = Pick<typeof db, "insert">

export async function insertOrgStructureChangeHistoryRows(
  tx: OrgStructureDbTx = db,
  input: {
    readonly organizationId: string
    readonly resourceType: HrmOrgStructureResourceType
    readonly resourceId: string
    readonly changedByUserId: string
    readonly changes: readonly OrgStructureFieldChange[]
    readonly effectiveDate?: Date | null
    readonly reason?: string | null
    readonly approvalReference?: string | null
  }
): Promise<void> {
  if (input.changes.length === 0) return

  await tx.insert(hrmOrgStructureChangeHistory).values(
    input.changes.map((change) => ({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      fieldName: change.fieldName,
      oldValue: change.oldValue === undefined ? null : change.oldValue,
      newValue: change.newValue === undefined ? null : change.newValue,
      changedByUserId: input.changedByUserId,
      effectiveDate: input.effectiveDate ?? null,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
    }))
  )
}
