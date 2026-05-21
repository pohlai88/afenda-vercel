import "server-only"

import { cache } from "react"
import { and, eq } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { resolveManagerApproverUserId } from "../../../employee-management/organizational-chart-hierarchy/data/org-structure-approval.server"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"

export type GeolocationLifecycleEvent =
  | "exception_pending"
  | "exception_approved"
  | "exception_rejected"
  | "exception_returned"
  | "checkin_verified"

const EVENT_TITLE: Record<GeolocationLifecycleEvent, string> = {
  exception_pending: "Remote check-in needs review",
  exception_approved: "Remote check-in exception approved",
  exception_rejected: "Remote check-in exception rejected",
  exception_returned: "Remote check-in exception returned",
  checkin_verified: "Remote check-in verified",
}

const EVENT_AUDIT_TYPE: Record<GeolocationLifecycleEvent, string> = {
  exception_pending: HRM_GEOLOCATION_AUDIT.exceptionSubmit,
  exception_approved: HRM_GEOLOCATION_AUDIT.exceptionApprove,
  exception_rejected: HRM_GEOLOCATION_AUDIT.exceptionReject,
  exception_returned: HRM_GEOLOCATION_AUDIT.exceptionReturn,
  checkin_verified: HRM_GEOLOCATION_AUDIT.checkinCreate,
}

const resolveGeolocationLinkedPath = cache(
  async (organizationId: string): Promise<string> => {
    const slug = await getOrganizationSlugById(organizationId)
    if (!slug) return "/apps/hrm/geolocation"
    return `${organizationAppsPath(slug, "hrm")}/geolocation`
  }
)

/**
 * In-app notification for remote check-in lifecycle (HRM-GEO-031).
 * Best-effort — never throws after a successful DB commit.
 */
export async function notifyGeolocationLifecycle(input: {
  readonly organizationId: string
  readonly resourceId: string
  readonly event: GeolocationLifecycleEvent
  readonly targetUserId: string | null
  readonly detectionOutcome?: string | null
  readonly linkedPath?: string | null
}): Promise<void> {
  if (!input.targetUserId) return

  const linkedPath =
    input.linkedPath ?? (await resolveGeolocationLinkedPath(input.organizationId))

  const detail = input.detectionOutcome?.trim()
  const bodyParts = [
    EVENT_TITLE[input.event] + ".",
    detail ? `Outcome: ${detail}.` : null,
  ].filter(Boolean)

  try {
    await publishOrgNotificationIfMissing({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      title: EVENT_TITLE[input.event],
      body: bodyParts.join(" "),
      severity:
        input.event === "exception_rejected" ||
        input.event === "exception_pending"
          ? "warning"
          : "info",
      linkedEntityType: EVENT_AUDIT_TYPE[input.event],
      linkedEntityId: input.resourceId,
      linkedEntityLabel: "remote check-in",
      linkedPath,
      expiresAt: null,
    })
  } catch {
    // Notification delivery must not roll back geolocation mutations.
  }
}

export async function notifyGeolocationEmployeeLifecycle(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly resourceId: string
  readonly event: GeolocationLifecycleEvent
  readonly detectionOutcome?: string | null
  readonly linkedPath?: string | null
}): Promise<void> {
  const employee = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.employeeId)
    ),
    columns: { linkedUserId: true },
  })

  await notifyGeolocationLifecycle({
    organizationId: input.organizationId,
    resourceId: input.resourceId,
    event: input.event,
    targetUserId: employee?.linkedUserId ?? null,
    detectionOutcome: input.detectionOutcome,
    linkedPath: input.linkedPath,
  })
}

export async function notifyGeolocationExceptionPendingForApprovers(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly managerEmployeeId: string | null
  readonly exceptionId: string
  readonly detectionOutcome: string
}): Promise<void> {
  const managerUserId = await resolveManagerApproverUserId({
    organizationId: input.organizationId,
    managerEmployeeId: input.managerEmployeeId,
  })

  await notifyGeolocationLifecycle({
    organizationId: input.organizationId,
    resourceId: input.exceptionId,
    event: "exception_pending",
    targetUserId: managerUserId,
    detectionOutcome: input.detectionOutcome,
  })
}
