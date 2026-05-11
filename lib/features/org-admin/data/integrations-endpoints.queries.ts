import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { orgEventDelivery, orgEventEndpoint } from "#lib/db/schema"

import type { OrgEventDeliverySummary, OrgEventEndpointSummary } from "../types"
import { isEventDeliveryState } from "../constants"

/** Lists endpoints for an organization (newest first). */
export async function listOrgEventEndpoints(
  organizationId: string
): Promise<OrgEventEndpointSummary[]> {
  const rows = await db
    .select({
      id: orgEventEndpoint.id,
      organizationId: orgEventEndpoint.organizationId,
      name: orgEventEndpoint.name,
      url: orgEventEndpoint.url,
      events: orgEventEndpoint.events,
      signatureVersion: orgEventEndpoint.signatureVersion,
      enabled: orgEventEndpoint.enabled,
      createdAt: orgEventEndpoint.createdAt,
      updatedAt: orgEventEndpoint.updatedAt,
    })
    .from(orgEventEndpoint)
    .where(eq(orgEventEndpoint.organizationId, organizationId))
    .orderBy(desc(orgEventEndpoint.createdAt))

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    url: row.url,
    events: row.events ?? [],
    signatureVersion: row.signatureVersion,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

/**
 * Loads a specific endpoint scoped to an organization. Returns `null` when the
 * endpoint does not exist for that org (prevents IDOR — never trust the id alone).
 */
export async function getOrgEventEndpoint(
  organizationId: string,
  endpointId: string
): Promise<OrgEventEndpointSummary | null> {
  const [row] = await db
    .select({
      id: orgEventEndpoint.id,
      organizationId: orgEventEndpoint.organizationId,
      name: orgEventEndpoint.name,
      url: orgEventEndpoint.url,
      events: orgEventEndpoint.events,
      signatureVersion: orgEventEndpoint.signatureVersion,
      enabled: orgEventEndpoint.enabled,
      createdAt: orgEventEndpoint.createdAt,
      updatedAt: orgEventEndpoint.updatedAt,
    })
    .from(orgEventEndpoint)
    .where(
      and(
        eq(orgEventEndpoint.organizationId, organizationId),
        eq(orgEventEndpoint.id, endpointId)
      )
    )
    .limit(1)

  if (!row) return null
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    url: row.url,
    events: row.events ?? [],
    signatureVersion: row.signatureVersion,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Returns the first **enabled** endpoint subscribed to `eventType` for the org,
 * or `null` when no endpoint is configured for that event. Used by producers
 * (e.g. HRM statutory submission) to decide whether to enqueue a delivery.
 *
 * Membership in the `events` JSONB column is checked client-side after a
 * narrow per-org fetch — keeps the query portable across SQL dialects.
 */
export async function findEnabledEndpointForEventType(
  organizationId: string,
  eventType: string
): Promise<OrgEventEndpointSummary | null> {
  const rows = await db
    .select({
      id: orgEventEndpoint.id,
      organizationId: orgEventEndpoint.organizationId,
      name: orgEventEndpoint.name,
      url: orgEventEndpoint.url,
      events: orgEventEndpoint.events,
      signatureVersion: orgEventEndpoint.signatureVersion,
      enabled: orgEventEndpoint.enabled,
      createdAt: orgEventEndpoint.createdAt,
      updatedAt: orgEventEndpoint.updatedAt,
    })
    .from(orgEventEndpoint)
    .where(
      and(
        eq(orgEventEndpoint.organizationId, organizationId),
        eq(orgEventEndpoint.enabled, true)
      )
    )
    .orderBy(desc(orgEventEndpoint.createdAt))

  for (const row of rows) {
    const events = (row.events ?? []) as readonly string[]
    if (events.includes(eventType)) {
      return {
        id: row.id,
        organizationId: row.organizationId,
        name: row.name,
        url: row.url,
        events: events as string[],
        signatureVersion: row.signatureVersion,
        enabled: row.enabled,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    }
  }
  return null
}

/**
 * Returns the union of every event type subscribed by an enabled endpoint
 * for the org. RSC-friendly single query — page composers use this to decide
 * which "Send to bureau" affordances to show.
 */
export async function listSubscribedEventTypesForOrg(
  organizationId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ events: orgEventEndpoint.events })
    .from(orgEventEndpoint)
    .where(
      and(
        eq(orgEventEndpoint.organizationId, organizationId),
        eq(orgEventEndpoint.enabled, true)
      )
    )

  const out = new Set<string>()
  for (const row of rows) {
    for (const ev of (row.events ?? []) as readonly string[]) {
      out.add(ev)
    }
  }
  return out
}

/**
 * Loads a specific delivery row scoped to an organization via the endpoint
 * join. Returns `null` when the delivery does not exist for that org —
 * prevents cross-tenant disclosure of `errorMessage` / `httpStatus`.
 */
export async function getOrgEventDelivery(
  organizationId: string,
  deliveryId: string
): Promise<OrgEventDeliverySummary | null> {
  const [row] = await db
    .select({
      id: orgEventDelivery.id,
      endpointId: orgEventDelivery.endpointId,
      eventType: orgEventDelivery.eventType,
      payloadHash: orgEventDelivery.payloadHash,
      signatureVersion: orgEventDelivery.signatureVersion,
      state: orgEventDelivery.state,
      attempts: orgEventDelivery.attempts,
      httpStatus: orgEventDelivery.httpStatus,
      errorMessage: orgEventDelivery.errorMessage,
      durationMs: orgEventDelivery.durationMs,
      nextAttemptAt: orgEventDelivery.nextAttemptAt,
      createdAt: orgEventDelivery.createdAt,
      completedAt: orgEventDelivery.completedAt,
    })
    .from(orgEventDelivery)
    .innerJoin(
      orgEventEndpoint,
      eq(orgEventDelivery.endpointId, orgEventEndpoint.id)
    )
    .where(
      and(
        eq(orgEventDelivery.id, deliveryId),
        eq(orgEventEndpoint.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!row) return null
  return {
    id: row.id,
    endpointId: row.endpointId,
    eventType: row.eventType,
    payloadHash: row.payloadHash,
    signatureVersion: row.signatureVersion,
    state: isEventDeliveryState(row.state) ? row.state : "failed",
    attempts: row.attempts,
    httpStatus: row.httpStatus,
    errorMessage: row.errorMessage,
    durationMs: row.durationMs,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  }
}

/**
 * Bulk-loads delivery rows by id, scoped by organization via the endpoint
 * join. Returns a `Map<deliveryId, OrgEventDeliverySummary>` so RSC composers
 * can attach diagnostics to many parent rows in a single query without N+1.
 *
 * Unknown / cross-tenant ids are silently dropped (never surfaced).
 */
export async function listOrgEventDeliveriesByIds(
  organizationId: string,
  deliveryIds: readonly string[]
): Promise<Map<string, OrgEventDeliverySummary>> {
  const out = new Map<string, OrgEventDeliverySummary>()
  if (deliveryIds.length === 0) return out

  const rows = await db
    .select({
      id: orgEventDelivery.id,
      endpointId: orgEventDelivery.endpointId,
      eventType: orgEventDelivery.eventType,
      payloadHash: orgEventDelivery.payloadHash,
      signatureVersion: orgEventDelivery.signatureVersion,
      state: orgEventDelivery.state,
      attempts: orgEventDelivery.attempts,
      httpStatus: orgEventDelivery.httpStatus,
      errorMessage: orgEventDelivery.errorMessage,
      durationMs: orgEventDelivery.durationMs,
      nextAttemptAt: orgEventDelivery.nextAttemptAt,
      createdAt: orgEventDelivery.createdAt,
      completedAt: orgEventDelivery.completedAt,
    })
    .from(orgEventDelivery)
    .innerJoin(
      orgEventEndpoint,
      eq(orgEventDelivery.endpointId, orgEventEndpoint.id)
    )
    .where(
      and(
        eq(orgEventEndpoint.organizationId, organizationId),
        inArray(orgEventDelivery.id, [...deliveryIds])
      )
    )

  for (const row of rows) {
    out.set(row.id, {
      id: row.id,
      endpointId: row.endpointId,
      eventType: row.eventType,
      payloadHash: row.payloadHash,
      signatureVersion: row.signatureVersion,
      state: isEventDeliveryState(row.state) ? row.state : "failed",
      attempts: row.attempts,
      httpStatus: row.httpStatus,
      errorMessage: row.errorMessage,
      durationMs: row.durationMs,
      nextAttemptAt: row.nextAttemptAt,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    })
  }
  return out
}

/**
 * Most recent deliveries for an endpoint (descending by `createdAt`).
 * Caller must verify endpoint ownership before passing the id.
 */
export async function listRecentDeliveriesForEndpoint(
  endpointId: string,
  limit = 20
): Promise<OrgEventDeliverySummary[]> {
  const rows = await db
    .select({
      id: orgEventDelivery.id,
      endpointId: orgEventDelivery.endpointId,
      eventType: orgEventDelivery.eventType,
      payloadHash: orgEventDelivery.payloadHash,
      signatureVersion: orgEventDelivery.signatureVersion,
      state: orgEventDelivery.state,
      attempts: orgEventDelivery.attempts,
      httpStatus: orgEventDelivery.httpStatus,
      errorMessage: orgEventDelivery.errorMessage,
      durationMs: orgEventDelivery.durationMs,
      nextAttemptAt: orgEventDelivery.nextAttemptAt,
      createdAt: orgEventDelivery.createdAt,
      completedAt: orgEventDelivery.completedAt,
    })
    .from(orgEventDelivery)
    .where(eq(orgEventDelivery.endpointId, endpointId))
    .orderBy(desc(orgEventDelivery.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    endpointId: row.endpointId,
    eventType: row.eventType,
    payloadHash: row.payloadHash,
    signatureVersion: row.signatureVersion,
    state: isEventDeliveryState(row.state) ? row.state : "failed",
    attempts: row.attempts,
    httpStatus: row.httpStatus,
    errorMessage: row.errorMessage,
    durationMs: row.durationMs,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  }))
}
