import "server-only"

import {
  and,
  asc,
  desc,
  eq,
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
  plannerActivity,
  plannerAssignment,
  plannerAttachment,
  plannerComment,
  plannerItem,
  plannerRelation,
  plannerLink,
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
} from "../constants"
import {
  mergePlannerViewFilterStates,
  normalizePlannerViewFilterState,
  type PlannerViewFilterState,
} from "../filters/planner-view-filter.shared"
import {
  sortPlannerItems,
  sortPlannerSignals,
} from "../filters/planner-view-sort.shared"
import { hydratePlannerPressure } from "../pressure/planner-pressure.shared"
import type {
  PlannerDisplayPriority,
  OrbitDashboardSurface,
  OrbitPageData,
  OrbitSummary,
  PlannerItemDetail,
  PlannerItemRow,
  PlannerLinkRow,
  PlannerRelationRow,
  PlannerScopeInput,
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

function parseAudit7w1h(raw: unknown): AuditEvent7W1H[] | null {
  if (!Array.isArray(raw)) return null
  const events = raw
    .map((entry) => auditEvent7W1HSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data)
  return events.length > 0 ? events : null
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
    relationType: input.relation.relationType as PlannerRelationRow["relationType"],
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
        scope.scopeKind === "organization"
          ? eq(plannerLink.organizationId, scope.organizationId)
          : eq(plannerLink.ownerUserId, scope.ownerUserId),
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
        scope.scopeKind === "organization"
          ? eq(plannerLink.organizationId, scope.organizationId)
          : eq(plannerLink.ownerUserId, scope.ownerUserId),
        isNotNull(plannerLink.signalId),
        inArray(plannerLink.module, [...linkedModules])
      )
    )

  return rows.map((row) => row.signalId).filter(Boolean) as string[]
}

async function resolveScopedAssignedItemIds(
  scope: PlannerScopeInput,
  ownerUserIds: readonly string[] | undefined
): Promise<string[] | null> {
  if (!hasFilterValues(ownerUserIds)) return null

  if (scope.scopeKind === "personal") {
    return ownerUserIds.includes(scope.ownerUserId)
      ? null
      : []
  }

  const rows = await db
    .select({ itemId: plannerAssignment.itemId })
    .from(plannerAssignment)
    .innerJoin(plannerItem, eq(plannerAssignment.itemId, plannerItem.id))
    .where(
      and(
        itemScopeWhere(scope),
        inArray(plannerAssignment.subjectUserId, [...ownerUserIds])
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

  const merged = [
    ...itemRows.map((row) => {
      const hydrated = hydrateItem(row)
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
        displayPriority: hydrated.displayPriority,
        pressureScore: hydrated.pressureScore,
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
    resolveScopedAssignedItemIds(scope, filter.ownerUserIds),
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

  return sortPlannerItems(
    rows
      .map(hydrateItem)
      .filter((row) => matchesDisplayPriority(row.displayPriority, filter)),
    sortMode
  )
}

export async function listPlannerItemsForToday(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerItemRow[]> {
  const [linkedItemIds, assignedItemIds] = await Promise.all([
    resolveScopedLinkedItemIds(scope, filter.linkedModule),
    resolveScopedAssignedItemIds(scope, filter.ownerUserIds),
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

  return sortPlannerItems(
    rows
      .map(hydrateItem)
      .filter((row) => matchesDisplayPriority(row.displayPriority, filter)),
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
    resolveScopedAssignedItemIds(scope, filter.ownerUserIds),
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

  return sortPlannerItems(
    rows
      .map(hydrateItem)
      .filter((row) => matchesDisplayPriority(row.displayPriority, filter)),
    sortMode
  )
}

export async function listPlannerSignals(
  scope: PlannerScopeInput,
  filter: PlannerViewFilterState = {},
  sortMode?: PlannerViewSortMode | null
): Promise<PlannerSignalRow[]> {
  const linkedSignalIds = await resolveScopedLinkedSignalIds(scope, filter.linkedModule)
  if (linkedSignalIds && linkedSignalIds.length === 0) return []

  const rows = await db
    .select()
    .from(plannerSignal)
    .where(
      and(
        signalScopeWhere(scope),
        hasFilterValues(filter.lifecycle)
          ? inArray(plannerSignal.lifecycle, [...filter.lifecycle])
          : inArray(plannerSignal.lifecycle, [...PLANNER_ACTIVE_SIGNAL_LIFECYCLES]),
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

  return rows.map(({ session, itemTitle }) => ({
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
  }))
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
    .where(
      scope.scopeKind === "organization"
        ? eq(plannerLink.organizationId, scope.organizationId)
        : eq(plannerLink.ownerUserId, scope.ownerUserId)
    )
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
    sortMode: row.sortMode,
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
      .where(
        scope.scopeKind === "organization"
          ? eq(plannerLink.organizationId, scope.organizationId)
          : eq(plannerLink.ownerUserId, scope.ownerUserId)
      ),
  ])

  return {
    queueCount: Number(queueCount[0]?.count ?? 0),
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
  const savedViews =
    surface === "queue" || surface === "timeline" || surface === "signals"
      ? await listPlannerViews(scope, surface)
      : []
  const activeView =
    activeViewSlug != null
      ? savedViews.find((view) => view.slug === activeViewSlug) ?? null
      : null
  const activeFilter = mergePlannerViewFilterStates(activeView?.filterState, filter)
  const activeSortMode = requestedSortMode ?? activeView?.sortMode ?? null

  const [summary, items, signals, sessions, links] = await Promise.all([
    summarize(scope),
    surface === "queue"
      ? listPlannerItemsForQueue(scope, activeFilter, activeSortMode)
      : surface === "today"
        ? listPlannerItemsForToday(scope, activeFilter, activeSortMode)
        : surface === "timeline"
          ? listPlannerItemsForTimeline(scope, activeFilter, activeSortMode)
          : Promise.resolve([]),
    surface === "signals"
      ? listPlannerSignals(scope, activeFilter, activeSortMode)
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
  itemId: string
): Promise<PlannerItemDetail | null> {
  const [itemRow] = await db
    .select()
    .from(plannerItem)
    .where(and(eq(plannerItem.id, itemId), itemScopeWhere(scope)))
    .limit(1)

  if (!itemRow) return null

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
  ])

  return {
    ...hydrateItem(itemRow),
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
    activity,
    sessions: sessions.map(({ session, itemTitle }) => ({
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
    })),
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

  return {
    ...hydrateSignal(signalRow),
    relatedItems: relatedItems.map(hydrateRelationRow),
    links: links.map(hydrateLinkRow),
    activity,
  }
}
