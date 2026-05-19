import "server-only"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"

import { HRM_LAM_LEAVE_EVENT_TYPES } from "../hrm-lam.contract"

export type LeaveLifecycleEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "overdue"

const EVENT_TITLE: Record<LeaveLifecycleEvent, string> = {
  submitted: "Leave request submitted",
  approved: "Leave request approved",
  rejected: "Leave request rejected",
  returned: "Leave request returned",
  cancelled: "Leave request cancelled",
  overdue: "Leave approval overdue",
}

const EVENT_AUDIT_TYPE: Record<LeaveLifecycleEvent, string> = {
  submitted: HRM_LAM_LEAVE_EVENT_TYPES.submitted,
  approved: HRM_LAM_LEAVE_EVENT_TYPES.approved,
  rejected: HRM_LAM_LEAVE_EVENT_TYPES.rejected,
  returned: HRM_LAM_LEAVE_EVENT_TYPES.returned,
  cancelled: HRM_LAM_LEAVE_EVENT_TYPES.cancelled,
  overdue: HRM_LAM_LEAVE_EVENT_TYPES.overdue,
}

/**
 * In-app notification for leave lifecycle transitions (requester or approver).
 * Best-effort — never throws to callers after a successful DB commit.
 */
export async function notifyLeaveLifecycle(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly event: LeaveLifecycleEvent
  readonly targetUserId: string | null
  readonly leaveTypeCode?: string | null
  readonly startDate?: string | null
  readonly endDate?: string | null
  readonly linkedPath?: string | null
}): Promise<void> {
  if (!input.targetUserId) return

  const range =
    input.startDate && input.endDate
      ? `${input.startDate} → ${input.endDate}`
      : null
  const typeLabel = input.leaveTypeCode?.trim() || "leave"
  const bodyParts = [
    `${typeLabel} request ${EVENT_TITLE[input.event].toLowerCase()}.`,
    range,
  ].filter(Boolean)

  try {
    await publishOrgNotificationIfMissing({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      title: EVENT_TITLE[input.event],
      body: bodyParts.join(" "),
      severity:
        input.event === "rejected" || input.event === "overdue"
          ? "warning"
          : "info",
      linkedEntityType: EVENT_AUDIT_TYPE[input.event],
      linkedEntityId: input.requestId,
      linkedEntityLabel: typeLabel,
      linkedPath: input.linkedPath ?? "/apps/hrm/leave",
      expiresAt: null,
    })
  } catch {
    // Notification delivery must not roll back leave mutations.
  }
}

export async function notifyLeaveEmployeeLifecycle(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly leaveTypeId: string
  readonly requestId: string
  readonly event: LeaveLifecycleEvent
  readonly startDate: string
  readonly endDate: string
  readonly linkedPath?: string | null
}): Promise<void> {
  const { getLeaveEmployeeForOrg, getLeaveTypeForRequest } = await import(
    "./leave-request.queries.server"
  )

  const [employee, leaveType] = await Promise.all([
    getLeaveEmployeeForOrg(input.organizationId, input.employeeId),
    getLeaveTypeForRequest(input.organizationId, input.leaveTypeId),
  ])

  await notifyLeaveLifecycle({
    organizationId: input.organizationId,
    requestId: input.requestId,
    event: input.event,
    targetUserId: employee?.linkedUserId ?? null,
    leaveTypeCode: leaveType?.code ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    linkedPath: input.linkedPath,
  })
}
