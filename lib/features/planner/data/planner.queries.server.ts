import "server-only"

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import {
  listActiveOrgNotificationsForLinkedEntity,
  listOrgNotificationHistoryForLinkedEntity,
} from "#features/org-notifications/server"
import {
  plannerActivity,
  plannerAssignment,
  plannerAttachment,
  plannerComment,
  plannerItem,
  plannerRelation,
  plannerLink,
  orgNotificationNotice,
  plannerRecurrence,
  plannerReminder,
  plannerSchedule,
  plannerSession,
  plannerSignal,
  plannerView,
} from "#lib/db/schema"
import {
  auditEvent7W1HSchema,
  type AuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"
import {
  safeParseTemporal,
  temporalNextSchema,
  temporalNowSchema,
  temporalPastSchema,
} from "#lib/erp/temporal-spine.shared"

import {
  PLANNER_ACTIVE_ITEM_LIFECYCLES,
  PLANNER_ACTIVE_SIGNAL_LIFECYCLES,
  PLANNER_VIEW_SORT_MODES,
} from "../constants"
import {
  type PlannerAutomationAttentionKind,
  parsePlannerAutomationAttentionKindFromNoticeTitle,
  plannerAutomationAttentionNoticeTitleWhere,
} from "../automation/planner-automation-attention.shared"
import {
  mergePlannerViewFilterStates,
  normalizePlannerViewFilterState,
  type PlannerViewFilterState,
} from "../filters/planner-view-filter.shared"
import {
  sortPlannerItems,
  sortPlannerSignals,
} from "../filters/planner-view-sort.shared"
import {
  buildPlannerItemEvidenceGraph,
  buildPlannerLinkEvidenceGraph,
  buildPlannerSessionEvidenceGraph,
  buildPlannerSignalEvidenceGraph,
} from "../evidence/planner-evidence-graph.shared"
import { derivePlannerBlockedState } from "../policies/planner-escalation-policy.shared"
import { hydratePlannerPressure } from "../pressure/planner-pressure.shared"
import { applyPlannerRelationPressure } from "../ranking/planner-derived-pressure.shared"
import type {
  PlannerBlockedState,
  PlannerDisplayPriority,
  OrbitDashboardSurface,
  OrbitPageData,
  PlannerNotificationRole,
  PlannerNotificationTarget,
  PlannerOperationalFacts,
  OrbitSummary,
  PlannerItemDetail,
  PlannerItemRow,
  PlannerLinkDetail,
  PlannerLinkRow,
  PlannerRelationRow,
  PlannerScopeInput,
  PlannerActivityRow,
  PlannerSessionDetail,
  PlannerSessionRow,
  PlannerSignalDetail,
  PlannerSignalRow,
  PlannerViewRow,
  PlannerViewSortMode,
} from "../types"

export type PlannerPressureRowForNexus = {
  kind: "item" | "signal"
  id: string
  title: string
  description: string | null
  lifecycle: string
  signalClass: string | null
  dueAt: Date | null
  createdAt: Date
  resolvedAt: Date | null
  displayPriority: PlannerItemRow["displayPriority"]
  pressureScore: number
  urgency: number | null
  severity: number | null
  impact: number | null
  escalationLevel: number | null
  operationalFacts: PlannerOperationalFacts | null
  blockedState: PlannerBlockedState | null
}

export type PlannerResolutionRowForNexus = {
  id: string
  title: string
  resolvedAt: Date
  resolutionNote: string | null
  actorName: string
  evidenceCount: number
  lynxAssisted: boolean
}

type PlannerReminderDueRow = {
  reminder: typeof plannerReminder.$inferSelect
  item: typeof plannerItem.$inferSelect
}

type PlannerRecurrenceDueRow = {
  recurrence: typeof plannerRecurrence.$inferSelect
  item: typeof plannerItem.$inferSelect
}

type PlannerAutomationContextRow = {
  itemId: string
  title: string
  description: string | null
  urgency: number
  escalationLevel: number
}

export type PlannerBlockedEscalationRow = {
  itemId: string
  organizationId: string
  title: string
  description: string | null
  blockedAt: Date
  urgency: number
  impact: number
  severity: number
  escalationLevel: number
  operationalFacts: PlannerOperationalFacts
  escalationOwnerUserIds: string[]
  assigneeUserIds: string[]
  reviewerUserIds: string[]
}

function parseAudit7w1h(raw: unknown): AuditEvent7W1H[] | null {
  if (!Array.isArray(raw)) return null
  const events = raw
    .map((entry) => auditEvent7W1HSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data)
  return events.length > 0 ? events : null
}

function parseRecordContext(
  raw: unknown
): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null
}

function normalizePlannerViewSortMode(
  value: string | null | undefined
): PlannerViewSortMode | null {
  return value != null &&
    (PLANNER_VIEW_SORT_MODES as readonly string[]).includes(value)
    ? (value as PlannerViewSortMode)
    : null
}

function itemScopeWhere(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? and(
        eq(plannerItem.organizationId, scope.organizationId),
        sql`${plannerItem.ownerUserId} IS NULL`
      )
    : and(
        eq(plannerItem.ownerUserId, scope.ownerUserId),
        sql`${plannerItem.organizationId} IS NULL`
      )
}

function signalScopeWhere(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? and(
        eq(plannerSignal.organizationId, scope.organizationId),
        sql`${plannerSignal.ownerUserId} IS NULL`
      )
    : and(
        eq(plannerSignal.ownerUserId, scope.ownerUserId),
        sql`${plannerSignal.organizationId} IS NULL`
      )
}

function sessionScopeWhere(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? and(
        eq(plannerSession.organizationId, scope.organizationId),
        sql`${plannerSession.ownerUserId} IS NULL`
      )
    : and(
        eq(plannerSession.ownerUserId, scope.ownerUserId),
        sql`${plannerSession.organizationId} IS NULL`
      )
}

function linkScopeWhere(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? and(
        eq(plannerLink.organizationId, scope.organizationId),
        sql`${plannerLink.ownerUserId} IS NULL`
      )
    : and(
        eq(plannerLink.ownerUserId, scope.ownerUserId),
        sql`${plannerLink.organizationId} IS NULL`
      )
}

function viewScopeWhere(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? and(
        eq(plannerView.organizationId, scope.organizationId),
        sql`${plannerView.ownerUserId} IS NULL`
      )
    : and(
        eq(plannerView.ownerUserId, scope.ownerUserId),
        sql`${plannerView.organizationId} IS NULL`
      )
}

function orgItemWhere(organizationId: string) {
  return and(
    eq(plannerItem.organizationId, organizationId),
    sql`${plannerItem.ownerUserId} IS NULL`
  )
}

function orgSignalWhere(organizationId: string) {
  return and(
    eq(plannerSignal.organizationId, organizationId),
    sql`${plannerSignal.ownerUserId} IS NULL`
  )
}

function hydrateItem(row: typeof plannerItem.$inferSelect): PlannerItemRow {
  const hydrated = hydratePlannerPressure({
    urgency: row.urgency,
    impact: row.impact,
    severity: row.severity,
    confidence: row.confidence,
    effort: row.effort,
    escalationLevel: row.escalationLevel,
    temporalProximity: row.temporalProximity,
    ownershipPressure: row.ownershipPressure,
  })

  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    title: row.title,
    description: row.description,
    lifecycle: row.lifecycle as PlannerItemRow["lifecycle"],
    scheduleStartAt: row.scheduleStartAt,
    blockedAt: row.blockedAt,
    dueAt: row.dueAt,
    endAt: row.endAt,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    displayPriority: hydrated.displayPriority,
    pressureScore: hydrated.pressureScore,
    pressure: hydrated.pressure,
    temporalPast: safeParseTemporal(temporalPastSchema, row.temporalPast),
    temporalNow: safeParseTemporal(temporalNowSchema, row.temporalNow),
    temporalNext: safeParseTemporal(temporalNextSchema, row.temporalNext),
    audit7w1h: parseAudit7w1h(row.audit7w1h),
  }
}

