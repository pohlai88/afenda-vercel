import { FatalError } from "workflow"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { HrmImportApplyPayload } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmEmployee, hrmImportSession } from "#lib/db/schema"
import { ORG_DASHBOARD_HRM_IMPORTS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BULK_IMPORT_AUDIT } from "../bulk-import.contract"
import {
  dryRunEmployees,
  listValidEmployeeImportRows,
} from "./hrm-import-csv.shared"
import { loadEmployeeImportGridFromRollback } from "./hrm-import-source.server"
import { hrmImportRollbackJsonSchema } from "../schemas/hrm-import.schema"

const BATCH_SIZE = 50

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

export async function hrmImportApplyWorkflow(payload: HrmImportApplyPayload) {
  "use workflow"

  try {
    for (;;) {
      const { done } = await applyEmployeeImportBatchStep(payload)
      if (done) break
    }
  } catch (err) {
    await markImportApplyFailedStep(payload, err)
    throw err
  }
}

async function applyEmployeeImportBatchStep(
  payload: HrmImportApplyPayload
): Promise<{ done: boolean }> {
  "use step"

  const [row] = await db
    .select({
      id: hrmImportSession.id,
      status: hrmImportSession.status,
      importType: hrmImportSession.importType,
      rollbackJson: hrmImportSession.rollbackJson,
    })
    .from(hrmImportSession)
    .where(
      and(
        eq(hrmImportSession.organizationId, payload.organizationId),
        eq(hrmImportSession.id, payload.sessionId)
      )
    )
    .limit(1)

  if (!row) {
    throw new FatalError("import_session_not_found")
  }

  if (row.status === "committed" || row.status === "rolled_back") {
    return { done: true }
  }

  const parsedRollback = hrmImportRollbackJsonSchema.safeParse(row.rollbackJson)
  if (
    !parsedRollback.success ||
    parsedRollback.data.kind !== "hrm_import_v1" ||
    parsedRollback.data.importType !== "employees" ||
    row.importType !== "employees"
  ) {
    throw new FatalError("import_session_not_employee_v1")
  }

  const rb = parsedRollback.data
  const appliedIds = rb.appliedEmployeeIds ?? []
  const grid = await loadEmployeeImportGridFromRollback(rb)
  const summary = dryRunEmployees(grid)
  if (summary.errors.length > 0 || summary.rowCount === 0) {
    throw new FatalError("import_csv_invalid_on_apply")
  }

  const employeeRows = listValidEmployeeImportRows(grid)
  const cursor = appliedIds.length
  const batch = employeeRows.slice(cursor, cursor + BATCH_SIZE)

  if (batch.length === 0) {
    await db
      .update(hrmImportSession)
      .set({ status: "committed", updatedAt: new Date() })
      .where(eq(hrmImportSession.id, row.id))

    await writeIamAuditEvent({
      action: HRM_BULK_IMPORT_AUDIT.sessionCommit,
      actorUserId: payload.actorUserId,
      actorSessionId: payload.actorSessionId,
      organizationId: payload.organizationId,
      resourceType: "hrm_import_session",
      resourceId: row.id,
      metadata: {
        importType: row.importType,
        employeesCreated: appliedIds.length,
        workflow: true,
      },
    })

    revalidatePath(
      toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_IMPORTS),
      "page"
    )
    return { done: true }
  }

  await db.transaction(async (tx) => {
    const ids: string[] = []
    for (const er of batch) {
      const id = crypto.randomUUID()
      try {
        await tx.insert(hrmEmployee).values({
          id,
          organizationId: payload.organizationId,
          employeeNumber: er.employeeNumber,
          legalName: er.legalName,
          createdByUserId: payload.actorUserId,
          updatedByUserId: payload.actorUserId,
        })
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new FatalError(`duplicate_employee_number:${er.employeeNumber}`)
        }
        throw err
      }
      ids.push(id)
    }

    const nextRollback = {
      ...rb,
      appliedEmployeeIds: [...appliedIds, ...ids],
      appliedAt: new Date().toISOString(),
      appliedByUserId: payload.actorUserId,
    }

    await tx
      .update(hrmImportSession)
      .set({
        status: "processing",
        rollbackJson: nextRollback,
        updatedAt: new Date(),
      })
      .where(eq(hrmImportSession.id, row.id))
  })

  const nextApplied = (rb.appliedEmployeeIds ?? []).length + batch.length
  return { done: nextApplied >= employeeRows.length }
}

async function markImportApplyFailedStep(
  payload: HrmImportApplyPayload,
  err: unknown
) {
  "use step"

  const errorCode =
    err instanceof Error ? err.message.slice(0, 120) : "unknown_error"

  await db
    .update(hrmImportSession)
    .set({ status: "failed", updatedAt: new Date() })
    .where(
      and(
        eq(hrmImportSession.organizationId, payload.organizationId),
        eq(hrmImportSession.id, payload.sessionId)
      )
    )

  await writeIamAuditEvent({
    action: HRM_BULK_IMPORT_AUDIT.sessionCommit,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "hrm_import_session",
    resourceId: payload.sessionId,
    metadata: { failed: true, errorCode },
  })
}
