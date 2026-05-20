import "server-only"

import { and, eq } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"

export type OtmLifecycleEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "payroll_ready"
  | "exception_pending"

const EVENT_TITLE: Record<OtmLifecycleEvent, string> = {
  submitted: "Overtime request submitted",
  approved: "Overtime request approved",
  rejected: "Overtime request rejected",
  returned: "Overtime request returned",
  payroll_ready: "Overtime ready for payroll",
  exception_pending: "Overtime exception needs review",
}

const EVENT_AUDIT_TYPE: Record<OtmLifecycleEvent, string> = {
  submitted: HRM_OTM_AUDIT.requestCreate,
  approved: HRM_OTM_AUDIT.requestApprove,
  rejected: HRM_OTM_AUDIT.requestReject,
  returned: HRM_OTM_AUDIT.requestReturn,
  payroll_ready: HRM_OTM_AUDIT.payrollExport,
  exception_pending: HRM_OTM_AUDIT.requestException,
}

export async function notifyOtmLifecycle(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly event: OtmLifecycleEvent
  readonly targetUserId: string | null
  readonly workDate?: string | null
  readonly linkedPath?: string | null
}): Promise<void> {
  if (!input.targetUserId) return

  const range = input.workDate ? `Work date ${input.workDate}.` : null
  const bodyParts = [
    EVENT_TITLE[input.event].toLowerCase() + ".",
    range,
  ].filter(Boolean)

  try {
    await publishOrgNotificationIfMissing({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      title: EVENT_TITLE[input.event],
      body: bodyParts.join(" "),
      severity:
        input.event === "rejected" || input.event === "exception_pending"
          ? "warning"
          : "info",
      linkedEntityType: EVENT_AUDIT_TYPE[input.event],
      linkedEntityId: input.requestId,
      linkedEntityLabel: "overtime",
      linkedPath: input.linkedPath ?? "/apps/hrm/overtime",
      expiresAt: null,
    })
  } catch {
    // Notification delivery must not roll back overtime mutations.
  }
}

export async function notifyOtmEmployeeLifecycle(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly requestId: string
  readonly event: OtmLifecycleEvent
  readonly workDate: string
  readonly linkedPath?: string | null
}): Promise<void> {
  const employee = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.employeeId)
    ),
    columns: { linkedUserId: true },
  })

  await notifyOtmLifecycle({
    organizationId: input.organizationId,
    requestId: input.requestId,
    event: input.event,
    targetUserId: employee?.linkedUserId ?? null,
    workDate: input.workDate,
    linkedPath: input.linkedPath,
  })
}
