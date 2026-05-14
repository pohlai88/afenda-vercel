"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { db } from "#lib/db"
import { hrmEmployee, hrmImportSession } from "#lib/db/schema"
import { ORG_DASHBOARD_HRM_IMPORTS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import {
  dryRunEmployees,
  listValidEmployeeImportRows,
  parseCsv,
} from "../data/hrm-import-csv.shared"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import { hrmImportRollbackJsonSchema } from "../schemas/hrm-import.schema"
import type { ContractMutationFormState } from "../types"

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

export async function commitImportSessionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const sessionIdParam = String(formData.get("importSessionId") ?? "").trim()
  if (!sessionIdParam) {
    return hrmActionFailure({ form: "Missing import session." })
  }

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
        eq(hrmImportSession.organizationId, organizationId),
        eq(hrmImportSession.id, sessionIdParam)
      )
    )
    .limit(1)

  if (!row || row.status !== "dry_run") {
    return hrmActionFailure({
      form: "Only dry-run import sessions can be committed.",
    })
  }

  const parsedRollback = hrmImportRollbackJsonSchema.safeParse(row.rollbackJson)
  if (!parsedRollback.success) {
    return hrmActionFailure({ form: "Import session payload is invalid." })
  }

  const rb = parsedRollback.data

  try {
    if (
      rb.kind === "hrm_import_v1" &&
      rb.importType === "employees" &&
      row.importType === "employees"
    ) {
      const grid = parseCsv(rb.sourceCsv)
      const summary = dryRunEmployees(grid)
      if (summary.errors.length > 0 || summary.rowCount === 0) {
        return hrmActionFailure({
          form: "Stored CSV no longer validates; run a new dry-run.",
        })
      }
      const employeeRows = listValidEmployeeImportRows(grid)
      if (employeeRows.length === 0) {
        return hrmActionFailure({ form: "No valid employee rows to import." })
      }

      const appliedEmployeeIds = await db.transaction(async (tx) => {
        const ids: string[] = []
        for (const er of employeeRows) {
          const id = crypto.randomUUID()
          try {
            await tx.insert(hrmEmployee).values({
              id,
              organizationId,
              employeeNumber: er.employeeNumber,
              legalName: er.legalName,
              createdByUserId: userId,
              updatedByUserId: userId,
            })
          } catch (err) {
            if (isUniqueViolation(err)) {
              throw new Error(`DUPLICATE_NUMBER:${er.employeeNumber}`)
            }
            throw err
          }
          ids.push(id)
        }

        const nextRollback = {
          ...rb,
          appliedEmployeeIds: ids,
          appliedAt: new Date().toISOString(),
          appliedByUserId: userId,
        }

        await tx
          .update(hrmImportSession)
          .set({
            status: "committed",
            rollbackJson: nextRollback,
            updatedAt: new Date(),
          })
          .where(eq(hrmImportSession.id, row.id))

        return ids
      })

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: "erp.hrm.import.session.commit",
          actorUserId: userId,
          actorSessionId: sessionId,
          organizationId,
          resourceType: "hrm_import_session",
          resourceId: row.id,
          metadata: {
            importType: row.importType,
            employeesCreated: appliedEmployeeIds.length,
          },
        })
      )
    } else {
      await db
        .update(hrmImportSession)
        .set({ status: "committed", updatedAt: new Date() })
        .where(eq(hrmImportSession.id, row.id))

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: "erp.hrm.import.session.commit",
          actorUserId: userId,
          actorSessionId: sessionId,
          organizationId,
          resourceType: "hrm_import_session",
          resourceId: row.id,
          metadata: {
            importType: row.importType,
            employeesCreated: 0,
          },
        })
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("DUPLICATE_NUMBER:")) {
      const num = err.message.slice("DUPLICATE_NUMBER:".length)
      return hrmActionFailure({
        form: `Duplicate employee number in org or CSV: ${num}`,
      })
    }
    logUnexpectedServerError("hrm_import_commit_failed", err, {
      organizationId,
      importSessionId: row.id,
    })
    return hrmActionFailure({ form: "Commit failed unexpectedly." })
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_IMPORTS),
    "page"
  )
  return { ok: true }
}

export async function rollbackImportSessionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const sessionIdParam = String(formData.get("importSessionId") ?? "").trim()
  if (!sessionIdParam) {
    return hrmActionFailure({ form: "Missing import session." })
  }

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
        eq(hrmImportSession.organizationId, organizationId),
        eq(hrmImportSession.id, sessionIdParam)
      )
    )
    .limit(1)

  if (!row || row.status !== "committed") {
    return hrmActionFailure({
      form: "Only committed import sessions can be rolled back.",
    })
  }

  const parsedRollback = hrmImportRollbackJsonSchema.safeParse(row.rollbackJson)
  const appliedIds =
    parsedRollback.success &&
    parsedRollback.data.kind === "hrm_import_v1" &&
    parsedRollback.data.appliedEmployeeIds
      ? parsedRollback.data.appliedEmployeeIds
      : []

  try {
    await db.transaction(async (tx) => {
      if (appliedIds.length > 0) {
        const now = new Date()
        await tx
          .update(hrmEmployee)
          .set({
            archivedAt: now,
            archivedByUserId: userId,
            archivedReason: "hrm_import_rollback",
            updatedAt: now,
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              inArray(hrmEmployee.id, appliedIds)
            )
          )
      }

      await tx
        .update(hrmImportSession)
        .set({ status: "rolled_back", updatedAt: new Date() })
        .where(eq(hrmImportSession.id, row.id))
    })
  } catch (err) {
    logUnexpectedServerError("hrm_import_rollback_failed", err, {
      organizationId,
      importSessionId: row.id,
    })
    return hrmActionFailure({ form: "Rollback failed unexpectedly." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.import.session.rollback",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_import_session",
      resourceId: row.id,
      metadata: {
        importType: row.importType,
        employeesArchived: appliedIds.length,
      },
    })
  )

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_IMPORTS),
    "page"
  )
  return { ok: true }
}
