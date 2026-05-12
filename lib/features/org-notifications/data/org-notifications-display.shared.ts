import type { OrgNotificationNotice, OrgNotificationSeverity } from "../types"

export type OrgNotificationDisplayBadge = {
  label: string
  tone: "info" | "warning" | "critical"
}

const ORG_NOTIFICATION_SEVERITY_RANK: Record<OrgNotificationSeverity, number> =
  {
    critical: 3,
    warning: 2,
    info: 1,
  }

export function isOrgNotificationActiveAt(
  now: Date,
  notice: {
    publishedAt: Date
    expiresAt: Date | null
    closedAt: Date | null
  }
): boolean {
  if (notice.publishedAt.getTime() > now.getTime()) return false
  if (notice.closedAt) return false
  if (notice.expiresAt && notice.expiresAt.getTime() <= now.getTime()) {
    return false
  }
  return true
}

export function compareOrgNotificationsForDisplay(
  left: Pick<OrgNotificationNotice, "severity" | "publishedAt">,
  right: Pick<OrgNotificationNotice, "severity" | "publishedAt">
): number {
  const severityDelta =
    ORG_NOTIFICATION_SEVERITY_RANK[right.severity] -
    ORG_NOTIFICATION_SEVERITY_RANK[left.severity]
  if (severityDelta !== 0) return severityDelta

  return (
    new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  )
}

export function describeOrgNotificationBadge(
  notice: Pick<OrgNotificationNotice, "linkedEntityType" | "title">
): OrgNotificationDisplayBadge | null {
  if (notice.linkedEntityType !== "planner_item") {
    return null
  }

  if (
    notice.title.startsWith("Orbit escalation breach:") ||
    notice.title.startsWith("Orbit blocked execution escalating:") ||
    notice.title.startsWith("Orbit blocker verification escalating:")
  ) {
    return { label: "Breach", tone: "critical" }
  }

  if (
    notice.title.startsWith("Orbit escalation overdue:") ||
    notice.title.startsWith("Orbit blocked action overdue:") ||
    notice.title.startsWith("Orbit blocker review overdue:")
  ) {
    return { label: "Overdue", tone: "warning" }
  }

  if (
    notice.title.startsWith("Orbit escalation required:") ||
    notice.title.startsWith("Orbit blocked follow-up:") ||
    notice.title.startsWith("Orbit blocker review required:")
  ) {
    return { label: "Threshold", tone: "info" }
  }

  if (notice.title.includes(" reminder:")) {
    return { label: "Reminder", tone: "info" }
  }

  if (notice.title.startsWith("Orbit reminder delivery failed:")) {
    return { label: "Delivery", tone: "warning" }
  }

  if (notice.title.startsWith("Orbit recurrence processing failed:")) {
    return { label: "Automation", tone: "warning" }
  }

  if (
    notice.title.includes(" assigned:") ||
    notice.title.startsWith("Orbit assignment:")
  ) {
    return { label: "Assignment", tone: "info" }
  }

  return { label: "Orbit", tone: "info" }
}
