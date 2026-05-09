import "server-only"

import { and, eq } from "drizzle-orm"

import { AUDIT_ORIGIN } from "#lib/auth"
import { db } from "#lib/db"
import { iamAuditEvent, oneThing } from "#lib/db/schema"

export async function deleteOperationalSimulationRun(input: {
  organizationId: string
  simulationRunId: string
}): Promise<{ deletedAudit: number; deletedOneThing: number }> {
  const deletedThings = await db
    .delete(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, input.organizationId),
        eq(oneThing.simulationRunId, input.simulationRunId),
        eq(oneThing.auditOrigin, AUDIT_ORIGIN.simulation)
      )
    )
    .returning({ id: oneThing.id })

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
    deletedOneThing: deletedThings.length,
    deletedAudit: deletedAudit.length,
  }
}
