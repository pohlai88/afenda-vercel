import "server-only"

import { cache } from "react"
import { and, eq } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { HRM_OTM_AUDIT } from "../otm.contract"
import {
  resolveOtmUserEmail,
  sendOtmLifecycleEmail,
} from "./otm-notification-email.server"

export type OtmLifecycleEvent =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "adjusted"
  | "payroll_ready"
  | "exception_pending"
  | "overdue"
  | "advanced_to_hr"

const EVENT_TITLE: Record<OtmLifecycleEvent, string> = {
  submitted: "Overtime request submitted",
  approved: "Overtime request approved",
  rejected: "Overtime request rejected",
  returned: "Overtime request returned",
  cancelled: "Overtime request cancelled",
  adjusted: "Overtime request adjusted",
  payroll_ready: "Overtime ready for payroll",
  exception_pending: "Overtime exception needs review",
  overdue: "Overtime approval overdue",
  advanced_to_hr: "Overtime request needs HR approval",
}

const resolveOtmLinkedPath = cache(
  async (organizationId: string): Promise<string> => {
    const slug = await getOrganizationSlugById(organizationId)
    if (!slug) return "/apps/hrm/overtime"
    return `${organizationAppsPath(slug, "hrm")}/overtime`
  }
)

const EVENT_AUDIT_TYPE: Record<OtmLifecycleEvent, string> = {
  submitted: HRM_OTM_AUDIT.requestCreate,
  approved: HRM_OTM_AUDIT.requestApprove,
  rejected: HRM_OTM_AUDIT.requestReject,
  returned: HRM_OTM_AUDIT.requestReturn,
  cancelled: HRM_OTM_AUDIT.requestCancel,
  adjusted: HRM_OTM_AUDIT.requestAdjust,
  payroll_ready: HRM_OTM_AUDIT.payrollExport,
  exception_pending: HRM_OTM_AUDIT.requestException,
  overdue: HRM_OTM_AUDIT.requestOverdue,
  advanced_to_hr: HRM_OTM_AUDIT.requestManagerAdvance,
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

  const linkedPath =
    input.linkedPath ?? (await resolveOtmLinkedPath(input.organizationId))

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
        input.event === "rejected" ||
        input.event === "exception_pending" ||
        input.event === "overdue"
          ? "warning"
          : "info",
      linkedEntityType: EVENT_AUDIT_TYPE[input.event],
      linkedEntityId: input.requestId,
      linkedEntityLabel: "overtime",
      linkedPath,
      expiresAt: null,
    })
  } catch {
    // Notification delivery must not roll back overtime mutations.
  }

  try {
    const email = await resolveOtmUserEmail(input.targetUserId)
    if (email) {
      sendOtmLifecycleEmail({
        to: email,
        subject: EVENT_TITLE[input.event],
        text: bodyParts.join(" "),
      })
    }
  } catch {
    // Email is best-effort alongside in-app notifications.
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
