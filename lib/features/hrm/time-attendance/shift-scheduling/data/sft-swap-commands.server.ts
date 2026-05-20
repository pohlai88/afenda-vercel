import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmShiftAssignment,
  hrmShiftSwapRequest,
} from "#lib/db/schema"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_SFT_AUDIT, SFT_SWAP_APPROVAL_SUBJECT_KIND } from "../sft.contract"
import { notifyShiftSwapResolved } from "./sft-notification.server"
import { revalidateSftSurfaces } from "./sft-revalidate.server"

export async function submitShiftSwapRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requesterEmployeeId: string
  requesterAssignmentId: string
  counterpartyAssignmentId: string
  reason: string
}): Promise<
  { ok: true; swapRequestId: string } | { ok: false; error: string }
> {
  const [requesterRows, counterpartyRows] = await Promise.all([
    db
      .select()
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.id, input.requesterAssignmentId),
          eq(hrmShiftAssignment.employeeId, input.requesterEmployeeId)
        )
      )
      .limit(1),
    db
      .select()
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.id, input.counterpartyAssignmentId)
        )
      )
      .limit(1),
  ])
  const requesterAssignment = requesterRows[0]
  const counterpartyAssignment = counterpartyRows[0]

  if (!requesterAssignment || !counterpartyAssignment) {
    return { ok: false, error: "Shift assignments not found for this org." }
  }

  if (requesterAssignment.id === counterpartyAssignment.id) {
    return { ok: false, error: "Cannot swap the same assignment." }
  }

  const swapRequestId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId: input.organizationId,
      subjectKind: SFT_SWAP_APPROVAL_SUBJECT_KIND,
      subjectId: swapRequestId,
      state: "pending",
      requestedByUserId: input.userId,
      currentApproverUserId: null,
      snapshot: {
        requesterAssignmentId: requesterAssignment.id,
        counterpartyAssignmentId: counterpartyAssignment.id,
        requesterEmployeeId: requesterAssignment.employeeId,
        counterpartyEmployeeId: counterpartyAssignment.employeeId,
        reason: input.reason,
      },
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })

    await tx.insert(hrmShiftSwapRequest).values({
      id: swapRequestId,
      organizationId: input.organizationId,
      requesterEmployeeId: requesterAssignment.employeeId,
      requesterAssignmentId: requesterAssignment.id,
      counterpartyEmployeeId: counterpartyAssignment.employeeId,
      counterpartyAssignmentId: counterpartyAssignment.id,
      state: "submitted",
      reason: input.reason,
      currentApprovalId: approvalId,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.swapCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_swap_request",
    resourceId: swapRequestId,
    metadata: {
      requesterAssignmentId: requesterAssignment.id,
      counterpartyAssignmentId: counterpartyAssignment.id,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId }
}

async function canDecideShiftSwap(input: {
  organizationId: string
  userId: string
  currentApprovalId: string | null
}): Promise<boolean> {
  if (!input.currentApprovalId) {
    return canUseErpPermission({
      organizationId: input.organizationId,
      userId: input.userId,
      permission: {
        module: "hrm",
        object: "shift_schedule",
        function: "update",
      },
    })
  }

  const approvalRows = await db
    .select({
      state: hrmApproval.state,
      currentApproverUserId: hrmApproval.currentApproverUserId,
    })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, input.organizationId),
        eq(hrmApproval.id, input.currentApprovalId)
      )
    )
    .limit(1)
  const approval = approvalRows[0]

  if (
    approval?.state === "pending" &&
    approval.currentApproverUserId === input.userId
  ) {
    return true
  }

  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "update",
    },
  })
}

