import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"

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
 * SELECT/hydrate (ADR-0004a). Keeps JSONB coerce-or-null semantics identical.
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

type RawIThinkDbRow = RawOneThingRow & { parentOneThingId: string | null }

function parseAudit7w1hColumn(raw: unknown): AuditEvent7W1H[] {
  if (!Array.isArray(raw)) return []
  const out: AuditEvent7W1H[] = []
  for (const item of raw) {
    const p = auditEvent7W1HSchema.safeParse(item)
    if (p.success) out.push(p.data)
  }
  return out
}

function hydrateIThinkRow(row: RawIThinkDbRow): IThinkRow {
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

const ITHINK_ROW_SELECT = {
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
