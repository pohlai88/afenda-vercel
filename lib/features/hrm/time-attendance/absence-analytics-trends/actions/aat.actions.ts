"use server"

import { after } from "next/server"

import {
  requireOrgSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_AAT_AUDIT } from "../aat.contract"
import { buildAatAnalyticsReportCsv } from "../data/aat-report-export.shared"
import { buildAatOrgAnalyticsSnapshot } from "../data/aat-analytics.queries.server"
import { getAatThresholdConfigForOrg } from "../data/aat-threshold.queries.server"
import { parseAatPeriodKey, parseAatScopeKey } from "../schemas/aat.schema"
import type {
  UpdateAatThresholdFormInput,
  UpdateAatThresholdFormState,
} from "../schemas/aat-threshold-action.schema"
import { resolveAatSurfaceAccess } from "../data/aat-access.server"
import { findAatManagerContextForUser } from "../data/aat-employee-context.server"

export async function exportAatAnalyticsReportCsvAction(input: {
  period?: string
  scope?: string
}): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const access = await resolveAatSurfaceAccess({ organizationId, userId })
  if (!access.canExportReport) {
    return { ok: false, error: "You are not authorized to export this report." }
  }

  const period = parseAatPeriodKey(input.period)
  const scope = parseAatScopeKey(input.scope)
  const managerContext =
    scope === "team"
      ? await findAatManagerContextForUser({ organizationId, userId })
      : null

  if (scope === "team" && !managerContext) {
    return {
      ok: false,
      error: "Team scope requires a linked employee record for your account.",
    }
  }

  const thresholds = await getAatThresholdConfigForOrg(organizationId)
  const snapshot = await buildAatOrgAnalyticsSnapshot({
    organizationId,
    period,
    scope,
    managerEmployeeId: managerContext?.employeeId ?? null,
    canViewSensitiveReasons: access.canViewSensitiveReasons,
    thresholds,
  })

  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildAatAnalyticsReportCsv(snapshot)
  const filename = `absence-analytics-${snapshot.scope}-${period}-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_AAT_AUDIT.reportExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_absence_analytics_report",
      resourceId: `${snapshot.scope}-${period}-${asOf}`,
      metadata: {
        period,
        scope: snapshot.scope,
        rowCount:
          snapshot.departmentRanking.length +
          snapshot.highRiskEmployees.length +
          snapshot.leaveTypeBreakdown.length,
        format: "csv",
      },
    })
  )

  return { ok: true, csv, filename }
}

export async function updateAatThresholdAction(
  _prev: UpdateAatThresholdFormState | undefined,
  formData: FormData
): Promise<UpdateAatThresholdFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const access = await resolveAatSurfaceAccess({ organizationId, userId })
  if (!access.canConfigureThresholds) {
    return { ok: false, errors: { watchAbsenceRate: "Permission denied." } }
  }

  const { parseUpdateAatThresholdFormData } = await import(
    "../schemas/aat-threshold-action.schema"
  )
  const parsed = parseUpdateAatThresholdFormData(formData)
  if (!parsed.success) {
    const errors: Partial<Record<keyof UpdateAatThresholdFormInput, string>> =
      {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === "string") {
        errors[key as keyof typeof errors] = issue.message
      }
    }
    return { ok: false, errors }
  }

  const { upsertAatThresholdConfigForOrg } = await import(
    "../data/aat-threshold.queries.server"
  )
  await upsertAatThresholdConfigForOrg({
    organizationId,
    config: parsed.data,
    updatedByUserId: userId,
  })

  const { revalidatePath } = await import("next/cache")
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/absence-analytics"), "page")

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_AAT_AUDIT.thresholdUpdate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_absence_analytics_threshold",
      resourceId: organizationId,
      metadata: { config: parsed.data },
    })
  )

  return { ok: true }
}