function hydrateSignal(
  row: typeof plannerSignal.$inferSelect
): PlannerSignalRow {
  const hydrated = hydratePlannerPressure({
    urgency: row.urgency,
    impact: row.impact,
    severity: row.severity,
    confidence: row.confidence,
    effort: row.effort,
    escalationLevel: row.escalationLevel,
    temporalProximity: row.temporalProximity,
    ownershipPressure: row.ownershipPressure,
  })

  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    title: row.title,
    description: row.description,
    signalClass: row.signalClass as PlannerSignalRow["signalClass"],
    lifecycle: row.lifecycle as PlannerSignalRow["lifecycle"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    detectedAt: row.detectedAt,
    expiresAt: row.expiresAt,
    promotedAt: row.promotedAt,
    originatingSystem: row.originatingSystem,
    displayPriority: hydrated.displayPriority,
    pressureScore: hydrated.pressureScore,
    pressure: hydrated.pressure,
    temporalPast: safeParseTemporal(temporalPastSchema, row.temporalPast),
    temporalNow: safeParseTemporal(temporalNowSchema, row.temporalNow),
    temporalNext: safeParseTemporal(temporalNextSchema, row.temporalNext),
    audit7w1h: parseAudit7w1h(row.audit7w1h),
  }
}

function hydrateLinkRow({
  link,
  itemTitle,
  signalTitle,
}: {
  link: typeof plannerLink.$inferSelect
  itemTitle: string | null
  signalTitle: string | null
}): PlannerLinkRow {
  return {
    id: link.id,
    itemId: link.itemId,
    signalId: link.signalId,
    module: link.module,
    entityType: link.entityType,
    entityId: link.entityId,
    displayLabel: link.displayLabel,
    href: link.href,
    causalityReason: link.causalityReason,
    createdAt: link.createdAt,
    itemTitle,
    signalTitle,
  }
}

function hydrateRelationRow(input: {
  relation: typeof plannerRelation.$inferSelect
  relatedItemTitle: string | null
  relatedSignalTitle: string | null
  relatedSignalLifecycle: string | null
  relatedSignalClass: string | null
}): PlannerRelationRow {
  return {
    id: input.relation.id,
    itemId: input.relation.itemId,
    relatedItemId: input.relation.relatedItemId,
    relatedSignalId: input.relation.relatedSignalId,
    relationType: input.relation
      .relationType as PlannerRelationRow["relationType"],
    createdAt: input.relation.createdAt,
    relatedItemTitle: input.relatedItemTitle,
    relatedSignalTitle: input.relatedSignalTitle,
    relatedSignalLifecycle:
      (input.relatedSignalLifecycle as PlannerRelationRow["relatedSignalLifecycle"]) ??
      null,
    relatedSignalClass:
      (input.relatedSignalClass as PlannerRelationRow["relatedSignalClass"]) ??
      null,
  }
}

function hydrateActivityRow(
  row: typeof plannerActivity.$inferSelect
): PlannerActivityRow {
  return {
    id: row.id,
    itemId: row.itemId,
    signalId: row.signalId,
    activityType: row.activityType,
    body: row.body,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt,
  }
}

function hydrateSessionRow(input: {
  session: typeof plannerSession.$inferSelect
  itemTitle: string | null
}): PlannerSessionRow {
  const { session, itemTitle } = input

  return {
    id: session.id,
    itemId: session.itemId,
    organizationId: session.organizationId,
    ownerUserId: session.ownerUserId,
    status: session.status as PlannerSessionRow["status"],
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: session.durationMinutes,
    summary: session.summary,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    itemTitle: itemTitle ?? null,
  }
}

async function getScopedPlannerItemRow(
  scope: PlannerScopeInput,
  itemId: string | null | undefined
): Promise<PlannerItemRow | null> {
  if (!itemId) return null

  const [itemRow] = await db
    .select()
    .from(plannerItem)
    .where(and(eq(plannerItem.id, itemId), itemScopeWhere(scope)))
    .limit(1)

  if (!itemRow) return null

  const [hydratedItem] = await applyOperationalFactsToItems(
    [hydrateItem(itemRow)],
    scope
  )

  return hydratedItem ?? null
}

