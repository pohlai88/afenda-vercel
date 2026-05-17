import "server-only"

import { db } from "#lib/db"
import { hrmLifecycleEvent } from "#lib/db/schema"

type HrmEmployeeMutationDbClient = Pick<typeof db, "insert">

/** Records a rehire lifecycle event without overwriting prior history (HRM-EMP-REC-016). */
export async function recordEmployeeRehireLifecycleEvent(
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly actorUserId: string
    readonly rehireDate: Date
    readonly previousStatus: string
    readonly reason?: string | null
  },
  client: HrmEmployeeMutationDbClient = db
): Promise<void> {
  await client.insert(hrmLifecycleEvent).values({
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: "rehire",
    previousStatus: input.previousStatus,
    newStatus: "active",
    effectiveDate: input.rehireDate,
    reason: input.reason ?? null,
    metadata: { source: "employee_records_management" },
    actorUserId: input.actorUserId,
    createdByUserId: input.actorUserId,
  })
}
