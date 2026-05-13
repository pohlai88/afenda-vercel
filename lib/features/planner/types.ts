import type { AuditEvent7W1H } from "#lib/erp/audit-7w1h.shared"
import type { OrgNotificationNotice } from "#features/org-notifications"
import type {
  TemporalNext,
  TemporalNow,
  TemporalPast,
} from "#lib/erp/temporal-spine.shared"
export type { OrbitDashboardSurface } from "#lib/planner-dashboard.shared"
import type { OrbitDashboardSurface } from "#lib/planner-dashboard.shared"

import type {
  PLANNER_DISPLAY_PRIORITIES,
  PLANNER_ITEM_LIFECYCLES,
  PLANNER_OWNERSHIP_ROLES,
  PLANNER_SIGNAL_CLASSES,
  PLANNER_SIGNAL_LIFECYCLES,
  PLANNER_RELATION_TYPES,
  PLANNER_SIGNAL_RESOLUTION_POLICIES,
  PLANNER_VIEW_SORT_MODES,
} from "./constants"
import type { PlannerAutomationAttentionKind } from "./automation/planner-automation-attention.shared"
import type { PlannerViewFilterState } from "./filters/planner-view-filter.shared"

export type PlannerSignalClass = (typeof PLANNER_SIGNAL_CLASSES)[number]
export type PlannerSignalLifecycle = (typeof PLANNER_SIGNAL_LIFECYCLES)[number]
export type PlannerItemLifecycle = (typeof PLANNER_ITEM_LIFECYCLES)[number]
export type PlannerOwnershipRole = (typeof PLANNER_OWNERSHIP_ROLES)[number]
export type PlannerNotificationRole = Extract<
  PlannerOwnershipRole,
  "assignee" | "reviewer" | "escalation_owner"
>
export type PlannerDisplayPriority = (typeof PLANNER_DISPLAY_PRIORITIES)[number]
export type PlannerRelationType = (typeof PLANNER_RELATION_TYPES)[number]
export type PlannerViewSortMode = (typeof PLANNER_VIEW_SORT_MODES)[number]
export type PlannerSignalResolutionPolicy =
  (typeof PLANNER_SIGNAL_RESOLUTION_POLICIES)[number]

export type PlannerPressureDimensions = {
  urgency: number
  impact: number
  severity: number
  confidence: number
  effort: number
  escalationLevel: number
  temporalProximity: number
  ownershipPressure: number
}

export type PlannerOperationalFacts = {
  blockingCount: number
  blockedByCount: number
  activeSignalCount: number
  automationFailureCount: number
  automationKinds: PlannerAutomationAttentionKind[]
  duplicateCount: number
  assigneeCount: number
  reviewerCount: number
  escalationOwnerCount: number
}

export type PlannerScopeInput =
  | { scopeKind: "organization"; organizationId: string }
  | { scopeKind: "personal"; ownerUserId: string }

export type PlannerSurfaceRecordKind = "item" | "signal" | "session" | "link"

export type PlannerSessionStatus = "active" | "paused" | "completed"

export type PlannerEvidenceNodeKind =
  | "erp_link"
  | "relation"
  | "comment"
  | "attachment"
  | "session"
  | "activity"
  | "notice"
  | "item"
  | "signal"

export type PlannerEvidenceGraphNode = {
  id: string
  kind: PlannerEvidenceNodeKind
  label: string
  description: string | null
  occurredAt: Date | null
  href: string | null
}

export type PlannerEvidenceGraph = {
  nodes: PlannerEvidenceGraphNode[]
  summary: {
    linkCount: number
    relationCount: number
    activityCount: number
    attachmentCount: number
    sessionCount: number
    noticeCount: number
  }
}

export type PlannerItemRow = {
  id: string
  organizationId: string | null
  ownerUserId: string | null
  title: string
  description: string | null
  lifecycle: PlannerItemLifecycle
  scheduleStartAt: Date | null
  blockedAt: Date | null
  dueAt: Date | null
  endAt: Date | null
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdByUserId: string | null
  updatedByUserId: string | null
  displayPriority: PlannerDisplayPriority
  pressureScore: number
  pressure: PlannerPressureDimensions
  temporalPast: TemporalPast | null
  temporalNow: TemporalNow | null
  temporalNext: TemporalNext | null
  audit7w1h: AuditEvent7W1H[] | null
  operationalFacts?: PlannerOperationalFacts
  blockedState?: PlannerBlockedState | null
}

export type PlannerSignalRow = {
  id: string
  organizationId: string | null
  ownerUserId: string | null
  title: string
  description: string | null
  signalClass: PlannerSignalClass
  lifecycle: PlannerSignalLifecycle
  createdAt: Date
  updatedAt: Date
  detectedAt: Date
  expiresAt: Date | null
  promotedAt: Date | null
  originatingSystem: string | null
  displayPriority: PlannerDisplayPriority
  pressureScore: number
  pressure: PlannerPressureDimensions
  temporalPast: TemporalPast | null
  temporalNow: TemporalNow | null
  temporalNext: TemporalNext | null
  audit7w1h: AuditEvent7W1H[] | null
}