async function getScopedPlannerSignalRow(
  scope: PlannerScopeInput,
  signalId: string | null | undefined
): Promise<PlannerSignalRow | null> {
  if (!signalId) return null

  const [signalRow] = await db
    .select()
    .from(plannerSignal)
    .where(and(eq(plannerSignal.id, signalId), signalScopeWhere(scope)))
    .limit(1)

  return signalRow ? hydrateSignal(signalRow) : null
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function hasFilterValues<T>(
  values: readonly T[] | null | undefined
): values is readonly T[] {
  return Array.isArray(values) && values.length > 0
}

function matchesDisplayPriority(
  priority: PlannerDisplayPriority,
  filter: PlannerViewFilterState
) {
  return !hasFilterValues(filter.displayPriority)
    ? true
    : filter.displayPriority.includes(priority)
}

function plannerAutomationAttentionNoticeWhere(now: Date) {
  return and(
    eq(orgNotificationNotice.linkedEntityType, "planner_item"),
    lte(orgNotificationNotice.publishedAt, now),
    isNull(orgNotificationNotice.closedAt),
    or(
      isNull(orgNotificationNotice.expiresAt),
      gt(orgNotificationNotice.expiresAt, now)
    ),
    plannerAutomationAttentionNoticeTitleWhere()
  )
}

async function listPlannerOperationalFactsMap(
  itemIds: readonly string[],
  scope?: PlannerScopeInput
): Promise<Map<string, PlannerOperationalFacts>> {
  if (itemIds.length === 0) {
    return new Map()
  }

  const now = new Date()
  const [relations, assignments, automationFailures] = await Promise.all([
    db
      .select({
        itemId: plannerRelation.itemId,
        relationType: plannerRelation.relationType,
        relatedItemLifecycle: plannerItem.lifecycle,
        relatedSignalLifecycle: plannerSignal.lifecycle,
      })
      .from(plannerRelation)
      .leftJoin(plannerItem, eq(plannerRelation.relatedItemId, plannerItem.id))
      .leftJoin(
        plannerSignal,
        eq(plannerRelation.relatedSignalId, plannerSignal.id)
      )
      .where(inArray(plannerRelation.itemId, itemIds)),
    db
      .select({
        itemId: plannerAssignment.itemId,
        role: plannerAssignment.role,
        subjectUserId: plannerAssignment.subjectUserId,
      })
      .from(plannerAssignment)
      .where(inArray(plannerAssignment.itemId, itemIds)),
    scope?.scopeKind === "organization"
      ? db
          .select({
            itemId: orgNotificationNotice.linkedEntityId,
            title: orgNotificationNotice.title,
          })
          .from(orgNotificationNotice)
          .where(
            and(
              eq(orgNotificationNotice.organizationId, scope.organizationId),
              inArray(
                orgNotificationNotice.linkedEntityId,
                itemIds as string[]
              ),
              plannerAutomationAttentionNoticeWhere(now)
            )
          )
      : Promise.resolve([]),
  ])

  const factsByItem = new Map<string, PlannerOperationalFacts>()

  function getFacts(itemId: string): PlannerOperationalFacts {
    const existing = factsByItem.get(itemId)
    if (existing) return existing

    const created: PlannerOperationalFacts = {
      blockingCount: 0,
      blockedByCount: 0,
      activeSignalCount: 0,
      automationFailureCount: 0,
      automationKinds: [],
      duplicateCount: 0,
      assigneeCount: 0,
      reviewerCount: 0,
      escalationOwnerCount: 0,
    }
    factsByItem.set(itemId, created)
    return created
  }

  for (const relation of relations) {
    const facts = getFacts(relation.itemId)

    if (
      relation.relatedItemLifecycle &&
      (PLANNER_ACTIVE_ITEM_LIFECYCLES as readonly string[]).includes(
        relation.relatedItemLifecycle
      )
    ) {
      if (relation.relationType === "blocks") {
        facts.blockingCount += 1
      } else if (relation.relationType === "blocked_by") {
        facts.blockedByCount += 1
      } else if (relation.relationType === "duplicate") {
        facts.duplicateCount += 1
      }
    }

    if (
      relation.relatedSignalLifecycle &&
      (PLANNER_ACTIVE_SIGNAL_LIFECYCLES as readonly string[]).includes(
        relation.relatedSignalLifecycle
      )
    ) {
      facts.activeSignalCount += 1
    }
  }

  for (const assignment of assignments) {
    if (!assignment.subjectUserId) continue
    const facts = getFacts(assignment.itemId)

    if (assignment.role === "assignee") {
      facts.assigneeCount += 1
    } else if (assignment.role === "reviewer") {
      facts.reviewerCount += 1
    } else if (assignment.role === "escalation_owner") {
      facts.escalationOwnerCount += 1
    }
  }

  const automationAttentionKeys = new Set<string>()
  const automationKindsByItem = new Map<
    string,
    Set<PlannerAutomationAttentionKind>
  >()

  for (const notice of automationFailures) {
    if (!notice.itemId) continue
    const noticeKey = `${notice.itemId}:${notice.title}`
    if (automationAttentionKeys.has(noticeKey)) continue
    automationAttentionKeys.add(noticeKey)
    const facts = getFacts(notice.itemId)
    facts.automationFailureCount += 1
    const kind = parsePlannerAutomationAttentionKindFromNoticeTitle(
      notice.title
    )
    if (kind) {
      const kinds = automationKindsByItem.get(notice.itemId) ?? new Set()
      kinds.add(kind)
      automationKindsByItem.set(notice.itemId, kinds)
    }
  }

  for (const [itemId, kinds] of automationKindsByItem.entries()) {
    const facts = getFacts(itemId)
    facts.automationKinds = [...kinds]
  }

  return factsByItem
}

function matchesAutomationAttention(
  row: PlannerItemRow,
  filter: PlannerViewFilterState
) {
  const hasAttentionState = hasFilterValues(filter.automationState)
  const hasAttentionKind = hasFilterValues(filter.automationKind)
  const failureCount = row.operationalFacts?.automationFailureCount ?? 0
  const kinds = row.operationalFacts?.automationKinds ?? []

  if (!hasAttentionState && !hasAttentionKind) return true
  if (failureCount === 0) return false
  if (!hasAttentionKind) return true

  return filter.automationKind!.some((kind) => kinds.includes(kind))
}

async function applyOperationalFactsToItems(
  rows: readonly PlannerItemRow[],
  scope?: PlannerScopeInput
): Promise<PlannerItemRow[]> {
  if (rows.length === 0) {
    return []
  }

  const itemIds = rows.map((row) => row.id)
  const factsByItem = await listPlannerOperationalFactsMap(itemIds, scope)

  return rows.map((row) => ({
    ...(function () {
      const operationalFacts = factsByItem.get(row.id)
      const relationAwareRow = applyPlannerRelationPressure(
        row,
        operationalFacts
      )
      return {
        ...relationAwareRow,
        operationalFacts,
        blockedState: derivePlannerBlockedState({
          lifecycle: relationAwareRow.lifecycle,
          blockedAt: relationAwareRow.blockedAt,
          urgency: relationAwareRow.pressure.urgency,
          impact: relationAwareRow.pressure.impact,
          severity: relationAwareRow.pressure.severity,
          escalationLevel: relationAwareRow.pressure.escalationLevel,
          operationalFacts,
        }),
      }
    })(),
  }))
}

function matchesSignalFilters(
  row: PlannerSignalRow,
  filter: PlannerViewFilterState
) {
  if (hasFilterValues(filter.displayPriority)) {
    if (!filter.displayPriority.includes(row.displayPriority)) {
      return false
    }
  }

  if (hasFilterValues(filter.ownerUserIds)) {
    if (!row.ownerUserId || !filter.ownerUserIds.includes(row.ownerUserId)) {
      return false
    }
  }

  return true
}

async function resolveScopedLinkedItemIds(
  scope: PlannerScopeInput,
  linkedModules: readonly string[] | undefined
): Promise<string[] | null> {
  if (!hasFilterValues(linkedModules)) return null

  const rows = await db
    .select({ itemId: plannerLink.itemId })
    .from(plannerLink)
    .where(
      and(
        linkScopeWhere(scope),
        isNotNull(plannerLink.itemId),
        inArray(plannerLink.module, [...linkedModules])
      )
    )

  return rows.map((row) => row.itemId).filter(Boolean) as string[]
}

async function resolveScopedLinkedSignalIds(
  scope: PlannerScopeInput,
  linkedModules: readonly string[] | undefined
): Promise<string[] | null> {
  if (!hasFilterValues(linkedModules)) return null

  const rows = await db
    .select({ signalId: plannerLink.signalId })
    .from(plannerLink)
    .where(
      and(
        linkScopeWhere(scope),
        isNotNull(plannerLink.signalId),
        inArray(plannerLink.module, [...linkedModules])
      )
    )

  return rows.map((row) => row.signalId).filter(Boolean) as string[]
}

async function resolveScopedAssignedItemIds(
  scope: PlannerScopeInput,
  input: {
    ownerUserIds: readonly string[] | undefined
    assignmentRoles:
      | readonly PlannerNotificationRole[]
      | readonly string[]
      | undefined
  }
): Promise<string[] | null> {
  const hasOwnerFilter = hasFilterValues(input.ownerUserIds)
  const hasRoleFilter = hasFilterValues(input.assignmentRoles)
  const ownerUserIds = hasOwnerFilter
    ? Array.from(input.ownerUserIds as readonly string[])
    : null
  const assignmentRoles = hasRoleFilter
    ? Array.from(input.assignmentRoles as readonly string[])
    : null

  if (!hasOwnerFilter && !hasRoleFilter) return null

  if (scope.scopeKind === "personal" && ownerUserIds && !assignmentRoles) {
    return ownerUserIds.includes(scope.ownerUserId) ? null : []
  }

  const rows = await db
    .select({ itemId: plannerAssignment.itemId })
    .from(plannerAssignment)
    .innerJoin(plannerItem, eq(plannerAssignment.itemId, plannerItem.id))
    .where(
      and(
        itemScopeWhere(scope),
        ownerUserIds
          ? inArray(plannerAssignment.subjectUserId, ownerUserIds)
          : undefined,
        assignmentRoles
          ? inArray(plannerAssignment.role, assignmentRoles)
          : undefined
      )
    )

  return rows.map((row) => row.itemId)
}

export async function countPlannerActiveForOrg(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(plannerItem)
    .where(
      and(
        orgItemWhere(organizationId),
        inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES])
      )
    )

  return Number(rows[0]?.count ?? 0)
}

export async function countPlannerForToday(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(plannerItem)
    .where(
      and(
        orgItemWhere(organizationId),
        inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES]),
        or(
          and(
            isNotNull(plannerItem.dueAt),
            lte(plannerItem.dueAt, endOfToday())
          ),
          and(
            isNotNull(plannerItem.scheduleStartAt),
            lte(plannerItem.scheduleStartAt, endOfToday())
          )
        )
      )
    )

  return Number(rows[0]?.count ?? 0)
}

