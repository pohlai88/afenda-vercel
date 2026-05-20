/**
 * Client-safe door for org-notifications — types and display helpers only.
 * @see ADR-0030 — do not import #features/org-notifications from Client Components.
 */
export type {
  CreateOrgNotificationInput,
  OrgNotificationNotice,
  OrgNotificationSeverity,
  OrgNotificationSource,
  PublishOrgNotificationInput,
} from "./types"

export {
  compareOrgNotificationsForDisplay,
  describeOrgNotificationBadge,
  isOrgNotificationActiveAt,
} from "./data/org-notifications-display.shared"

export type { OrgNotificationDisplayBadge } from "./data/org-notifications-display.shared"

export {
  ORG_NOTIFICATION_PUSH_SW_PATH,
  ORG_NOTIFICATION_REALTIME_EVENT,
  orgNotificationUserChannelName,
} from "./constants"
export { readOrgPushVapidPublicKey } from "./data/org-push-vapid.shared"
