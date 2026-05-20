"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftTemplate } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { CreateShiftTemplateFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import { buildScheduledShiftWindow } from "../data/sft-shift.shared"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"
import { createShiftTemplateSchema } from "../schemas/sft.schema"

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { readonly code?: unknown }).code === "23505"
  )
}

export async function createShiftTemplateAction(
  _prev: CreateShiftTemplateFormState | undefined,
  formData: FormData
): Promise<CreateShiftTemplateFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "create",
    errorMessage: "HRM shift schedule create permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const raw = {
    code: formData.get("code"),
    name: formData.get("name"),
    defaultStartTime: formData.get("defaultStartTime"),
    defaultEndTime: formData.get("defaultEndTime"),
    unpaidBreakMinutes: formData.get("unpaidBreakMinutes") ?? undefined,
    paidBreakMinutes: formData.get("paidBreakMinutes") ?? undefined,
    lateGraceMinutes: formData.get("lateGraceMinutes") ?? undefined,
    earlyOutGraceMinutes: formData.get("earlyOutGraceMinutes") ?? undefined,
    overtimeGraceMinutes: formData.get("overtimeGraceMinutes") ?? undefined,
    maxContinuousClockMinutes:
      formData.get("maxContinuousClockMinutes") ?? undefined,
    holidayBehavior: formData.get("holidayBehavior") ?? undefined,
    shiftCategory: formData.get("shiftCategory") ?? undefined,
    patternKind: formData.get("patternKind") ?? undefined,
  }

  const parsed = createShiftTemplateSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: flat.code?.[0],
      name: flat.name?.[0],
      defaultStartTime: flat.defaultStartTime?.[0],
      defaultEndTime: flat.defaultEndTime?.[0],
      unpaidBreakMinutes: flat.unpaidBreakMinutes?.[0],
      paidBreakMinutes: flat.paidBreakMinutes?.[0],
      lateGraceMinutes: flat.lateGraceMinutes?.[0],
      earlyOutGraceMinutes: flat.earlyOutGraceMinutes?.[0],
      overtimeGraceMinutes: flat.overtimeGraceMinutes?.[0],
      maxContinuousClockMinutes: flat.maxContinuousClockMinutes?.[0],
      holidayBehavior: flat.holidayBehavior?.[0],
    })
  }
  const data = parsed.data

  buildScheduledShiftWindow({
    attendanceDate: "2026-01-01",
    defaultStartTime: data.defaultStartTime,
    defaultEndTime: data.defaultEndTime,
  })

  const shiftTemplateId = crypto.randomUUID()
  try {
    await db.insert(hrmShiftTemplate).values({
      id: shiftTemplateId,
      organizationId: session.organizationId,
      code: data.code,
      name: data.name,
      defaultStartTime: data.defaultStartTime,
      defaultEndTime: data.defaultEndTime,
      unpaidBreakMinutes: data.unpaidBreakMinutes,
      paidBreakMinutes: data.paidBreakMinutes,
      lateGraceMinutes: data.lateGraceMinutes,
      earlyOutGraceMinutes: data.earlyOutGraceMinutes,
      overtimeGraceMinutes: data.overtimeGraceMinutes,
      maxContinuousClockMinutes: data.maxContinuousClockMinutes,
      holidayBehavior: data.holidayBehavior,
      shiftCategory: data.shiftCategory,
      patternKind: data.patternKind,
      createdByUserId: session.userId,
      updatedByUserId: session.userId,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return hrmActionFailure({
        code: "A shift template with this code already exists.",
      })
    }
    throw error
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.templateCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_template",
    resourceId: shiftTemplateId,
    metadata: {
      code: data.code,
      shiftCategory: data.shiftCategory,
      patternKind: data.patternKind,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, shiftTemplateId }
}