export async function countPlannerAutomationAttentionForOrg(
  organizationId: string,
  kind?: PlannerAutomationAttentionKind
): Promise<number> {
  const now = new Date()
  const rows = await db
    .select({
      count: sql<number>`count(distinct ${orgNotificationNotice.linkedEntityId})`,
    })
    .from(orgNotificationNotice)
    .where(
      and(
        eq(orgNotificationNotice.organizationId, organizationId),
        plannerAutomationAttentionNoticeWhere(now),
        plannerAutomationAttentionNoticeTitleWhere(kind)
      )
    )

  return Number(rows[0]?.count ?? 0)
}

export async function listPlannerHighPressureForNexus(
  organizationId: string,
  limit = 5
): Promise<PlannerPressureRowForNexus[]> {
  const [itemRows, signalRows] = await Promise.all([
    db
      .select()
      .from(plannerItem)
      .where(
        and(
          orgItemWhere(organizationId),
          inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES])
        )
      )
      .orderBy(
        desc(plannerItem.urgency),
        desc(plannerItem.severity),
        desc(plannerItem.impact),
        asc(plannerItem.dueAt),
        desc(plannerItem.createdAt)
      )
      .limit(limit * 2),
    db
      .select()
      .from(plannerSignal)
      .where(
        and(
          orgSignalWhere(organizationId),
          inArray(plannerSignal.lifecycle, [
            ...PLANNER_ACTIVE_SIGNAL_LIFECYCLES,
          ])
        )
      )
      .orderBy(
        desc(plannerSignal.urgency),
        desc(plannerSignal.severity),
        desc(plannerSignal.impact),
        desc(plannerSignal.createdAt)
      )
      .limit(limit * 2),
  ])

  const enrichedItems = await applyOperationalFactsToItems(
    itemRows.map(hydrateItem),
    { scopeKind: "organization", organizationId }
  )

  const merged = [
    ...enrichedItems.map((row) => {
      return {
        kind: "item" as const,
        id: row.id,
        title: row.title,
        description: row.description,
        lifecycle: row.lifecycle,
        signalClass: null,
        dueAt: row.dueAt ?? row.scheduleStartAt,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
        displayPriority: row.displayPriority,
        pressureScore: row.pressureScore,
        urgency: row.pressure.urgency,
        severity: row.pressure.severity,
        impact: row.pressure.impact,
        escalationLevel: row.pressure.escalationLevel,
        operationalFacts: row.operationalFacts ?? null,
        blockedState: row.blockedState ?? null,
      }
    }),
    ...signalRows.map((row) => {
      const hydrated = hydrateSignal(row)
      return {
        kind: "signal" as const,
        id: row.id,
        title: row.title,
        description: row.description,
        lifecycle: row.lifecycle,
        signalClass: row.signalClass,
        dueAt: row.expiresAt,
        createdAt: row.createdAt,
        resolvedAt: null,
        displayPriority: hydrated.displayPriority,
        pressureScore: hydrated.pressureScore,
        urgency: row.urgency,
        severity: row.severity,
        impact: row.impact,
        escalationLevel: row.escalationLevel,
        operationalFacts: null,
        blockedState: null,
      }
    }),
  ]

  return merged
    .sort((a, b) => {
      if (b.pressureScore !== a.pressureScore) {
        return b.pressureScore - a.pressureScore
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    .slice(0, limit)
}

export async function listPlannerRecentResolutionsForNexus(
  organizationId: string,
  limit = 3
): Promise<PlannerResolutionRowForNexus[]> {
  const rows = await db
    .select()
    .from(plannerItem)
    .where(
      and(
        orgItemWhere(organizationId),
        eq(plannerItem.lifecycle, "resolved"),
        isNotNull(plannerItem.resolvedAt)
      )
    )
    .orderBy(desc(plannerItem.resolvedAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    resolvedAt: row.resolvedAt ?? row.updatedAt,
    resolutionNote: row.description,
    actorName: row.updatedByUserId ?? row.createdByUserId ?? "Orbit operator",
    evidenceCount: Array.isArray(row.audit7w1h) ? row.audit7w1h.length : 0,
    lynxAssisted: false,
  }))
}

export async function listPlannerItemsForQueue(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerItemRow[]> {
  const [linkedItemIds, assignedItemIds] = await Promise.all([
    resolveScopedLinkedItemIds(scope, filter.linkedModule),
    resolveScopedAssignedItemIds(scope, {
      ownerUserIds: filter.ownerUserIds,
      assignmentRoles: filter.assignmentRole,
    }),
  ])

  if (linkedItemIds && linkedItemIds.length === 0) return []
  if (assignedItemIds && assignedItemIds.length === 0) return []

  const rows = await db
    .select()
    .from(plannerItem)
    .where(
      and(
        itemScopeWhere(scope),
        hasFilterValues(filter.lifecycle)
          ? inArray(plannerItem.lifecycle, [...filter.lifecycle])
          : inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES]),
        filter.query
          ? or(
              ilike(plannerItem.title, `%${filter.query}%`),
              ilike(plannerItem.description, `%${filter.query}%`)
            )
          : undefined,
        linkedItemIds ? inArray(plannerItem.id, linkedItemIds) : undefined,
        assignedItemIds ? inArray(plannerItem.id, assignedItemIds) : undefined
      )
    )
    .orderBy(
      desc(plannerItem.urgency),
      desc(plannerItem.severity),
      desc(plannerItem.impact),
      asc(plannerItem.dueAt),
      desc(plannerItem.createdAt)
    )

  const hydrated = await applyOperationalFactsToItems(
    rows.map(hydrateItem),
    scope
  )
  return sortPlannerItems(
    hydrated.filter(
      (row) =>
        matchesDisplayPriority(row.displayPriority, filter) &&
        matchesAutomationAttention(row, filter)
    ),
    sortMode
  )
}

export async function listPlannerItemsForTriage(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerItemRow[]> {
  const rows = await listPlannerItemsForQueue(scope, filter, sortMode)

  return rows.filter((row) => {
    const facts = row.operationalFacts
    return (
      (facts?.automationFailureCount ?? 0) > 0 ||
      (facts?.activeSignalCount ?? 0) > 0 ||
      row.blockedState != null
    )
  })
}

export async function listPlannerItemsForToday(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerItemRow[]> {
  const [linkedItemIds, assignedItemIds] = await Promise.all([
    resolveScopedLinkedItemIds(scope, filter.linkedModule),
    resolveScopedAssignedItemIds(scope, {
      ownerUserIds: filter.ownerUserIds,
      assignmentRoles: filter.assignmentRole,
    }),
  ])

  if (linkedItemIds && linkedItemIds.length === 0) return []
  if (assignedItemIds && assignedItemIds.length === 0) return []

  const rows = await db
    .select()
    .from(plannerItem)
    .where(
      and(
        itemScopeWhere(scope),
        hasFilterValues(filter.lifecycle)
          ? inArray(plannerItem.lifecycle, [...filter.lifecycle])
          : inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES]),
        filter.query
          ? or(
              ilike(plannerItem.title, `%${filter.query}%`),
              ilike(plannerItem.description, `%${filter.query}%`)
            )
          : undefined,
        linkedItemIds ? inArray(plannerItem.id, linkedItemIds) : undefined,
        assignedItemIds ? inArray(plannerItem.id, assignedItemIds) : undefined,
        or(
          and(
            isNotNull(plannerItem.dueAt),
            lte(plannerItem.dueAt, endOfToday())
          ),
          and(
            isNotNull(plannerItem.scheduleStartAt),
            lte(plannerItem.scheduleStartAt, endOfToday())
          )
        )
      )
    )
    .orderBy(asc(plannerItem.dueAt), asc(plannerItem.scheduleStartAt))

  const hydrated = await applyOperationalFactsToItems(
    rows.map(hydrateItem),
    scope
  )
  return sortPlannerItems(
    hydrated.filter(
      (row) =>
        matchesDisplayPriority(row.displayPriority, filter) &&
        matchesAutomationAttention(row, filter)
    ),
    sortMode
  )
}

