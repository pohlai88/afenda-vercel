"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftReportDefinitionFormState } from "../../../types"
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

export async function saveShiftRosterReportDefinitionAction(
  _prev: SftReportDefinitionFormState | undefined,
  formData: FormData
): Promise<SftReportDefinitionFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

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
  return { ok: true, definitionId: result.definitionId }
}

export async function deleteShiftRosterReportDefinitionAction(
  _prev: SftReportDefinitionFormState | undefined,
  formData: FormData
): Promise<SftReportDefinitionFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

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
  return { ok: true, definitionId }
}
