import "server-only"

import { eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimePolicy } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import type { HrmOtmRoundingMode } from "../schemas/otm-workflow-state.shared"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"

export type OtmPolicyRow = {
  organizationId: string
  minDurationMinutes: number
  dailyCapMinutes: number | null
  weeklyCapMinutes: number | null
  monthlyCapMinutes: number | null
  roundingIntervalMinutes: number | null
  roundingMode: HrmOtmRoundingMode
  compareAttendanceEnabled: boolean
  compareShiftEnabled: boolean
  claimDeadlineDays: number | null
  allowCompensatoryTime: boolean
  compensatoryLeaveTypeCode: string | null
  defaultEarningCode: string
}

export const OTM_DEFAULT_POLICY: OtmPolicyRow = {
  organizationId: "",
  minDurationMinutes: 0,
  dailyCapMinutes: null,
  weeklyCapMinutes: null,
  monthlyCapMinutes: null,
  roundingIntervalMinutes: null,
  roundingMode: "none",
  compareAttendanceEnabled: false,
  compareShiftEnabled: true,
  claimDeadlineDays: null,
  allowCompensatoryTime: false,
  compensatoryLeaveTypeCode: null,
  defaultEarningCode: "OT",
}

export async function getOtmPolicyForOrg(
  organizationId: string
): Promise<OtmPolicyRow> {
  const row = await db.query.hrmOvertimePolicy.findFirst({
    where: eq(hrmOvertimePolicy.organizationId, organizationId),
  })

  if (!row) {
    return { ...OTM_DEFAULT_POLICY, organizationId }
  }

  return {
    organizationId,
    minDurationMinutes: row.minDurationMinutes,
    dailyCapMinutes: row.dailyCapMinutes,
    weeklyCapMinutes: row.weeklyCapMinutes,
    monthlyCapMinutes: row.monthlyCapMinutes,
    roundingIntervalMinutes: row.roundingIntervalMinutes,
    roundingMode: row.roundingMode as HrmOtmRoundingMode,
    compareAttendanceEnabled: row.compareAttendanceEnabled,
    compareShiftEnabled: row.compareShiftEnabled,
    claimDeadlineDays: row.claimDeadlineDays,
    allowCompensatoryTime: row.allowCompensatoryTime,
    compensatoryLeaveTypeCode: row.compensatoryLeaveTypeCode,
    defaultEarningCode: row.defaultEarningCode,
  }
}

export async function upsertOtmPolicy(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  policy: Omit<OtmPolicyRow, "organizationId">
}): Promise<{ ok: true } | { ok: false; errors: { form?: string } }> {
  const existing = await db.query.hrmOvertimePolicy.findFirst({
    where: eq(hrmOvertimePolicy.organizationId, input.organizationId),
    columns: { id: true },
  })

  const values = {
    minDurationMinutes: input.policy.minDurationMinutes,
    dailyCapMinutes: input.policy.dailyCapMinutes,
    weeklyCapMinutes: input.policy.weeklyCapMinutes,
    monthlyCapMinutes: input.policy.monthlyCapMinutes,
    roundingIntervalMinutes: input.policy.roundingIntervalMinutes,
    roundingMode: input.policy.roundingMode,
    compareAttendanceEnabled: input.policy.compareAttendanceEnabled,
    compareShiftEnabled: input.policy.compareShiftEnabled,
    claimDeadlineDays: input.policy.claimDeadlineDays,
    allowCompensatoryTime: input.policy.allowCompensatoryTime,
    compensatoryLeaveTypeCode: input.policy.compensatoryLeaveTypeCode,
    defaultEarningCode: input.policy.defaultEarningCode,
    updatedByUserId: input.userId,
    updatedAt: new Date(),
  }

  if (existing) {
    await db
      .update(hrmOvertimePolicy)
      .set(values)
      .where(eq(hrmOvertimePolicy.id, existing.id))

    await writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.policyUpdate,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_overtime_policy",
      resourceId: existing.id,
      metadata: { minDurationMinutes: values.minDurationMinutes },
    })
  } else {
    const id = crypto.randomUUID()
    await db.insert(hrmOvertimePolicy).values({
      id,
      organizationId: input.organizationId,
      ...values,
      createdByUserId: input.userId,
    })

    await writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.policyCreate,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_overtime_policy",
      resourceId: id,
      metadata: {},
    })
  }

  revalidateOtmSurfaces()
  return { ok: true }
}