export type PlannerAssignmentRow = {
  id: string
  role: PlannerOwnershipRole
  subjectUserId: string | null
  subjectLabel: string | null
  createdAt: Date
}

export type PlannerNotificationTarget = {
  userId: string
  role: PlannerNotificationRole
}

export type PlannerBlockedEscalationStage = "threshold" | "urgent" | "critical"

export type PlannerBlockedState = {
  blockedAt: Date
  blockedHours: number
  thresholdHours: number
  stage: PlannerBlockedEscalationStage
}

export type PlannerScheduleRow = {
  id: string
  itemId: string
  scheduledStartAt: Date | null
  scheduledEndAt: Date | null
  snoozedUntil: Date | null
  timeZone: string | null
  createdAt: Date
  updatedAt: Date
}

export type PlannerReminderRow = {
  id: string
  itemId: string
  remindAt: Date
  status: string
  snoozedUntil: Date | null
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PlannerRecurrenceRow = {
  id: string
  itemId: string
  rrule: string
  timeZone: string | null
  nextRunAt: Date | null
  lastRunAt: Date | null
  pausedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PlannerLinkRow = {
  id: string
  itemId: string | null
  signalId: string | null
  module: string
  entityType: string
  entityId: string
  displayLabel: string
  href: string | null
  causalityReason: string | null
  createdAt: Date
  itemTitle: string | null
  signalTitle: string | null
}

export type PlannerCommentRow = {
  id: string
  itemId: string
  authorUserId: string
  body: string
  createdAt: Date
}

export type PlannerAttachmentRow = {
  id: string
  itemId: string
  url: string
  contentSha256: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
}

export type PlannerActivityRow = {
  id: string
  itemId: string | null
  signalId: string | null
  activityType: string
  body: string
  metadata: Record<string, unknown> | null
  authorUserId: string | null
  createdAt: Date
}

export type PlannerRelationRow = {
  id: string
  itemId: string
  relatedItemId: string | null
  relatedSignalId: string | null
  relationType: PlannerRelationType
  createdAt: Date
  relatedItemTitle: string | null
  relatedSignalTitle: string | null
  relatedSignalLifecycle: PlannerSignalLifecycle | null
  relatedSignalClass: PlannerSignalClass | null
}

export type PlannerViewRow = {
  id: string
  organizationId: string | null
  ownerUserId: string | null
  slug: string
  name: string
  surface: OrbitDashboardSurface
  filterState: PlannerViewFilterState
  sortMode: PlannerViewSortMode | null
  createdAt: Date
  updatedAt: Date
}

export type PlannerSessionRow = {
  id: string
  itemId: string | null
  organizationId: string | null
  ownerUserId: string | null
  status: PlannerSessionStatus
  startedAt: Date
  endedAt: Date | null
  durationMinutes: number | null
  summary: string | null
  createdAt: Date
  updatedAt: Date
  itemTitle: string | null
}

export type PlannerSessionDetail = PlannerSessionRow & {
  pausedAt: Date | null
  createdByUserId: string | null
  updatedByUserId: string | null
  item: PlannerItemRow | null
  links: PlannerLinkRow[]
  activity: PlannerActivityRow[]
  evidenceGraph: PlannerEvidenceGraph
}

export type PlannerLinkDetail = PlannerLinkRow & {
  temporalContext: Record<string, unknown> | null
  auditContext: Record<string, unknown> | null
  item: PlannerItemRow | null
  signal: PlannerSignalRow | null
  sessions: PlannerSessionRow[]
  activity: PlannerActivityRow[]
  evidenceGraph: PlannerEvidenceGraph
}

export type PlannerItemDetail = PlannerItemRow & {
  assignments: PlannerAssignmentRow[]
  schedule: PlannerScheduleRow | null
  reminders: PlannerReminderRow[]
  recurrence: PlannerRecurrenceRow | null
  relations: PlannerRelationRow[]
  links: PlannerLinkRow[]
  comments: PlannerCommentRow[]
  attachments: PlannerAttachmentRow[]
  activity: PlannerActivityRow[]
  sessions: PlannerSessionRow[]
  notices: OrgNotificationNotice[]
  noticeHistory: OrgNotificationNotice[]
  evidenceGraph: PlannerEvidenceGraph
}

export type PlannerSignalDetail = PlannerSignalRow & {
  relatedItems: PlannerRelationRow[]
  links: PlannerLinkRow[]
  activity: PlannerActivityRow[]
  evidenceGraph: PlannerEvidenceGraph
}

export type OrbitSummary = {
  queueCount: number
  triageCount: number
  todayCount: number
  timelineCount: number
  signalCount: number
  sessionCount: number
  linkCount: number
}

export type OrbitPageData = {
  surface: OrbitDashboardSurface
  items: PlannerItemRow[]
  signals: PlannerSignalRow[]
  sessions: PlannerSessionRow[]
  links: PlannerLinkRow[]
  summary: OrbitSummary
  savedViews: PlannerViewRow[]
  activeViewSlug: string | null
  activeFilter: PlannerViewFilterState
  activeSortMode: PlannerViewSortMode | null
}
