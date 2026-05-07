import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgEventEndpoint } from "#lib/db/schema"

import type { OrgEventEndpointInput } from "../schemas/integrations-endpoint.schema"
import type { OrgEventEndpointSummary } from "../types"
import { ORG_EVENT_SIGNATURE_VERSION } from "../constants"

/** 32-byte cryptographically random key, base64url-encoded for HMAC use. */
function generateSigningKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let str = ""
  for (const b of bytes) str += String.fromCharCode(b)
  return Buffer.from(str, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export type CreatedOrgEventEndpoint = {
  endpoint: OrgEventEndpointSummary
  /** Plaintext signing key — return to caller exactly once, never read again. */
  signingKey: string
}

/** Inserts a new endpoint and returns the row plus the one-shot signing key. */
export async function insertOrgEventEndpoint(input: {
  organizationId: string
  data: OrgEventEndpointInput
}): Promise<CreatedOrgEventEndpoint> {
  const signingKey = generateSigningKey()
  const [row] = await db
    .insert(orgEventEndpoint)
    .values({
      organizationId: input.organizationId,
      name: input.data.name,
      url: input.data.url,
      signingKeyEncoded: signingKey,
      events: [...input.data.events],
      signatureVersion: ORG_EVENT_SIGNATURE_VERSION,
      enabled: input.data.enabled,
    })
    .returning({
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

  return {
    endpoint: {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      url: row.url,
      events: row.events ?? [],
      signatureVersion: row.signatureVersion,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    signingKey,
  }
}

/** Updates a tenant-owned endpoint. Returns the updated row or `null` if no match. */
export async function updateOrgEventEndpoint(input: {
  organizationId: string
  endpointId: string
  data: OrgEventEndpointInput
}): Promise<OrgEventEndpointSummary | null> {
  const [row] = await db
    .update(orgEventEndpoint)
    .set({
      name: input.data.name,
      url: input.data.url,
      events: [...input.data.events],
      enabled: input.data.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgEventEndpoint.id, input.endpointId),
        eq(orgEventEndpoint.organizationId, input.organizationId)
      )
    )
    .returning({
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

/** Tenant-scoped delete. Returns `true` when a row was removed. */
export async function deleteOrgEventEndpoint(input: {
  organizationId: string
  endpointId: string
}): Promise<boolean> {
  const rows = await db
    .delete(orgEventEndpoint)
    .where(
      and(
        eq(orgEventEndpoint.id, input.endpointId),
        eq(orgEventEndpoint.organizationId, input.organizationId)
      )
    )
    .returning({ id: orgEventEndpoint.id })
  return rows.length > 0
}

/** Issues a fresh signing key on an existing endpoint. Returns the plaintext once. */
export async function rotateOrgEventEndpointSigningKey(input: {
  organizationId: string
  endpointId: string
}): Promise<{ endpoint: OrgEventEndpointSummary; signingKey: string } | null> {
  const signingKey = generateSigningKey()
  const [row] = await db
    .update(orgEventEndpoint)
    .set({
      signingKeyEncoded: signingKey,
      signatureVersion: ORG_EVENT_SIGNATURE_VERSION,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgEventEndpoint.id, input.endpointId),
        eq(orgEventEndpoint.organizationId, input.organizationId)
      )
    )
    .returning({
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

  if (!row) return null
  return {
    endpoint: {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      url: row.url,
      events: row.events ?? [],
      signatureVersion: row.signatureVersion,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    signingKey,
  }
}

/**
 * Server-only — reads back the stored signing key for delivery signing.
 * Never expose this through Server Actions; only the delivery pipeline calls it.
 */
export async function getOrgEventEndpointSigningKey(input: {
  organizationId: string
  endpointId: string
}): Promise<string | null> {
  const [row] = await db
    .select({ signingKeyEncoded: orgEventEndpoint.signingKeyEncoded })
    .from(orgEventEndpoint)
    .where(
      and(
        eq(orgEventEndpoint.id, input.endpointId),
        eq(orgEventEndpoint.organizationId, input.organizationId)
      )
    )
    .limit(1)
  return row?.signingKeyEncoded ?? null
}
