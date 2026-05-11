import "server-only"

import { and, eq } from "drizzle-orm"

import { AUDIT_ORIGIN } from "#lib/auth"
import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"

/**
 * Deletes simulation-tagged IAM audit rows for a single run. Any planner-native
 * rows the scenario inserted are responsible for their own cleanup contract;
 * this server entry handles only the canonical audit ledger.
 */
export async function deleteOperationalSimulationRun(input: {
  organizationId: string
  simulationRunId: string
}): Promise<{ deletedAudit: number }> {
  const deletedAudit = await db
    .delete(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.organizationId, input.organizationId),
        eq(iamAuditEvent.simulationRunId, input.simulationRunId),
        eq(iamAuditEvent.auditOrigin, AUDIT_ORIGIN.simulation)
      )
    )
    .returning({ id: iamAuditEvent.id })

  return {
    deletedAudit: deletedAudit.length,
  }
}
