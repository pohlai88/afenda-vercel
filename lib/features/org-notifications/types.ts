export type OrgNotificationSource = "admin" | "system"

export type OrgNotificationSeverity = "info" | "warning" | "critical"

export type OrgNotificationNotice = {
  id: string
  title: string
  body: string
  source: OrgNotificationSource
  severity: OrgNotificationSeverity
  targetUserId: string | null
  linkedEntityType: string | null
  linkedEntityId: string | null
  linkedEntityLabel: string | null
  linkedPath: string | null
  publishedAt: string
  expiresAt: string | null
  closedAt: string | null
  closedByUserId: string | null
  readAt: string | null
  acknowledgedAt: string | null
  isRead: boolean
  isAcknowledged: boolean
}

export type CreateOrgNotificationInput = {
  title: string
  body: string
  severity: OrgNotificationSeverity
  expiresAt?: string | null
  targetUserId?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  linkedEntityLabel?: string | null
  linkedPath?: string | null
}

export type PublishOrgNotificationInput = {
  organizationId: string
  title: string
  body: string
  severity?: OrgNotificationSeverity
  expiresAt?: Date | null
  targetUserId?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  linkedEntityLabel?: string | null
  linkedPath?: string | null
}