export async function listPlannerItemsForTimeline(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerItemRow[]> {
  const [linkedItemIds, assignedItemIds] = await Promise.all([
    resolveScopedLinkedItemIds(scope, filter.linkedModule),
    resolveScopedAssignedItemIds(scope, {
      ownerUserIds: filter.ownerUserIds,
      assignmentRoles: filter.assignmentRole,
    }),
  ])

  if (linkedItemIds && linkedItemIds.length === 0) return []
  if (assignedItemIds && assignedItemIds.length === 0) return []

  const rows = await db
    .select()
    .from(plannerItem)
    .where(
      and(
        itemScopeWhere(scope),
        hasFilterValues(filter.lifecycle)
          ? inArray(plannerItem.lifecycle, [...filter.lifecycle])
          : inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES]),
        filter.query
          ? or(
              ilike(plannerItem.title, `%${filter.query}%`),
              ilike(plannerItem.description, `%${filter.query}%`)
            )
          : undefined,
        linkedItemIds ? inArray(plannerItem.id, linkedItemIds) : undefined,
        assignedItemIds ? inArray(plannerItem.id, assignedItemIds) : undefined,
        or(isNotNull(plannerItem.dueAt), isNotNull(plannerItem.scheduleStartAt))
      )
    )
    .orderBy(asc(plannerItem.scheduleStartAt), asc(plannerItem.dueAt))

  const hydrated = await applyOperationalFactsToItems(
    rows.map(hydrateItem),
    scope
  )
  return sortPlannerItems(
    hydrated.filter(
      (row) =>
        matchesDisplayPriority(row.displayPriority, filter) &&
        matchesAutomationAttention(row, filter)
    ),
    sortMode
  )
}

