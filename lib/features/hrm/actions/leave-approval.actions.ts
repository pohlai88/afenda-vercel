"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmLeaveRequest } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import { recomputeLeaveBalance } from "../data/leave-balance.server"
import {
  leaveApprovalDecisionSchema,
  leaveRejectDecisionSchema,
} from "../schemas/leave-request.schema"
import type { LeaveApprovalFormState } from "../types"

/**
 * Revalidates at **layout** scope on the leave surface so the HRM
 * rail's `leave` pressure badge (Phase 2 —
 * `getHrmRailPressureCounts`) refreshes after every approval / rejection.
 * The employee-detail page still revalidates at `"page"` because it is
 * not part of the HRM dashboard layout's data envelope.
 */
function revalidateLeaveRequests() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/leave"), "layout")
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}

// ---------------------------------------------------------------------------
// Tier B — approve leave
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — approves a submitted leave request.
 * Transitions: leave_request submitted→approved; hrm_approval pending→approved.
 * Recomputes hrm_leave_balance after commit (daysPending−=, daysTaken+=).
 * Audit: `erp.hrm.approval.approve`
 */
export async function approveLeaveAction(
  _prev: LeaveApprovalFormState | undefined,
  formData: FormData
): Promise<LeaveApprovalFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = leaveApprovalDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return {
      ok: false,
      errors: { requestId: parsed.error.issues[0]?.message },
    }
  }

  const { requestId, decisionNote } = parsed.data

  const req = await db.query.hrmLeaveRequest.findFirst({
    where: and(
      eq(hrmLeaveRequest.id, requestId),
      eq(hrmLeaveRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      leaveTypeId: true,
      startDate: true,
      durationDays: true,
    },
  })

  if (!req) {
    return { ok: false, errors: { requestId: "Leave request not found." } }
  }

  if (req.state !== "submitted") {
    return {
      ok: false,
      errors: {
        requestId: `Cannot approve a leave request with state "${req.state}". Expected "submitted".`,
      },
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmLeaveRequest)
      .set({
        state: "approved",
        approvedByUserId: userId,
        approvedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmLeaveRequest.id, requestId))

    if (req.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, req.currentApprovalId))
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.approve",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: req.currentApprovalId ?? requestId,
    metadata: {
      subjectKind: "leave_request",
      subjectId: requestId,
      employeeId: req.employeeId,
    },
  })

  // Recompute balance after approval (daysPending− → daysTaken+)
  const entitlementYear = parseInt(req.startDate.slice(0, 4), 10)
  await recomputeLeaveBalance(
    organizationId,
    req.employeeId,
    req.leaveTypeId,
    entitlementYear
  )

  revalidateLeaveRequests()
  return { ok: true, requestId }
}

// ---------------------------------------------------------------------------
// Tier B — reject leave
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — rejects a submitted leave request.
 * Transitions: leave_request submitted→rejected; hrm_approval pending→rejected.
 * Recomputes hrm_leave_balance after commit (daysPending−=).
 * Audit: `erp.hrm.approval.reject`
 */
export async function rejectLeaveAction(
  _prev: LeaveApprovalFormState | undefined,
  formData: FormData
): Promise<LeaveApprovalFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = leaveRejectDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectedReason: formData.get("rejectedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        requestId: errs.requestId?.[0],
        rejectedReason: errs.rejectedReason?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const { requestId, rejectedReason, decisionNote } = parsed.data

  const req = await db.query.hrmLeaveRequest.findFirst({
    where: and(
      eq(hrmLeaveRequest.id, requestId),
      eq(hrmLeaveRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      leaveTypeId: true,
      startDate: true,
    },
  })

  if (!req) {
    return { ok: false, errors: { requestId: "Leave request not found." } }
  }

  if (req.state !== "submitted") {
    return {
      ok: false,
      errors: {
        requestId: `Cannot reject a leave request with state "${req.state}". Expected "submitted".`,
      },
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmLeaveRequest)
      .set({
        state: "rejected",
        rejectedReason,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmLeaveRequest.id, requestId))

    if (req.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "rejected",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, req.currentApprovalId))
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.reject",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: req.currentApprovalId ?? requestId,
    metadata: {
      subjectKind: "leave_request",
      subjectId: requestId,
      employeeId: req.employeeId,
      rejectedReason,
    },
  })

  // Recompute balance after rejection (daysPending−=)
  const entitlementYear = parseInt(req.startDate.slice(0, 4), 10)
  await recomputeLeaveBalance(
    organizationId,
    req.employeeId,
    req.leaveTypeId,
    entitlementYear
  )

  revalidateLeaveRequests()
  return { ok: true, requestId }
}
