"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"

import {
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { hrmEmployee, hrmImportSession } from "#lib/db/schema"
import { ORG_APPS_HRM_IMPORTS } from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"
import { canUseErpPermission } from "#features/erp-rbac/server"
import { enqueueHrmImportApplyWorkflowRun } from "#features/execution"

import { requireToolsOrgTenantFromForm } from "../../_module-governance/tools-action-guard.server"
import { toolsActionFailure } from "../../_module-governance/tools-action-result.shared"
import type { ToolsMutationFormState } from "../../types"
import { HRM_BULK_IMPORT_AUDIT } from "../bulk-import.contract"

import { dryRunEmployees, parseCsv } from "../data/hrm-import-csv.shared"
import { loadEmployeeImportCsvFromRollback } from "../data/hrm-import-source.server"
import { hrmImportRollbackJsonSchema } from "../schemas/hrm-import.schema"

export async function commitImportSessionAction(
  _prev: ToolsMutationFormState | undefined,
  formData: FormData
): Promise<ToolsMutationFormState> {
  const gate = await requireToolsOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, sessionId } = session

  await requireRecentAuthStepUp({
    returnTo: `/o/${orgSlug}/apps/hrm/imports`,
  })

  if (
    !(await canUseErpPermission({
      organizationId,
      userId,
      permission: { module: "hrm", object: "import", function: "update" },
    }))
  ) {
    return toolsActionFailure({
      form: "HRM import update permission required.",
    })
  }

  const sessionIdParam = String(formData.get("importSessionId") ?? "").trim()
  if (!sessionIdParam) {
    return toolsActionFailure({ form: "Missing import session." })
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
    return toolsActionFailure({
      form: "Only dry-run import sessions can be committed.",
    })
  }

  const parsedRollback = hrmImportRollbackJsonSchema.safeParse(row.rollbackJson)
  if (!parsedRollback.success) {
    return toolsActionFailure({ form: "Import session payload is invalid." })
  }

  const rb = parsedRollback.data

  try {
    if (
      rb.kind === "hrm_import_v1" &&
      rb.importType === "employees" &&
      row.importType === "employees"
    ) {
      const csvText = await loadEmployeeImportCsvFromRollback(rb)
      const summary = dryRunEmployees(parseCsv(csvText))
      if (summary.errors.length > 0 || summary.rowCount === 0) {
        return toolsActionFailure({
          form: "Stored CSV no longer validates; run a new dry-run.",
        })
      }

      await db
        .update(hrmImportSession)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(hrmImportSession.id, row.id))

      await enqueueHrmImportApplyWorkflowRun({
        organizationId,
        sessionId: row.id,
        actorUserId: userId,
        actorSessionId: sessionId,
      })
    } else if (rb.kind === "hrm_import_placeholder") {
      return toolsActionFailure({
        form: "This import type is not ready to commit. Run a valid employee CSV dry-run.",
      })
    }
  } catch (err) {
    logUnexpectedServerError("hrm_import_commit_failed", err, {
      organizationId,
      importSessionId: row.id,
    })
    return toolsActionFailure({ form: "Commit failed unexpectedly." })
  }

  revalidatePath(toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_IMPORTS), "page")
  return { ok: true }
}

export async function rollbackImportSessionAction(
  _prev: ToolsMutationFormState | undefined,
  formData: FormData
): Promise<ToolsMutationFormState> {
  const gate = await requireToolsOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, sessionId } = session

  await requireRecentAuthStepUp({
    returnTo: `/o/${orgSlug}/apps/hrm/imports`,
  })

  if (
    !(await canUseErpPermission({
      organizationId,
      userId,
      permission: { module: "hrm", object: "import", function: "update" },
    }))
  ) {
    return toolsActionFailure({
      form: "HRM import update permission required.",
    })
  }

  const sessionIdParam = String(formData.get("importSessionId") ?? "").trim()
  if (!sessionIdParam) {
    return toolsActionFailure({ form: "Missing import session." })
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
    return toolsActionFailure({
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
    return toolsActionFailure({ form: "Rollback failed unexpectedly." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BULK_IMPORT_AUDIT.sessionRollback,
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

  revalidatePath(toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_IMPORTS), "page")
  return { ok: true }
}
