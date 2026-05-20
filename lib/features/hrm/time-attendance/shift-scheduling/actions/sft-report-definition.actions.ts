"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  createShiftRosterReportDefinition,
  deleteShiftRosterReportDefinition,
} from "../data/sft-report-definition.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"
import {
  rosterListFiltersSchema,
  saveShiftRosterReportDefinitionSchema,
} from "../schemas/sft.schema"
import type { SftCoverageFormState } from "../../../types"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"

export async function saveShiftRosterReportDefinitionAction(
  _prev: SftCoverageFormState | undefined,
  formData: FormData
): Promise<SftCoverageFormState> {
  const session = await requireOrgSession()

  const allowed = await canUseErpPermission({
    organizationId: session.organizationId,
    userId: session.userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "update",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to save roster report definitions.",
    })
  }

  const parsed = saveShiftRosterReportDefinitionSchema.safeParse({
    name: formData.get("name"),
    departmentId: formData.get("departmentId") || null,
    jobGradeId: formData.get("jobGradeId") || null,
    locationCode: formData.get("locationCode") || null,
    legalEntityOrgUnitId: formData.get("legalEntityOrgUnitId") || null,
    teamOrgUnitId: formData.get("teamOrgUnitId") || null,
    positionId: formData.get("positionId") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const filtersParsed = rosterListFiltersSchema.safeParse({
    departmentId: parsed.data.departmentId,
    jobGradeId: parsed.data.jobGradeId,
    locationCode: parsed.data.locationCode,
    legalEntityOrgUnitId: parsed.data.legalEntityOrgUnitId,
    teamOrgUnitId: parsed.data.teamOrgUnitId,
    positionId: parsed.data.positionId,
  })

  const result = await createShiftRosterReportDefinition({
    organizationId: session.organizationId,
    userId: session.userId,
    name: parsed.data.name,
    filters: filtersParsed.success ? filtersParsed.data : {},
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.reportDefinitionCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_roster_report_definition",
    resourceId: result.definitionId,
    metadata: { name: parsed.data.name },
  })

  revalidateSftSurfaces()
  return { ok: true, requirementId: result.definitionId }
}

export async function deleteShiftRosterReportDefinitionAction(
  _prev: SftCoverageFormState | undefined,
  formData: FormData
): Promise<SftCoverageFormState> {
  const session = await requireOrgSession()

  const allowed = await canUseErpPermission({
    organizationId: session.organizationId,
    userId: session.userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "update",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to delete roster report definitions.",
    })
  }

  const definitionId = String(formData.get("definitionId") ?? "").trim()
  if (!definitionId) {
    return hrmActionFailure({ form: "Report definition id is required." })
  }

  const result = await deleteShiftRosterReportDefinition({
    organizationId: session.organizationId,
    definitionId,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.reportDefinitionDelete,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_roster_report_definition",
    resourceId: definitionId,
    metadata: {},
  })

  revalidateSftSurfaces()
  return { ok: true, requirementId: definitionId }
}
