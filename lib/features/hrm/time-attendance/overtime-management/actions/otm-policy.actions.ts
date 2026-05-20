"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { UpsertOtmPolicyFormState } from "../../../types"
import { upsertOtmPolicyFormSchema } from "../schemas/otm.schema"
import { upsertOtmPolicy } from "../data/otm-policy.server"

export async function upsertOtmPolicyAction(
  _prev: UpsertOtmPolicyFormState | undefined,
  formData: FormData
): Promise<UpsertOtmPolicyFormState> {
  const gate = await requireHrmPermission({
    object: "overtime",
    function: "update",
    errorMessage: "Overtime update permission required to edit policy.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const parsed = upsertOtmPolicyFormSchema.safeParse({
    minDurationMinutes: formData.get("minDurationMinutes"),
    dailyCapMinutes: formData.get("dailyCapMinutes"),
    weeklyCapMinutes: formData.get("weeklyCapMinutes"),
    monthlyCapMinutes: formData.get("monthlyCapMinutes"),
    roundingIntervalMinutes: formData.get("roundingIntervalMinutes"),
    roundingMode: formData.get("roundingMode"),
    compareAttendanceEnabled: formData.get("compareAttendanceEnabled") === "on",
    compareShiftEnabled: formData.get("compareShiftEnabled") === "on",
    claimDeadlineDays: formData.get("claimDeadlineDays"),
    allowCompensatoryTime: formData.get("allowCompensatoryTime") === "on",
    compensatoryLeaveTypeCode: formData.get("compensatoryLeaveTypeCode"),
    defaultEarningCode: formData.get("defaultEarningCode"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await upsertOtmPolicy({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    policy: {
      minDurationMinutes: parsed.data.minDurationMinutes,
      dailyCapMinutes: parsed.data.dailyCapMinutes,
      weeklyCapMinutes: parsed.data.weeklyCapMinutes,
      monthlyCapMinutes: parsed.data.monthlyCapMinutes,
      roundingIntervalMinutes: parsed.data.roundingIntervalMinutes,
      roundingMode: parsed.data.roundingMode,
      compareAttendanceEnabled: parsed.data.compareAttendanceEnabled ?? false,
      compareShiftEnabled: parsed.data.compareShiftEnabled ?? true,
      claimDeadlineDays: parsed.data.claimDeadlineDays,
      allowCompensatoryTime: parsed.data.allowCompensatoryTime ?? false,
      compensatoryLeaveTypeCode: parsed.data.compensatoryLeaveTypeCode ?? null,
      defaultEarningCode: parsed.data.defaultEarningCode,
    },
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.errors.form })
  }

  return { ok: true }
}
