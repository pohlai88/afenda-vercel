"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmLeaveRequest,
  hrmLeaveType,
} from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  buildLeaveApprovalSnapshot,
  detectLeaveOverlap,
  listActiveLeaveRequestsForOverlapCheck,
  readLeaveBalance,
  recomputeLeaveBalance,
} from "../data/leave-balance.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  applyLeaveFormSchema,
  cancelLeaveFormSchema,
} from "../schemas/leave-request.schema"
import type {
  LeaveRequestMutationFormState,
  CancelLeaveFormState,
} from "../types"

/**
 * Revalidates at **layout** scope so the HRM rail's `leave` pressure
 * badge (Phase 2 — `getHrmRailPressureCounts`) refreshes after every
 * leave-request mutation. The leave page revalidation comes along for
 * free since it sits below the layout.
 */
function revalidateLeaveRequests() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/leave"), "layout")
}

// ---------------------------------------------------------------------------
// Tier B — apply leave (admin submits on behalf of employee at MVP)
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — submits a leave request for an employee.
 * Creates: hrm_leave_request (state=submitted) + hrm_approval (state=pending).
 * Validates: balance sufficiency, date overlap, employee/leaveType ownership.
 * Audit: `erp.hrm.leave.request.create` + `erp.hrm.approval.request`
 */
export async function applyLeaveAction(
  _prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = applyLeaveFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    durationDays: formData.get("durationDays"),
    halfDay: formData.get("halfDay") ?? "none",
    reason: formData.get("reason") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    policyVersion: formData.get("policyVersion") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        employeeId: errs.employeeId?.[0],
        leaveTypeId: errs.leaveTypeId?.[0],
        startDate: errs.startDate?.[0],
        endDate: errs.endDate?.[0],
        durationDays: errs.durationDays?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const { data } = parsed

  // IDOR guard — verify employee and leave type belong to this org
  const [employee, leaveType] = await Promise.all([
    db.query.hrmEmployee.findFirst({
      where: and(
        eq(hrmEmployee.id, data.employeeId),
        eq(hrmEmployee.organizationId, organizationId)
      ),
      columns: {
        id: true,
        employeeNumber: true,
        legalName: true,
        archivedAt: true,
      },
    }),
    db.query.hrmLeaveType.findFirst({
      where: and(
        eq(hrmLeaveType.id, data.leaveTypeId),
        eq(hrmLeaveType.organizationId, organizationId)
      ),
      columns: { id: true, code: true, archivedAt: true },
    }),
  ])

  if (!employee) {
    return { ok: false, errors: { employeeId: "Employee not found." } }
  }
  if (employee.archivedAt) {
    return {
      ok: false,
      errors: { employeeId: "Cannot submit leave for an archived employee." },
    }
  }
  if (!leaveType) {
    return { ok: false, errors: { leaveTypeId: "Leave type not found." } }
  }
  if (leaveType.archivedAt) {
    return { ok: false, errors: { leaveTypeId: "Leave type is archived." } }
  }

  // Derive entitlement year from start date
  const entitlementYear = parseInt(data.startDate.slice(0, 4), 10)

  // Read current balance (used for snapshot + sufficiency check)
  const currentBalance = await readLeaveBalance(
    organizationId,
    data.employeeId,
    data.leaveTypeId,
    entitlementYear
  )

  // Sufficiency guard — available must cover this request
  if (currentBalance.daysAvailable < data.durationDays) {
    return {
      ok: false,
      errors: {
        durationDays: `Insufficient balance. Available: ${currentBalance.daysAvailable.toFixed(2)} days.`,
      },
    }
  }

  // Overlap guard — check for conflicting active requests
  const existingRequests = await listActiveLeaveRequestsForOverlapCheck(
    organizationId,
    data.employeeId,
    data.leaveTypeId
  )

  const hasOverlap = detectLeaveOverlap(
    data.startDate,
    data.endDate,
    existingRequests
  )

  if (hasOverlap) {
    return {
      ok: false,
      errors: {
        startDate: "Leave dates overlap with an existing active request.",
      },
    }
  }

  // Build immutable approval snapshot
  const snapshot = buildLeaveApprovalSnapshot({
    employeeId: data.employeeId,
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.legalName,
    leaveTypeId: data.leaveTypeId,
    leaveTypeCode: leaveType.code,
    startDate: data.startDate,
    endDate: data.endDate,
    durationDays: data.durationDays,
    halfDay: data.halfDay,
    reason: data.reason,
    balanceBefore: currentBalance,
    policyVersion: data.policyVersion,
    requestedAt: new Date(),
  })

  const requestId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()

  // Transactional: insert leave_request + approval together
  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: "leave_request",
      subjectId: requestId,
      state: "pending",
      requestedByUserId: userId,
      snapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmLeaveRequest).values({
      id: requestId,
      organizationId,
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays: String(data.durationDays),
      halfDay: data.halfDay,
      reason: data.reason,
      evidenceDocumentId: data.evidenceDocumentId,
      state: "submitted",
      currentApprovalId: approvalId,
      policyVersion: data.policyVersion,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  })

  // Write audit events after successful commit
  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave.request.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_request",
    resourceId: requestId,
    metadata: {
      employeeId: data.employeeId,
      leaveTypeCode: leaveType.code,
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays: data.durationDays,
    },
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.request",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: {
      subjectKind: "leave_request",
      subjectId: requestId,
    },
  })

  revalidateLeaveRequests()
  return { ok: true, requestId }
}

// ---------------------------------------------------------------------------
// Tier B — cancel leave request
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — cancels a submitted or approved leave request.
 * Transitions: submitted|approved → cancelled; pending approval → cancelled.
 * Audit: `erp.hrm.leave.request.cancel` (+ `erp.hrm.approval.cancel` if pending)
 */
export async function cancelLeaveAction(
  _prev: CancelLeaveFormState | undefined,
  formData: FormData
): Promise<CancelLeaveFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = cancelLeaveFormSchema.safeParse({
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    return {
      ok: false,
      errors: { requestId: parsed.error.issues[0]?.message },
    }
  }

  const { requestId } = parsed.data

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

  const CANCELLABLE_STATES = ["submitted", "approved"]
  if (!CANCELLABLE_STATES.includes(req.state)) {
    return {
      ok: false,
      errors: {
        requestId: `Cannot cancel a leave request with state "${req.state}".`,
      },
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmLeaveRequest)
      .set({ state: "cancelled", updatedAt: now, updatedByUserId: userId })
      .where(eq(hrmLeaveRequest.id, requestId))

    if (req.currentApprovalId) {
      const approval = await tx.query.hrmApproval.findFirst({
        where: eq(hrmApproval.id, req.currentApprovalId),
        columns: { id: true, state: true },
      })
      if (approval?.state === "pending") {
        await tx
          .update(hrmApproval)
          .set({
            state: "cancelled",
            decisionByUserId: userId,
            decisionAt: now,
            decisionNote: "Leave request cancelled.",
            updatedAt: now,
            updatedByUserId: userId,
          })
          .where(eq(hrmApproval.id, req.currentApprovalId))
      }
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave.request.cancel",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_request",
    resourceId: requestId,
    metadata: {
      previousState: req.state,
      employeeId: req.employeeId,
    },
  })

  if (req.currentApprovalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.cancel",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: req.currentApprovalId,
      metadata: { subjectKind: "leave_request", subjectId: requestId },
    })
  }

  // Recompute balance (daysPending decreases)
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
