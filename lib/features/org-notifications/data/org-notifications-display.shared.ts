import type { OrgNotificationNotice, OrgNotificationSeverity } from "../types"

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
