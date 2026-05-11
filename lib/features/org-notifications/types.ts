export type OrgNotificationSource = "admin" | "system"

export type OrgNotificationSeverity = "info" | "warning" | "critical"

export type OrgNotificationNotice = {
  id: string
  title: string
  body: string
  source: OrgNotificationSource
  severity: OrgNotificationSeverity
  linkedEntityType: string | null
  linkedEntityId: string | null
  linkedEntityLabel: string | null
  linkedPath: string | null
  publishedAt: string
  expiresAt: string | null
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
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  linkedEntityLabel?: string | null
  linkedPath?: string | null
}
