import "server-only"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmLeaveBalance, hrmLeaveType, iamAuditEvent } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { recomputeLeaveBalance } from "../../leave-attendance-management/data/leave-balance.server"
import { getOtmPolicyForOrg } from "./otm-policy.server"
import {
  OTM_STANDARD_MINUTES_PER_LEAVE_DAY,
  payableMinutesToCompensatoryLeaveDays,
} from "./otm-compensatory-leave.shared"

export type OtmCompensatoryLeaveCreditResult =
  | { status: "skipped"; reason: string }
  | { status: "credited"; balanceId: string; leaveDays: number; leaveTypeCode: string }
  | { status: "failed"; reason: string }

function revalidateLeaveSurfacesAfterCompensatoryCredit() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/leave"), "layout")
}

async function hasCompensatoryCreditAuditForRequest(input: {
  organizationId: string
  requestId: string
}): Promise<boolean> {
  const row = await db.query.iamAuditEvent.findFirst({
    where: and(
      eq(iamAuditEvent.organizationId, input.organizationId),
      eq(iamAuditEvent.action, HRM_OTM_AUDIT.compensatoryCredit),
      sql`${iamAuditEvent.metadata}->>'overtimeRequestId' = ${input.requestId}`
    ),
    columns: { id: true },
  })
  return row != null
}

/**
 * Credits compensatory leave from approved payable minutes when org policy allows.
 * Idempotent per overtime request via audit metadata.
 */
export async function applyOtmCompensatoryLeaveCredit(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  employeeId: string
  workDate: string
  payableMinutes: number
}): Promise<OtmCompensatoryLeaveCreditResult> {
  const policy = await getOtmPolicyForOrg(input.organizationId)

  if (!policy.allowCompensatoryTime) {
    return { status: "skipped", reason: "compensatory_disabled" }
  }

  const leaveTypeCode = policy.compensatoryLeaveTypeCode?.trim()
  if (!leaveTypeCode) {
    return { status: "skipped", reason: "compensatory_leave_type_unset" }
  }

  if (await hasCompensatoryCreditAuditForRequest(input)) {
    return { status: "skipped", reason: "already_credited" }
  }

  const leaveDays = payableMinutesToCompensatoryLeaveDays(input.payableMinutes)
  if (leaveDays == null) {
    return { status: "skipped", reason: "zero_payable_minutes" }
  }

  const leaveType = await db.query.hrmLeaveType.findFirst({
    where: and(
      eq(hrmLeaveType.organizationId, input.organizationId),
      eq(hrmLeaveType.code, leaveTypeCode)
    ),
    columns: { id: true, code: true, archivedAt: true },
  })

  if (!leaveType) {
    return {
      status: "failed",
      reason: `Leave type "${leaveTypeCode}" is not configured.`,
    }
  }

  if (leaveType.archivedAt) {
    return {
      status: "failed",
      reason: `Leave type "${leaveTypeCode}" is archived.`,
    }
  }

  const entitlementYear = Number.parseInt(input.workDate.slice(0, 4), 10)
  if (!Number.isFinite(entitlementYear)) {
    return { status: "failed", reason: "Invalid work date for entitlement year." }
  }

  await recomputeLeaveBalance(
    input.organizationId,
    input.employeeId,
    leaveType.id,
    entitlementYear
  )

  const existing = await db.query.hrmLeaveBalance.findFirst({
    where: and(
      eq(hrmLeaveBalance.organizationId, input.organizationId),
      eq(hrmLeaveBalance.employeeId, input.employeeId),
      eq(hrmLeaveBalance.leaveTypeId, leaveType.id),
      eq(hrmLeaveBalance.entitlementYear, entitlementYear)
    ),
    columns: {
      id: true,
      openingDays: true,
      adjustedDays: true,
      carriedForwardDays: true,
    },
  })

  if (!existing) {
    return {
      status: "failed",
      reason:
        "Leave balance is not initialized for this employee, type, and entitlement year.",
    }
  }

  const now = new Date()
  const adjustedDays =
    Number(existing.adjustedDays) + leaveDays

  await db
    .update(hrmLeaveBalance)
    .set({
      adjustedDays: String(adjustedDays),
      updatedAt: now,
      lastRecomputedAt: now,
    })
    .where(eq(hrmLeaveBalance.id, existing.id))

  await recomputeLeaveBalance(
    input.organizationId,
    input.employeeId,
    leaveType.id,
    entitlementYear
  )

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.compensatoryCredit,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_leave_balance",
    resourceId: existing.id,
    metadata: {
      overtimeRequestId: input.requestId,
      employeeId: input.employeeId,
      leaveTypeCode: leaveType.code,
      entitlementYear,
      payableMinutes: input.payableMinutes,
      minutesPerLeaveDay: OTM_STANDARD_MINUTES_PER_LEAVE_DAY,
      leaveDays,
      adjustmentKind: "manual_correction",
    },
  })

  revalidateLeaveSurfacesAfterCompensatoryCredit()

  return {
    status: "credited",
    balanceId: existing.id,
    leaveDays,
    leaveTypeCode: leaveType.code,
  }
}
