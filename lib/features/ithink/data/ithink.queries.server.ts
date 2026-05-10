import "server-only"

import { cache } from "react"

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"

import {
  auditEvent7W1HSchema,
  type AuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"

import {
  onethingCounterpartySchema,
  onethingImpactSchema,
  onethingLinkageSchema,
  onethingProvenanceSchema,
  safeParseOneThingSpoke,
  safeParsePredictions,
  safeParseResolutionProof,
  safeParseTemporalNext,
  safeParseTemporalNow,
  safeParseTemporalPast,
  type OneThingCounterparty,
  type OneThingImpact,
  type OneThingLinkage,
  type OneThingProvenance,
  type OneThingRow,
} from "#features/onething"
import { listOneThingListsForOrg } from "#features/onething/server"

import { ITHINK_ACTIVE_STATES } from "../constants"
import type { IThinkListRow, IThinkRow } from "../types"

/**
 * Duplicated from `onething.queries.server.ts` — iThink must not edit OneThing's
 * SELECT/hydrate (ADR-0002). Keeps JSONB coerce-or-null semantics identical.
 */
type RawOneThingRow = Omit<
  OneThingRow,
  | "linkage"
  | "counterparty"
  | "provenance"
  | "impact"
  | "temporalPast"
  | "temporalNow"
  | "temporalNext"
  | "resolutionProof"
  | "predictions"
  | "audit7w1h"
> & {
  linkage: unknown
  counterparty: unknown
  provenance: unknown
  impact: unknown
  temporalPast: unknown
  temporalNow: unknown
  temporalNext: unknown
  resolutionProof: unknown
  predictions: unknown
  audit7w1h: unknown
}

export type RawIThinkDbRow = RawOneThingRow & {
  parentOneThingId: string | null
}

function parseAudit7w1hColumn(raw: unknown): AuditEvent7W1H[] {
  if (!Array.isArray(raw)) return []
  const out: AuditEvent7W1H[] = []
  for (const item of raw) {
    const p = auditEvent7W1HSchema.safeParse(item)
    if (p.success) out.push(p.data)
  }
  return out
}

export function hydrateIThinkRow(row: RawIThinkDbRow): IThinkRow {
  const base: OneThingRow = {
    ...row,
    linkage: safeParseOneThingSpoke<OneThingLinkage>(
      onethingLinkageSchema,
      row.linkage
    ),
    counterparty: safeParseOneThingSpoke<OneThingCounterparty>(
      onethingCounterpartySchema,
      row.counterparty
    ),
    provenance: safeParseOneThingSpoke<OneThingProvenance>(
      onethingProvenanceSchema,
      row.provenance
    ),
    impact: safeParseOneThingSpoke<OneThingImpact>(
      onethingImpactSchema,
      row.impact
    ),
    temporalPast: safeParseTemporalPast(row.temporalPast),
    temporalNow: safeParseTemporalNow(row.temporalNow),
    temporalNext: safeParseTemporalNext(row.temporalNext),
    resolutionProof: safeParseResolutionProof(row.resolutionProof),
    predictions: (() => {
      const p = safeParsePredictions(row.predictions)
      return p.length > 0 ? p : null
    })(),
    audit7w1h: (() => {
      const a = parseAudit7w1hColumn(row.audit7w1h)
      return a.length > 0 ? a : null
    })(),
  }
  return {
    ...base,
    parentOneThingId: row.parentOneThingId,
  }
}

export const ITHINK_ROW_SELECT = {
  id: oneThing.id,
  listId: oneThing.listId,
  title: oneThing.title,
  consequence: oneThing.consequence,
  state: oneThing.state,
  severity: oneThing.severity,
  dueAt: oneThing.dueAt,
  snoozeUntil: oneThing.snoozeUntil,
  assigneeUserId: oneThing.assigneeUserId,
  recurrenceRule: oneThing.recurrenceRule,
  position: oneThing.position,
  createdAt: oneThing.createdAt,
  updatedAt: oneThing.updatedAt,
  linkage: oneThing.linkage,
  counterparty: oneThing.counterparty,
  provenance: oneThing.provenance,
  impact: oneThing.impact,
  temporalPast: oneThing.temporalPast,
  temporalNow: oneThing.temporalNow,
  temporalNext: oneThing.temporalNext,
  resolvedAt: oneThing.resolvedAt,
  deprecatedAt: oneThing.deprecatedAt,
  resolutionNote: oneThing.resolutionNote,
  resolutionProof: oneThing.resolutionProof,
  predictions: oneThing.predictions,
  audit7w1h: oneThing.audit7w1h,
  parentOneThingId: oneThing.parentOneThingId,
} as const

export async function listIThinkListsForOrg(
  organizationId: string
): Promise<IThinkListRow[]> {
  return listOneThingListsForOrg(organizationId)
}

export async function getIThinkById(
  id: string,
  organizationId: string
): Promise<IThinkRow | null> {
  const [row] = await db
    .select(ITHINK_ROW_SELECT)
    .from(oneThing)
    .where(
      and(eq(oneThing.id, id), eq(oneThing.organizationId, organizationId))
    )
    .limit(1)

  return row ? hydrateIThinkRow(row as RawIThinkDbRow) : null
}

export async function listIThinkForList(
  listId: string,
  organizationId: string
): Promise<IThinkRow[]> {
  const rows = await db
    .select(ITHINK_ROW_SELECT)
    .from(oneThing)
    .where(
      and(
        eq(oneThing.listId, listId),
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
    .orderBy(asc(oneThing.position), desc(oneThing.createdAt))

  return rows.map((r) => hydrateIThinkRow(r as RawIThinkDbRow))
}

function endOfTodayUTC(): Date {
  const d = new Date()
  d.setUTCHours(23, 59, 59, 999)
  return d
}

export async function listIThinkForToday(
  organizationId: string
): Promise<IThinkRow[]> {
  const rows = await db
    .select(ITHINK_ROW_SELECT)
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        isNotNull(oneThing.dueAt),
        lte(oneThing.dueAt, endOfTodayUTC()),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
    .orderBy(asc(oneThing.dueAt), desc(oneThing.createdAt))

  return rows.map((r) => hydrateIThinkRow(r as RawIThinkDbRow))
}

export async function listIThinkForScheduled(
  organizationId: string
): Promise<IThinkRow[]> {
  const rows = await db
    .select(ITHINK_ROW_SELECT)
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        isNotNull(oneThing.dueAt),
        gt(oneThing.dueAt, endOfTodayUTC()),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
    .orderBy(asc(oneThing.dueAt), desc(oneThing.createdAt))

  return rows.map((r) => hydrateIThinkRow(r as RawIThinkDbRow))
}

export async function countIThinkForInbox(
  listId: string,
  organizationId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.listId, listId),
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
  return Number(result?.count ?? 0)
}

export async function countIThinkForToday(
  organizationId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        isNotNull(oneThing.dueAt),
        lte(oneThing.dueAt, endOfTodayUTC()),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
  return Number(result?.count ?? 0)
}

export async function countIThinkForScheduled(
  organizationId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        isNotNull(oneThing.dueAt),
        gt(oneThing.dueAt, endOfTodayUTC()),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
  return Number(result?.count ?? 0)
}

/**
 * Total active iThink count for an org — used by Nexus snapshot to populate the
 * "operations" surface pressure count on the Truth Map.
 */
export async function countIThinkActiveForOrg(
  organizationId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
  return Number(result?.count ?? 0)
}

type IThinkPressureRow = {
  id: string
  title: string
  severity: string
  dueAt: Date | null
  listId: string
}

/**
 * Returns up to `limit` high/critical active iThink items ordered by severity
 * then dueAt. Used by the Nexus snapshot to build the Operational Pressure band.
 *
 * Wrapped in {@link cache} so concurrent callers in one request (e.g. `getNexusSnapshot`
 * + L1 utility bar) share a single DB round-trip.
 */
export const listIThinkHighPressureForNexus = cache(
  async function listIThinkHighPressureForNexus(
    organizationId: string,
    limit = 5
  ): Promise<IThinkPressureRow[]> {
    return db
      .select({
        id: oneThing.id,
        title: oneThing.title,
        severity: oneThing.severity,
        dueAt: oneThing.dueAt,
        listId: oneThing.listId,
      })
      .from(oneThing)
      .where(
        and(
          eq(oneThing.organizationId, organizationId),
          inArray(oneThing.severity, ["high", "critical"]),
          inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
        )
      )
      .orderBy(
        sql`case ${oneThing.severity} when 'critical' then 0 when 'high' then 1 else 2 end`,
        asc(oneThing.dueAt)
      )
      .limit(limit)
  }
)

type IThinkResolutionRow = {
  id: string
  title: string
  resolvedAt: Date
  resolutionNote: string | null
}

/**
 * Returns up to `limit` recently resolved iThink items from the last 7 days.
 * Used by the Nexus snapshot to build the Recent Resolution strip.
 */
export async function listIThinkRecentResolutionsForNexus(
  organizationId: string,
  limit = 3
): Promise<IThinkResolutionRow[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      id: oneThing.id,
      title: oneThing.title,
      resolvedAt: oneThing.resolvedAt,
      resolutionNote: oneThing.resolutionNote,
    })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        eq(oneThing.state, "resolved"),
        isNotNull(oneThing.resolvedAt),
        gt(oneThing.resolvedAt, since)
      )
    )
    .orderBy(desc(oneThing.resolvedAt))
    .limit(limit)

  return rows.filter((r): r is IThinkResolutionRow => r.resolvedAt !== null)
}