export async function listPlannerSignals(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerSignalRow[]> {
  const linkedSignalIds = await resolveScopedLinkedSignalIds(
    scope,
    filter.linkedModule
  )
  if (linkedSignalIds && linkedSignalIds.length === 0) return []

  const rows = await db
    .select()
    .from(plannerSignal)
    .where(
      and(
        signalScopeWhere(scope),
        hasFilterValues(filter.lifecycle)
          ? inArray(plannerSignal.lifecycle, [...filter.lifecycle])
          : inArray(plannerSignal.lifecycle, [
              ...PLANNER_ACTIVE_SIGNAL_LIFECYCLES,
            ]),
        filter.query
          ? or(
              ilike(plannerSignal.title, `%${filter.query}%`),
              ilike(plannerSignal.description, `%${filter.query}%`)
            )
          : undefined,
        hasFilterValues(filter.signalClass)
          ? inArray(plannerSignal.signalClass, [...filter.signalClass])
          : undefined,
        linkedSignalIds ? inArray(plannerSignal.id, linkedSignalIds) : undefined
      )
    )
    .orderBy(
      desc(plannerSignal.urgency),
      desc(plannerSignal.severity),
      desc(plannerSignal.createdAt)
    )

  return sortPlannerSignals(
    rows.map(hydrateSignal).filter((row) => matchesSignalFilters(row, filter)),
    sortMode
  )
}

export async function listPlannerSignalsForTriage(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerSignalRow[]> {
  return listPlannerSignals(
    scope,
    mergePlannerViewFilterStates(
      {
        lifecycle: ["detected", "correlated", "deferred"],
      },
      filter
    ),
    sortMode
  )
}

export async function listPlannerSessions(
  scope: PlannerScopeInput
): Promise<PlannerSessionRow[]> {
  const rows = await db
    .select({
      session: plannerSession,
      itemTitle: plannerItem.title,
    })
    .from(plannerSession)
    .leftJoin(plannerItem, eq(plannerSession.itemId, plannerItem.id))
    .where(sessionScopeWhere(scope))
    .orderBy(desc(plannerSession.startedAt))

  return rows.map(hydrateSessionRow)
}

export async function listPlannerLinks(
  scope: PlannerScopeInput
): Promise<PlannerLinkRow[]> {
  const rows = await db
    .select({
      link: plannerLink,
      itemTitle: plannerItem.title,
      signalTitle: plannerSignal.title,
    })
    .from(plannerLink)
    .leftJoin(plannerItem, eq(plannerLink.itemId, plannerItem.id))
    .leftJoin(plannerSignal, eq(plannerLink.signalId, plannerSignal.id))
    .where(linkScopeWhere(scope))
    .orderBy(desc(plannerLink.createdAt))

  return rows.map(hydrateLinkRow)
}

export async function listPlannerViews(
  scope: PlannerScopeInput,
  surface: PlannerViewRow["surface"]
): Promise<PlannerViewRow[]> {
  const rows = await db
    .select()
    .from(plannerView)
    .where(and(viewScopeWhere(scope), eq(plannerView.surface, surface)))
    .orderBy(asc(plannerView.name), asc(plannerView.createdAt))

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    slug: row.slug,
    name: row.name,
    surface: row.surface as PlannerViewRow["surface"],
    filterState: normalizePlannerViewFilterState(row.filterState),
    sortMode: normalizePlannerViewSortMode(row.sortMode),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

export async function listDuePlannerRemindersForOrganization(
  organizationId: string,
  dueAt: Date,
  reminderId?: string
): Promise<PlannerReminderDueRow[]> {
  return db
    .select({
      reminder: plannerReminder,
      item: plannerItem,
    })
    .from(plannerReminder)
    .innerJoin(plannerItem, eq(plannerReminder.itemId, plannerItem.id))
    .where(
      and(
        orgItemWhere(organizationId),
        eq(plannerReminder.status, "pending"),
        lte(plannerReminder.remindAt, dueAt),
        or(
          isNull(plannerReminder.snoozedUntil),
          lte(plannerReminder.snoozedUntil, dueAt)
        ),
        reminderId ? eq(plannerReminder.id, reminderId) : undefined
      )
    )
    .orderBy(asc(plannerReminder.remindAt))
}

export async function listPlannerNotificationRecipientsForItem(input: {
  scope: PlannerScopeInput
  itemId: string
  roles?: readonly PlannerNotificationRole[]
}): Promise<string[]> {
  const targets = await listPlannerNotificationTargetsForItem(input)

  return [...new Set(targets.map((target) => target.userId))]
}

export async function listPlannerNotificationTargetsForItem(input: {
  scope: PlannerScopeInput
  itemId: string
  roles?: readonly PlannerNotificationRole[]
}): Promise<PlannerNotificationTarget[]> {
  const roles = input.roles ?? ["assignee", "reviewer"]
  const rows = await db
    .select({
      subjectUserId: plannerAssignment.subjectUserId,
      role: plannerAssignment.role,
    })
    .from(plannerAssignment)
    .innerJoin(plannerItem, eq(plannerAssignment.itemId, plannerItem.id))
    .where(
      and(
        isNotNull(plannerAssignment.subjectUserId),
        eq(plannerAssignment.itemId, input.itemId),
        inArray(plannerAssignment.role, [...roles]),
        input.scope.scopeKind === "organization"
          ? eq(plannerItem.organizationId, input.scope.organizationId)
          : eq(plannerItem.ownerUserId, input.scope.ownerUserId)
      )
    )

  const targets: PlannerNotificationTarget[] = rows.flatMap((row) =>
    row.subjectUserId &&
    (row.role === "assignee" ||
      row.role === "reviewer" ||
      row.role === "escalation_owner")
      ? [
          {
            userId: row.subjectUserId,
            role: row.role as PlannerNotificationRole,
          },
        ]
      : []
  )

  return [
    ...new Map(
      targets.map((target) => [`${target.role}:${target.userId}`, target])
    ).values(),
  ]
}

export async function getPlannerItemNotificationContext(input: {
  scope: PlannerScopeInput
  itemId: string
}): Promise<{
  id: string
  title: string
  description: string | null
  displayPriority: PlannerDisplayPriority
} | null> {
  const [row] = await db
    .select()
    .from(plannerItem)
    .where(and(eq(plannerItem.id, input.itemId), itemScopeWhere(input.scope)))
    .limit(1)

  if (!row) return null

  const hydrated = hydrateItem(row)
  return {
    id: hydrated.id,
    title: hydrated.title,
    description: hydrated.description,
    displayPriority: hydrated.displayPriority,
  }
}

export async function getPlannerReminderAutomationContext(input: {
  organizationId: string
  reminderId: string
}): Promise<PlannerAutomationContextRow | null> {
  const [row] = await db
    .select({
      itemId: plannerItem.id,
      title: plannerItem.title,
      description: plannerItem.description,
      urgency: plannerItem.urgency,
      escalationLevel: plannerItem.escalationLevel,
    })
    .from(plannerReminder)
    .innerJoin(plannerItem, eq(plannerReminder.itemId, plannerItem.id))
    .where(
      and(
        orgItemWhere(input.organizationId),
        eq(plannerReminder.id, input.reminderId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function getPlannerRecurrenceAutomationContext(input: {
  organizationId: string
  recurrenceId: string
}): Promise<PlannerAutomationContextRow | null> {
  const [row] = await db
    .select({
      itemId: plannerItem.id,
      title: plannerItem.title,
      description: plannerItem.description,
      urgency: plannerItem.urgency,
      escalationLevel: plannerItem.escalationLevel,
    })
    .from(plannerRecurrence)
    .innerJoin(plannerItem, eq(plannerRecurrence.itemId, plannerItem.id))
    .where(
      and(
        orgItemWhere(input.organizationId),
        eq(plannerRecurrence.id, input.recurrenceId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function listPlannerBlockedItemsForEscalation(
  limit = 100
): Promise<PlannerBlockedEscalationRow[]> {
  const rows = await db
    .select({
      itemId: plannerItem.id,
      organizationId: plannerItem.organizationId,
      title: plannerItem.title,
      description: plannerItem.description,
      blockedAt: plannerItem.blockedAt,
      urgency: plannerItem.urgency,
      impact: plannerItem.impact,
      severity: plannerItem.severity,
      escalationLevel: plannerItem.escalationLevel,
      role: plannerAssignment.role,
      subjectUserId: plannerAssignment.subjectUserId,
    })
    .from(plannerItem)
    .leftJoin(plannerAssignment, eq(plannerAssignment.itemId, plannerItem.id))
    .where(
      and(
        isNotNull(plannerItem.organizationId),
        eq(plannerItem.lifecycle, "blocked"),
        isNotNull(plannerItem.blockedAt)
      )
    )
    .orderBy(asc(plannerItem.blockedAt))
    .limit(limit * 4)

  const grouped = new Map<
    string,
    Omit<PlannerBlockedEscalationRow, "operationalFacts">
  >()

  for (const row of rows) {
    if (!row.organizationId || !row.blockedAt) continue

    const current = grouped.get(row.itemId) ?? {
      itemId: row.itemId,
      organizationId: row.organizationId,
      title: row.title,
      description: row.description,
      blockedAt: row.blockedAt,
      urgency: row.urgency,
      impact: row.impact,
      severity: row.severity,
      escalationLevel: row.escalationLevel,
      escalationOwnerUserIds: [],
      assigneeUserIds: [],
      reviewerUserIds: [],
    }

    if (row.subjectUserId && row.role === "escalation_owner") {
      current.escalationOwnerUserIds.push(row.subjectUserId)
    }
    if (row.subjectUserId && row.role === "assignee") {
      current.assigneeUserIds.push(row.subjectUserId)
    }
    if (row.subjectUserId && row.role === "reviewer") {
      current.reviewerUserIds.push(row.subjectUserId)
    }

    grouped.set(row.itemId, current)
  }

  const baseRows = [...grouped.values()].map((row) => ({
    ...row,
    escalationOwnerUserIds: [...new Set(row.escalationOwnerUserIds)],
    assigneeUserIds: [...new Set(row.assigneeUserIds)],
    reviewerUserIds: [...new Set(row.reviewerUserIds)],
  }))
  const factsByItem = await listPlannerOperationalFactsMap(
    baseRows.map((row) => row.itemId)
  )

  return baseRows
    .map((row) => ({
      ...row,
      operationalFacts: factsByItem.get(row.itemId) ?? {
        blockingCount: 0,
        blockedByCount: 0,
        activeSignalCount: 0,
        automationFailureCount: 0,
        automationKinds: [],
        duplicateCount: 0,
        assigneeCount: row.assigneeUserIds.length,
        reviewerCount: row.reviewerUserIds.length,
        escalationOwnerCount: row.escalationOwnerUserIds.length,
      },
    }))
    .slice(0, limit)
}

export async function countPlannerBlockedForOrg(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(plannerItem)
    .where(
      and(orgItemWhere(organizationId), eq(plannerItem.lifecycle, "blocked"))
    )

  return Number(rows[0]?.count ?? 0)
}

export async function countPlannerEscalationOwnedBlockedForOrg(
  organizationId: string
): Promise<number> {
  return countPlannerBlockedByAssignmentRoleForOrg(
    organizationId,
    "escalation_owner"
  )
}

export async function countPlannerReviewerOwnedBlockedForOrg(
  organizationId: string
): Promise<number> {
  return countPlannerBlockedByAssignmentRoleForOrg(organizationId, "reviewer")
}

export async function countPlannerAssigneeOwnedBlockedForOrg(
  organizationId: string
): Promise<number> {
  return countPlannerBlockedByAssignmentRoleForOrg(organizationId, "assignee")
}

async function countPlannerBlockedByAssignmentRoleForOrg(
  organizationId: string,
  role: PlannerNotificationRole
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(distinct ${plannerItem.id})` })
    .from(plannerItem)
    .innerJoin(plannerAssignment, eq(plannerAssignment.itemId, plannerItem.id))
    .where(
      and(
        orgItemWhere(organizationId),
        eq(plannerItem.lifecycle, "blocked"),
        eq(plannerAssignment.role, role),
        isNotNull(plannerAssignment.subjectUserId)
      )
    )

  return Number(rows[0]?.count ?? 0)
}

export async function listDuePlannerRecurrencesForOrganization(
  organizationId: string,
  dueAt: Date,
  recurrenceId?: string
): Promise<PlannerRecurrenceDueRow[]> {
  return db
    .select({
      recurrence: plannerRecurrence,
      item: plannerItem,
    })
    .from(plannerRecurrence)
    .innerJoin(plannerItem, eq(plannerRecurrence.itemId, plannerItem.id))
    .where(
      and(
        orgItemWhere(organizationId),
        isNull(plannerRecurrence.pausedAt),
        isNotNull(plannerRecurrence.nextRunAt),
        lte(plannerRecurrence.nextRunAt, dueAt),
        recurrenceId ? eq(plannerRecurrence.id, recurrenceId) : undefined
      )
    )
    .orderBy(asc(plannerRecurrence.nextRunAt))
}

async function summarize(scope: PlannerScopeInput): Promise<OrbitSummary> {
  const [
    queueCount,
    todayCount,
    timelineCount,
    signalCount,
    sessionCount,
    linkCount,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerItem)
      .where(
        and(
          itemScopeWhere(scope),
          inArray(plannerItem.lifecycle, [...PLANNER_ACTIVE_ITEM_LIFECYCLES])
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerItem)
      .where(
        and(
          itemScopeWhere(scope),
          or(
            and(
              isNotNull(plannerItem.dueAt),
              lte(plannerItem.dueAt, endOfToday())
            ),
            and(
              isNotNull(plannerItem.scheduleStartAt),
              lte(plannerItem.scheduleStartAt, endOfToday())
            )
          )
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerItem)
      .where(
        and(
          itemScopeWhere(scope),
          or(
            isNotNull(plannerItem.dueAt),
            isNotNull(plannerItem.scheduleStartAt)
          )
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerSignal)
      .where(
        and(
          signalScopeWhere(scope),
          inArray(plannerSignal.lifecycle, [
            ...PLANNER_ACTIVE_SIGNAL_LIFECYCLES,
          ])
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerSession)
      .where(sessionScopeWhere(scope)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plannerLink)
      .where(linkScopeWhere(scope)),
  ])

  return {
    queueCount: Number(queueCount[0]?.count ?? 0),
    triageCount: Number(signalCount[0]?.count ?? 0),
    todayCount: Number(todayCount[0]?.count ?? 0),
    timelineCount: Number(timelineCount[0]?.count ?? 0),
    signalCount: Number(signalCount[0]?.count ?? 0),
    sessionCount: Number(sessionCount[0]?.count ?? 0),
    linkCount: Number(linkCount[0]?.count ?? 0),
  }
}

export async function getOrbitPageData(
  scope: PlannerScopeInput,
  surface: OrbitDashboardSurface,
  filter: PlannerViewFilterState = {},
  activeViewSlug?: string | null,
  requestedSortMode?: PlannerViewSortMode | null
): Promise<OrbitPageData> {
  const savedViews = await listPlannerViews(scope, surface)
  const activeView =
    activeViewSlug != null
      ? (savedViews.find((view) => view.slug === activeViewSlug) ?? null)
      : null
  const activeFilter = mergePlannerViewFilterStates(
    activeView?.filterState,
    filter
  )
  const activeSortMode = requestedSortMode ?? activeView?.sortMode ?? null

  const [summary, items, signals, sessions, links] = await Promise.all([
    summarize(scope),
    surface === "queue"
      ? listPlannerItemsForQueue(scope, activeFilter, activeSortMode)
      : surface === "triage"
        ? listPlannerItemsForTriage(scope, activeFilter, activeSortMode)
        : surface === "today"
          ? listPlannerItemsForToday(scope, activeFilter, activeSortMode)
          : surface === "timeline"
            ? listPlannerItemsForTimeline(scope, activeFilter, activeSortMode)
            : Promise.resolve([]),
    surface === "signals"
      ? listPlannerSignals(scope, activeFilter, activeSortMode)
      : surface === "triage"
        ? listPlannerSignalsForTriage(scope, activeFilter, activeSortMode)
      : Promise.resolve([]),
    surface === "sessions" ? listPlannerSessions(scope) : Promise.resolve([]),
    surface === "links" ? listPlannerLinks(scope) : Promise.resolve([]),
  ])

  return {
    surface,
    summary,
    items,
    signals,
    sessions,
    links,
    savedViews,
    activeViewSlug: activeView?.slug ?? null,
    activeFilter,
    activeSortMode,
  }
}

export async function getPlannerItemDetail(
  scope: PlannerScopeInput,
  itemId: string,
  viewerUserId?: string | null
): Promise<PlannerItemDetail | null> {
  const [itemRow] = await db
    .select()
    .from(plannerItem)
    .where(and(eq(plannerItem.id, itemId), itemScopeWhere(scope)))
    .limit(1)

  if (!itemRow) return null
  const [hydratedItem] = await applyOperationalFactsToItems(
    [hydrateItem(itemRow)],
    scope
  )

  const [
    assignments,
    schedule,
    reminders,
    recurrence,
    relations,
    links,
    comments,
    attachments,
    activity,
    sessions,
    notices,
    noticeHistory,
  ] = await Promise.all([
    db
      .select()
      .from(plannerAssignment)
      .where(eq(plannerAssignment.itemId, itemId))
      .orderBy(asc(plannerAssignment.createdAt)),
    db
      .select()
      .from(plannerSchedule)
      .where(eq(plannerSchedule.itemId, itemId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(plannerReminder)
      .where(eq(plannerReminder.itemId, itemId))
      .orderBy(asc(plannerReminder.remindAt)),
    db
      .select()
      .from(plannerRecurrence)
      .where(eq(plannerRecurrence.itemId, itemId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        relation: plannerRelation,
        relatedItemTitle: plannerItem.title,
        relatedSignalTitle: plannerSignal.title,
        relatedSignalLifecycle: plannerSignal.lifecycle,
        relatedSignalClass: plannerSignal.signalClass,
      })
      .from(plannerRelation)
      .leftJoin(plannerItem, eq(plannerRelation.relatedItemId, plannerItem.id))
      .leftJoin(
        plannerSignal,
        eq(plannerRelation.relatedSignalId, plannerSignal.id)
      )
      .where(eq(plannerRelation.itemId, itemId))
      .orderBy(desc(plannerRelation.createdAt)),
    db
      .select({
        link: plannerLink,
        itemTitle: plannerItem.title,
        signalTitle: plannerSignal.title,
      })
      .from(plannerLink)
      .leftJoin(plannerItem, eq(plannerLink.itemId, plannerItem.id))
      .leftJoin(plannerSignal, eq(plannerLink.signalId, plannerSignal.id))
      .where(eq(plannerLink.itemId, itemId))
      .orderBy(desc(plannerLink.createdAt)),
    db
      .select()
      .from(plannerComment)
      .where(eq(plannerComment.itemId, itemId))
      .orderBy(desc(plannerComment.createdAt)),
    db
      .select()
      .from(plannerAttachment)
      .where(eq(plannerAttachment.itemId, itemId))
      .orderBy(desc(plannerAttachment.createdAt)),
    db
      .select()
      .from(plannerActivity)
      .where(eq(plannerActivity.itemId, itemId))
      .orderBy(desc(plannerActivity.createdAt)),
    db
      .select({
        session: plannerSession,
        itemTitle: plannerItem.title,
      })
      .from(plannerSession)
      .leftJoin(plannerItem, eq(plannerSession.itemId, plannerItem.id))
      .where(eq(plannerSession.itemId, itemId))
      .orderBy(desc(plannerSession.startedAt)),
    scope.scopeKind === "organization" && viewerUserId
      ? listActiveOrgNotificationsForLinkedEntity({
          organizationId: scope.organizationId,
          userId: viewerUserId,
          linkedEntityType: "planner_item",
          linkedEntityId: itemId,
        })
      : Promise.resolve([]),
    scope.scopeKind === "organization" && viewerUserId
      ? listOrgNotificationHistoryForLinkedEntity({
          organizationId: scope.organizationId,
          userId: viewerUserId,
          linkedEntityType: "planner_item",
          linkedEntityId: itemId,
          limit: 12,
        })
      : Promise.resolve([]),
  ])

  const detail: Omit<PlannerItemDetail, "evidenceGraph"> = {
    ...hydratedItem,
    assignments: assignments.map((row) => ({
      id: row.id,
      role: row.role as PlannerItemDetail["assignments"][number]["role"],
      subjectUserId: row.subjectUserId,
      subjectLabel: row.subjectLabel,
      createdAt: row.createdAt,
    })),
    schedule: schedule
      ? {
          id: schedule.id,
          itemId: schedule.itemId,
          scheduledStartAt: schedule.scheduledStartAt,
          scheduledEndAt: schedule.scheduledEndAt,
          snoozedUntil: schedule.snoozedUntil,
          timeZone: schedule.timeZone,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
        }
      : null,
    reminders: reminders.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      remindAt: row.remindAt,
      status: row.status,
      snoozedUntil: row.snoozedUntil,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    recurrence: recurrence
      ? {
          id: recurrence.id,
          itemId: recurrence.itemId,
          rrule: recurrence.rrule,
          timeZone: recurrence.timeZone,
          nextRunAt: recurrence.nextRunAt,
          lastRunAt: recurrence.lastRunAt,
          pausedAt: recurrence.pausedAt,
          createdAt: recurrence.createdAt,
          updatedAt: recurrence.updatedAt,
        }
      : null,
    relations: relations.map(hydrateRelationRow),
    links: links.map(hydrateLinkRow),
    comments,
    attachments,
    activity: activity.map(hydrateActivityRow),
    sessions: sessions.map(hydrateSessionRow),
    notices,
    noticeHistory,
  }

  return {
    ...detail,
    evidenceGraph: buildPlannerItemEvidenceGraph(detail),
  }
}

export async function getPlannerSessionDetail(
  scope: PlannerScopeInput,
  sessionId: string
): Promise<PlannerSessionDetail | null> {
  const [sessionRow] = await db
    .select()
    .from(plannerSession)
    .where(and(eq(plannerSession.id, sessionId), sessionScopeWhere(scope)))
    .limit(1)

  if (!sessionRow) return null

  const [item, links, activity] = await Promise.all([
    getScopedPlannerItemRow(scope, sessionRow.itemId),
    sessionRow.itemId
      ? db
          .select({
            link: plannerLink,
            itemTitle: plannerItem.title,
            signalTitle: plannerSignal.title,
          })
          .from(plannerLink)
          .leftJoin(plannerItem, eq(plannerLink.itemId, plannerItem.id))
          .leftJoin(plannerSignal, eq(plannerLink.signalId, plannerSignal.id))
          .where(
            and(linkScopeWhere(scope), eq(plannerLink.itemId, sessionRow.itemId))
          )
          .orderBy(desc(plannerLink.createdAt))
      : Promise.resolve([]),
    sessionRow.itemId
      ? db
          .select()
          .from(plannerActivity)
          .where(eq(plannerActivity.itemId, sessionRow.itemId))
          .orderBy(desc(plannerActivity.createdAt))
      : Promise.resolve([]),
  ])

  const detail: Omit<PlannerSessionDetail, "evidenceGraph"> = {
    ...hydrateSessionRow({
      session: sessionRow,
      itemTitle: item?.title ?? null,
    }),
    pausedAt: sessionRow.pausedAt,
    createdByUserId: sessionRow.createdByUserId,
    updatedByUserId: sessionRow.updatedByUserId,
    item,
    links: links.map(hydrateLinkRow),
    activity: activity.map(hydrateActivityRow),
  }

  return {
    ...detail,
    evidenceGraph: buildPlannerSessionEvidenceGraph(detail),
  }
}

export async function getPlannerSignalDetail(
  scope: PlannerScopeInput,
  signalId: string
): Promise<PlannerSignalDetail | null> {
  const [signalRow] = await db
    .select()
    .from(plannerSignal)
    .where(and(eq(plannerSignal.id, signalId), signalScopeWhere(scope)))
    .limit(1)

  if (!signalRow) return null

  const [relatedItems, links, activity] = await Promise.all([
    db
      .select({
        relation: plannerRelation,
        relatedItemTitle: plannerItem.title,
        relatedSignalTitle: plannerSignal.title,
        relatedSignalLifecycle: plannerSignal.lifecycle,
        relatedSignalClass: plannerSignal.signalClass,
      })
      .from(plannerRelation)
      .innerJoin(plannerItem, eq(plannerRelation.itemId, plannerItem.id))
      .leftJoin(
        plannerSignal,
        eq(plannerRelation.relatedSignalId, plannerSignal.id)
      )
      .where(eq(plannerRelation.relatedSignalId, signalId))
      .orderBy(desc(plannerRelation.createdAt)),
    db
      .select({
        link: plannerLink,
        itemTitle: plannerItem.title,
        signalTitle: plannerSignal.title,
      })
      .from(plannerLink)
      .leftJoin(plannerItem, eq(plannerLink.itemId, plannerItem.id))
      .leftJoin(plannerSignal, eq(plannerLink.signalId, plannerSignal.id))
      .where(eq(plannerLink.signalId, signalId))
      .orderBy(desc(plannerLink.createdAt)),
    db
      .select()
      .from(plannerActivity)
      .where(eq(plannerActivity.signalId, signalId))
      .orderBy(desc(plannerActivity.createdAt)),
  ])

  const detail: Omit<PlannerSignalDetail, "evidenceGraph"> = {
    ...hydrateSignal(signalRow),
    relatedItems: relatedItems.map(hydrateRelationRow),
    links: links.map(hydrateLinkRow),
    activity: activity.map(hydrateActivityRow),
  }

  return {
    ...detail,
    evidenceGraph: buildPlannerSignalEvidenceGraph(detail),
  }
}

export async function getPlannerLinkDetail(
  scope: PlannerScopeInput,
  linkId: string
): Promise<PlannerLinkDetail | null> {
  const [row] = await db
    .select({
      link: plannerLink,
      itemTitle: plannerItem.title,
      signalTitle: plannerSignal.title,
    })
    .from(plannerLink)
    .leftJoin(plannerItem, eq(plannerLink.itemId, plannerItem.id))
    .leftJoin(plannerSignal, eq(plannerLink.signalId, plannerSignal.id))
    .where(and(eq(plannerLink.id, linkId), linkScopeWhere(scope)))
    .limit(1)

  if (!row) return null

  const [item, signal, sessions, itemActivity, signalActivity] =
    await Promise.all([
      getScopedPlannerItemRow(scope, row.link.itemId),
      getScopedPlannerSignalRow(scope, row.link.signalId),
      row.link.itemId
        ? db
            .select({
              session: plannerSession,
              itemTitle: plannerItem.title,
            })
            .from(plannerSession)
            .leftJoin(plannerItem, eq(plannerSession.itemId, plannerItem.id))
            .where(
              and(
                sessionScopeWhere(scope),
                eq(plannerSession.itemId, row.link.itemId)
              )
            )
            .orderBy(desc(plannerSession.startedAt))
        : Promise.resolve([]),
      row.link.itemId
        ? db
            .select()
            .from(plannerActivity)
            .where(eq(plannerActivity.itemId, row.link.itemId))
            .orderBy(desc(plannerActivity.createdAt))
        : Promise.resolve([]),
      row.link.signalId
        ? db
            .select()
            .from(plannerActivity)
            .where(eq(plannerActivity.signalId, row.link.signalId))
            .orderBy(desc(plannerActivity.createdAt))
        : Promise.resolve([]),
    ])

  const activity = [...itemActivity, ...signalActivity]
    .map(hydrateActivityRow)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

  const detail: Omit<PlannerLinkDetail, "evidenceGraph"> = {
    ...hydrateLinkRow(row),
    temporalContext: parseRecordContext(row.link.temporalContext),
    auditContext: parseRecordContext(row.link.auditContext),
    item,
    signal,
    sessions: sessions.map(hydrateSessionRow),
    activity,
  }

  return {
    ...detail,
    evidenceGraph: buildPlannerLinkEvidenceGraph(detail),
  }
}
