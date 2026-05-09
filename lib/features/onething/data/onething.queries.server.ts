import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing, oneThingList } from "#lib/db/schema"

import {
  auditEvent7W1HSchema,
  type AuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"

import {
  safeParsePredictions,
  safeParseResolutionProof,
  safeParseTemporalNext,
  safeParseTemporalNow,
  safeParseTemporalPast,
} from "../schemas/onething-onething.schema"
import {
  safeParseOneThingSpoke,
  onethingCounterpartySchema,
  onethingImpactSchema,
  onethingLinkageSchema,
  onethingProvenanceSchema,
} from "../schemas/onething.schema"
import type {
  OneThingCounterparty,
  OneThingImpact,
  OneThingLinkage,
  OneThingListRow,
  OneThingProvenance,
  OneThingRow,
} from "../types"

/**
 * Hydrate a raw row (with `unknown` JSONB spokes) into the typed `OneThingRow`.
 * Malformed JSON for any spoke is coerced to `null` rather than rejected so
 * that legacy rows from before `0015_onething_atom.sql` keep rendering.
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

/** Parse a JSONB audit cache column (unknown[]) into validated 7W1H events. */
export function parseAudit7w1hColumn(raw: unknown): AuditEvent7W1H[] {
  if (!Array.isArray(raw)) return []
  const out: AuditEvent7W1H[] = []
  for (const item of raw) {
    const p = auditEvent7W1HSchema.safeParse(item)
    if (p.success) out.push(p.data)
  }
  return out
}

function hydrateOneThingRow(row: RawOneThingRow): OneThingRow {
  return {
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
}

const ONETHING_ROW_SELECT = {
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
} as const

export async function listOneThingListsForOrg(
  organizationId: string
): Promise<OneThingListRow[]> {
  const rows = await db
    .select({
      id: oneThingList.id,
      name: oneThingList.name,
      slug: oneThingList.slug,
      archivedAt: oneThingList.archivedAt,
    })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.organizationId, organizationId),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(oneThingList.name))

  return rows
}

export async function listOneThingListsForUser(
  ownerUserId: string
): Promise<OneThingListRow[]> {
  const rows = await db
    .select({
      id: oneThingList.id,
      name: oneThingList.name,
      slug: oneThingList.slug,
      archivedAt: oneThingList.archivedAt,
    })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.ownerUserId, ownerUserId),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(oneThingList.name))

  return rows
}

export async function getOrgOneThingListById(
  organizationId: string,
  listId: string
): Promise<OneThingListRow | null> {
  const [row] = await db
    .select({
      id: oneThingList.id,
      name: oneThingList.name,
      slug: oneThingList.slug,
      archivedAt: oneThingList.archivedAt,
    })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.id, listId),
        eq(oneThingList.organizationId, organizationId),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  return row ?? null
}

export async function getPersonalOneThingListById(
  ownerUserId: string,
  listId: string
): Promise<OneThingListRow | null> {
  const [row] = await db
    .select({
      id: oneThingList.id,
      name: oneThingList.name,
      slug: oneThingList.slug,
      archivedAt: oneThingList.archivedAt,
    })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.id, listId),
        eq(oneThingList.ownerUserId, ownerUserId),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  return row ?? null
}

export async function listOneThingForList(
  listId: string,
  organizationId: string | null,
  ownerUserId: string | null
): Promise<OneThingRow[]> {
  const scope =
    organizationId !== null
      ? eq(oneThing.organizationId, organizationId)
      : ownerUserId !== null
        ? eq(oneThing.ownerUserId, ownerUserId)
        : sql`false`

  const rows = await db
    .select(ONETHING_ROW_SELECT)
    .from(oneThing)
    .where(and(eq(oneThing.listId, listId), scope))
    .orderBy(asc(oneThing.position), desc(oneThing.createdAt))

  return rows.map((r) => hydrateOneThingRow(r as RawOneThingRow))
}

export async function getOneThingScoped(
  oneThingId: string,
  organizationId: string | null,
  ownerUserId: string | null
): Promise<OneThingRow | null> {
  const scope =
    organizationId !== null
      ? eq(oneThing.organizationId, organizationId)
      : ownerUserId !== null
        ? eq(oneThing.ownerUserId, ownerUserId)
        : sql`false`

  const [row] = await db
    .select(ONETHING_ROW_SELECT)
    .from(oneThing)
    .where(and(eq(oneThing.id, oneThingId), scope))
    .limit(1)

  return row ? hydrateOneThingRow(row as RawOneThingRow) : null
}

export async function countOverdueOneThingForOrganization(
  organizationId: string
): Promise<number> {
  const now = new Date()
  const [row] = await db
    .select({ n: count() })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, ["detected", "owned", "blocked", "resolving"]),
        isNotNull(oneThing.dueAt),
        lte(oneThing.dueAt, now)
      )
    )
  return Number(row?.n ?? 0)
}

export async function listOverdueOneThingSummariesForOrganization(
  organizationId: string,
  limit: number
): Promise<
  Array<{ id: string; title: string; dueAt: Date | null; state: string }>
> {
  const now = new Date()
  return db
    .select({
      id: oneThing.id,
      title: oneThing.title,
      dueAt: oneThing.dueAt,
      state: oneThing.state,
    })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, ["detected", "owned", "blocked", "resolving"]),
        or(
          and(isNotNull(oneThing.dueAt), lte(oneThing.dueAt, now)),
          and(
            eq(oneThing.state, "blocked"),
            isNotNull(oneThing.snoozeUntil),
            lte(oneThing.snoozeUntil, now)
          )
        )
      )
    )
    .orderBy(asc(oneThing.dueAt))
    .limit(limit)
}

export async function listDistinctOrgIdsWithOneThing(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ organizationId: oneThing.organizationId })
    .from(oneThing)
    .where(isNotNull(oneThing.organizationId))

  return rows
    .map((r) => r.organizationId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
}

export async function getOrgOneThingByIdForOrganization(
  organizationId: string,
  oneThingId: string
): Promise<OneThingRow | null> {
  const [row] = await db
    .select(ONETHING_ROW_SELECT)
    .from(oneThing)
    .where(
      and(
        eq(oneThing.id, oneThingId),
        eq(oneThing.organizationId, organizationId)
      )
    )
    .limit(1)

  return row ? hydrateOneThingRow(row as RawOneThingRow) : null
}

export type DueSoonOneThingSummary = {
  id: string
  title: string
  dueAt: Date | null
}

export async function listDueSoonOneThingSummariesForReminder(
  organizationId: string,
  horizonEnd: Date,
  limit: number
): Promise<DueSoonOneThingSummary[]> {
  const now = new Date()
  return db
    .select({ id: oneThing.id, title: oneThing.title, dueAt: oneThing.dueAt })
    .from(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, ["detected", "owned", "resolving"]),
        isNotNull(oneThing.dueAt),
        lte(oneThing.dueAt, horizonEnd),
        gte(oneThing.dueAt, now)
      )
    )
    .limit(limit)
}
