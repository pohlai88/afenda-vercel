import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgEventDelivery } from "#lib/db/schema"

import type {
  OrgEventDeliveryState,
  OrgEventDeliverySummary,
  OrgEventEndpointSummary,
} from "../types"
import { ORG_EVENT_SIGNATURE_VERSION } from "../constants"

/** Outbound delivery envelope before serialization. */
export type OrgEventEnvelope = {
  /** Stable id for idempotent receivers (UUID v4). */
  id: string
  type: string
  /** ISO-8601 UTC timestamp. */
  occurredAt: string
  organizationId: string
  data: Record<string, unknown>
}

/** Hand-back to {@link deliverNow} after {@link enqueueDelivery}. */
export type DeliveryHandle = {
  deliveryId: string
  endpointId: string
  envelope: OrgEventEnvelope
  canonicalJson: string
  payloadHash: string
  url: string
  signingKey: string
  signatureVersion: string
}

export type DeliveryResult = {
  state: OrgEventDeliveryState
  httpStatus: number | null
  errorMessage: string | null
  durationMs: number
}

/**
 * Canonical JSON serialization — sorted object keys at every level. The output
 * is deterministic so `payloadHash` is reproducible across producers/receivers.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry))
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key])
    }
    return out
  }
  return value
}

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let out = ""
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0")
  }
  return out
}

/** sha-256 hex of the canonical JSON for `payloadHash`. */
export async function computePayloadHash(
  canonicalJson: string
): Promise<string> {
  const data = new TextEncoder().encode(canonicalJson)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return bytesToHex(digest)
}

/** HMAC-sha256(signingKey, canonicalJson) hex — header value: `v1=<hex>`. */
export async function signEventPayload(
  signingKey: string,
  canonicalJson: string
): Promise<string> {
  const keyBytes = new TextEncoder().encode(signingKey)
  const messageBytes = new TextEncoder().encode(canonicalJson)
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes)
  return bytesToHex(sig)
}

/**
 * Writes a `queued` row and returns the handle used by {@link deliverNow}.
 * Always pairs with a `deliverNow` call today; queue/cron implementations
 * (Phase 2b) will swap the internals without changing call-sites.
 */
export async function enqueueDelivery(input: {
  endpoint: OrgEventEndpointSummary
  signingKey: string
  envelope: OrgEventEnvelope
}): Promise<DeliveryHandle> {
  const canonicalJson = canonicalJsonStringify(input.envelope)
  const payloadHash = await computePayloadHash(canonicalJson)

  const [row] = await db
    .insert(orgEventDelivery)
    .values({
      endpointId: input.endpoint.id,
      eventType: input.envelope.type,
      payloadHash,
      signatureVersion: input.endpoint.signatureVersion,
      state: "queued",
    })
    .returning({ id: orgEventDelivery.id })

  return {
    deliveryId: row.id,
    endpointId: input.endpoint.id,
    envelope: input.envelope,
    canonicalJson,
    payloadHash,
    url: input.endpoint.url,
    signingKey: input.signingKey,
    signatureVersion: input.endpoint.signatureVersion,
  }
}

const DELIVERY_TIMEOUT_MS = 5_000

/**
 * Synchronous HTTP delivery for the {@link DeliveryHandle}. Updates the
 * underlying `org_event_delivery` row to `delivered` / `failed` based on the
 * receiver response. Never throws — failures are stored on the row.
 */
export async function deliverNow(
  handle: DeliveryHandle
): Promise<DeliveryResult> {
  const startedAt = Date.now()

  await db
    .update(orgEventDelivery)
    .set({ state: "sending", attempts: 1 })
    .where(eq(orgEventDelivery.id, handle.deliveryId))

  let result: DeliveryResult
  try {
    const signature = await signEventPayload(
      handle.signingKey,
      handle.canonicalJson
    )

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(handle.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-afenda-event": handle.envelope.type,
          "x-afenda-delivery": handle.deliveryId,
          "x-afenda-payload-hash": handle.payloadHash,
          "x-afenda-signature": `${handle.signatureVersion}=${signature}`,
        },
        body: handle.canonicalJson,
      })
    } finally {
      clearTimeout(timer)
    }

    const ok = res.ok
    result = {
      state: ok ? "delivered" : "failed",
      httpStatus: res.status,
      errorMessage: ok
        ? null
        : `Receiver responded with HTTP ${res.status} ${res.statusText}`.trim(),
      durationMs: Date.now() - startedAt,
    }
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "Delivery failed (unknown error)"
    result = {
      state: "failed",
      httpStatus: null,
      errorMessage: reason.slice(0, 512),
      durationMs: Date.now() - startedAt,
    }
  }

  await db
    .update(orgEventDelivery)
    .set({
      state: result.state,
      httpStatus: result.httpStatus,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
      completedAt: new Date(),
    })
    .where(eq(orgEventDelivery.id, handle.deliveryId))

  return result
}

/**
 * Convenience: enqueue a delivery for an endpoint + envelope and immediately
 * call {@link deliverNow}. Phase 2 entry point used by Server Actions.
 */
export async function deliverEventNow(input: {
  endpoint: OrgEventEndpointSummary
  signingKey: string
  envelope: OrgEventEnvelope
}): Promise<{ delivery: OrgEventDeliverySummary; result: DeliveryResult }> {
  const handle = await enqueueDelivery(input)
  const result = await deliverNow(handle)

  return {
    delivery: {
      id: handle.deliveryId,
      endpointId: handle.endpointId,
      eventType: input.envelope.type,
      payloadHash: handle.payloadHash,
      signatureVersion: handle.signatureVersion,
      state: result.state,
      attempts: 1,
      httpStatus: result.httpStatus,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
      nextAttemptAt: null,
      createdAt: new Date(),
      completedAt: new Date(),
    },
    result,
  }
}

/** Public re-export for callers that need the canonical algorithm version. */
export { ORG_EVENT_SIGNATURE_VERSION }