async function exchangeAssignments(input: {
  organizationId: string
  requesterAssignmentId: string
  counterpartyAssignmentId: string
  actorUserId: string
}): Promise<void> {
  const [aRows, bRows] = await Promise.all([
    db
      .select()
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.id, input.requesterAssignmentId)
        )
      )
      .limit(1),
    db
      .select()
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.id, input.counterpartyAssignmentId)
        )
      )
      .limit(1),
  ])
  const a = aRows[0]
  const b = bRows[0]

  if (!a || !b) return

  await db.transaction(async (tx) => {
    await tx
      .update(hrmShiftAssignment)
      .set({
        shiftTemplateId: b.shiftTemplateId,
        scheduledStartAt: b.scheduledStartAt,
        scheduledEndAt: b.scheduledEndAt,
        templateCode: b.templateCode,
        templateName: b.templateName,
        unpaidBreakMinutes: b.unpaidBreakMinutes,
        paidBreakMinutes: b.paidBreakMinutes,
        lateGraceMinutes: b.lateGraceMinutes,
        earlyOutGraceMinutes: b.earlyOutGraceMinutes,
        overtimeGraceMinutes: b.overtimeGraceMinutes,
        maxContinuousClockMinutes: b.maxContinuousClockMinutes,
        holidayBehavior: b.holidayBehavior,
        policySnapshot: b.policySnapshot,
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(hrmShiftAssignment.id, a.id))

    await tx
      .update(hrmShiftAssignment)
      .set({
        shiftTemplateId: a.shiftTemplateId,
        scheduledStartAt: a.scheduledStartAt,
        scheduledEndAt: a.scheduledEndAt,
        templateCode: a.templateCode,
        templateName: a.templateName,
        unpaidBreakMinutes: a.unpaidBreakMinutes,
        paidBreakMinutes: a.paidBreakMinutes,
        lateGraceMinutes: a.lateGraceMinutes,
        earlyOutGraceMinutes: a.earlyOutGraceMinutes,
        overtimeGraceMinutes: a.overtimeGraceMinutes,
        maxContinuousClockMinutes: a.maxContinuousClockMinutes,
        holidayBehavior: a.holidayBehavior,
        policySnapshot: a.policySnapshot,
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(hrmShiftAssignment.id, b.id))
  })
}

export async function approveShiftSwapRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  swapRequestId: string
  decisionNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const swapRows = await db
    .select()
    .from(hrmShiftSwapRequest)
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, input.organizationId),
        eq(hrmShiftSwapRequest.id, input.swapRequestId)
      )
    )
    .limit(1)
  const swap = swapRows[0]

  if (!swap || swap.state !== "submitted") {
    return { ok: false, error: "Swap request is not pending approval." }
  }

  const allowed = await canDecideShiftSwap({
    organizationId: input.organizationId,
    userId: input.userId,
    currentApprovalId: swap.currentApprovalId,
  })
  if (!allowed) {
    return { ok: false, error: "Not authorized to approve this swap." }
  }

  await exchangeAssignments({
    organizationId: input.organizationId,
    requesterAssignmentId: swap.requesterAssignmentId,
    counterpartyAssignmentId: swap.counterpartyAssignmentId,
    actorUserId: input.userId,
  })

  const now = new Date()

  await db.transaction(async (tx) => {
    if (swap.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: input.userId,
          decisionAt: now,
          decisionNote: input.decisionNote ?? null,
          updatedByUserId: input.userId,
          updatedAt: now,
        })
        .where(eq(hrmApproval.id, swap.currentApprovalId))
    }

    await tx
      .update(hrmShiftSwapRequest)
      .set({
        state: "approved",
        updatedByUserId: input.userId,
        updatedAt: now,
      })
      .where(eq(hrmShiftSwapRequest.id, swap.id))
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.swapApprove,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_swap_request",
    resourceId: swap.id,
    metadata: { decisionNote: input.decisionNote ?? null },
  })

  await notifyShiftSwapResolved({
    organizationId: input.organizationId,
    swapRequestId: swap.id,
    requesterEmployeeId: swap.requesterEmployeeId,
    counterpartyEmployeeId: swap.counterpartyEmployeeId,
    outcome: "approved",
  })

  revalidateSftSurfaces()
  return { ok: true }
}

export async function rejectShiftSwapRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  swapRequestId: string
  rejectedReason: string
  decisionNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const swapRows = await db
    .select()
    .from(hrmShiftSwapRequest)
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, input.organizationId),
        eq(hrmShiftSwapRequest.id, input.swapRequestId)
      )
    )
    .limit(1)
  const swap = swapRows[0]

  if (!swap || swap.state !== "submitted") {
    return { ok: false, error: "Swap request is not pending approval." }
  }

  const allowed = await canDecideShiftSwap({
    organizationId: input.organizationId,
    userId: input.userId,
    currentApprovalId: swap.currentApprovalId,
  })
  if (!allowed) {
    return { ok: false, error: "Not authorized to reject this swap." }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    if (swap.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "rejected",
          decisionByUserId: input.userId,
          decisionAt: now,
          decisionNote: input.decisionNote ?? input.rejectedReason,
          updatedByUserId: input.userId,
          updatedAt: now,
        })
        .where(eq(hrmApproval.id, swap.currentApprovalId))
    }

    await tx
      .update(hrmShiftSwapRequest)
      .set({
        state: "rejected",
        rejectedReason: input.rejectedReason,
        updatedByUserId: input.userId,
        updatedAt: now,
      })
      .where(eq(hrmShiftSwapRequest.id, swap.id))
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.swapReject,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_swap_request",
    resourceId: swap.id,
    metadata: { rejectedReason: input.rejectedReason },
  })

  await notifyShiftSwapResolved({
    organizationId: input.organizationId,
    swapRequestId: swap.id,
    requesterEmployeeId: swap.requesterEmployeeId,
    counterpartyEmployeeId: swap.counterpartyEmployeeId,
    outcome: "rejected",
  })

  revalidateSftSurfaces()
  return { ok: true }
}

