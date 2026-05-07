import "server-only"

import { and, desc, eq } from "drizzle-orm"

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