export async function returnShiftSwapRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  swapRequestId: string
  returnedReason: string
  decisionNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const swapRows = await db
    .select()
    .from(hrmShiftSwapRequest)
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, input.organizationId),
        eq(hrmShiftSwapRequest.id, input.swapRequestId)
      )
    )
    .limit(1)
  const swap = swapRows[0]

  if (!swap || swap.state !== "submitted") {
    return { ok: false, error: "Swap request is not pending approval." }
  }

  const allowed = await canDecideShiftSwap({
    organizationId: input.organizationId,
    userId: input.userId,
    currentApprovalId: swap.currentApprovalId,
  })
  if (!allowed) {
    return { ok: false, error: "Not authorized to return this swap." }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    if (swap.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "cancelled",
          decisionByUserId: input.userId,
          decisionAt: now,
          decisionNote: input.decisionNote ?? input.returnedReason,
          updatedByUserId: input.userId,
          updatedAt: now,
        })
        .where(eq(hrmApproval.id, swap.currentApprovalId))
    }

    await tx
      .update(hrmShiftSwapRequest)
      .set({
        state: "returned",
        rejectedReason: input.returnedReason,
        currentApprovalId: null,
        updatedByUserId: input.userId,
        updatedAt: now,
      })
      .where(eq(hrmShiftSwapRequest.id, swap.id))
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.swapReturn,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_swap_request",
    resourceId: swap.id,
    metadata: { returnedReason: input.returnedReason },
  })

  await notifyShiftSwapResolved({
    organizationId: input.organizationId,
    swapRequestId: swap.id,
    requesterEmployeeId: swap.requesterEmployeeId,
    counterpartyEmployeeId: swap.counterpartyEmployeeId,
    outcome: "returned",
  })

  revalidateSftSurfaces()
  return { ok: true }
}

export async function overrideShiftSwapRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  swapRequestId: string
  overrideNote: string
  decisionNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const swapRows = await db
    .select()
    .from(hrmShiftSwapRequest)
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, input.organizationId),
        eq(hrmShiftSwapRequest.id, input.swapRequestId)
      )
    )
    .limit(1)
  const swap = swapRows[0]

  if (!swap || swap.state !== "submitted") {
    return { ok: false, error: "Swap request is not pending approval." }
  }

  const allowed = await canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "update",
    },
  })
  if (!allowed) {
    return {
      ok: false,
      error: "Not authorized to override this swap.",
    }
  }

  await exchangeAssignments({
    organizationId: input.organizationId,
    requesterAssignmentId: swap.requesterAssignmentId,
    counterpartyAssignmentId: swap.counterpartyAssignmentId,
    actorUserId: input.userId,
  })

  const now = new Date()

  await db.transaction(async (tx) => {
    if (swap.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: input.userId,
          decisionAt: now,
          decisionNote: input.decisionNote ?? input.overrideNote,
          updatedByUserId: input.userId,
          updatedAt: now,
        })
        .where(eq(hrmApproval.id, swap.currentApprovalId))
    }

    await tx
      .update(hrmShiftSwapRequest)
      .set({
        state: "approved",
        updatedByUserId: input.userId,
        updatedAt: now,
      })
      .where(eq(hrmShiftSwapRequest.id, swap.id))
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.swapOverride,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_swap_request",
    resourceId: swap.id,
    metadata: { overrideNote: input.overrideNote },
  })

  await notifyShiftSwapResolved({
    organizationId: input.organizationId,
    swapRequestId: swap.id,
    requesterEmployeeId: swap.requesterEmployeeId,
    counterpartyEmployeeId: swap.counterpartyEmployeeId,
    outcome: "overridden",
  })

  revalidateSftSurfaces()
  return { ok: true }
}
