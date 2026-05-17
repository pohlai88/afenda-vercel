import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"

import { logUnexpectedServerError } from "#lib/logger.server"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

import {
  resolveOrgEventDeliveryForWebhook,
  verifyOrgEventWebhookSignature,
} from "#features/org-admin/server"
import {
  acknowledgeEvidenceTransition,
  findEvidenceByDeliveryId,
} from "#features/hrm/server"

export const maxDuration = 30

const EXTERNAL_REFERENCE_MAX_LENGTH = 128

/**
 * Bureau-side acknowledgement webhook receiver.
 *
 * Public endpoint — auth model is symmetric HMAC against the signing key
 * stored on the originating outbound `org_event_endpoint`. The deliveryId in
 * the URL is the tenant claim; we MUST verify the signature BEFORE acting on
 * any tenant-scoped state.
 *
 * Lifecycle:
 *   submitted -> acknowledged
 *     + acknowledgementSource = "webhook"
 *     + acknowledgedByUserId  = null (system actor)
 *     + authorityPayloadHash  = sha-256(rawBody)  (Phase 3J integrity lineage)
 *     + audit `erp.hrm.statutory.<bureau>.acknowledged`
 *
 * Idempotency: bureau-side retries are EXPECTED. Already-acknowledged rows
 * return 200 with `alreadyAcknowledged: true` so the bureau stops retrying.
 *
 * Error semantics (HTTP status -> bureau retry behavior):
 *   - 400 malformed body / unknown deliveryId / no evidence (DO NOT retry —
 *     payload is permanently wrong)
 *   - 401 signature missing / invalid (bureau will likely retry; we cannot
 *     distinguish "wrong key" from "transient header drop")
 *   - 409 invalid state (e.g. evidence is `failed` — bureau must re-send the
 *     OUTBOUND first; we surface 409 to make this visible in retry logs)
 *   - 200 acknowledged or already_acknowledged (terminal; stop retrying)
 *   - 500 unexpected server error (bureau may retry)
 *
 * Body shape (the bureau may send anything, but we conventionally accept):
 *   {
 *     "externalReference": "string?",   // bureau receipt number / case id
 *     "acknowledgedAt":   "string?"     // bureau-side timestamp (informational)
 *   }
 * Unknown fields are tolerated (forward-compat with bureau changes).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deliveryId: string }> }
): Promise<Response> {
  const { deliveryId } = await context.params
  if (!deliveryId || deliveryId.length > 128) {
    return routeJsonError("Invalid deliveryId", 400, { code: "validation" })
  }

  // Raw body MUST be read as text (NOT request.json()) so signature
  // verification operates on the exact bytes the sender signed. Anything that
  // re-canonicalizes the JSON would break HMAC.
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return routeJsonError("Invalid body", 400, { code: "validation" })
  }
  if (rawBody.length > 64 * 1024) {
    // 64 KiB cap — far above realistic bureau ack payloads (typically <2 KB)
    // and prevents oversized bodies from consuming memory before signature
    // verification.
    return routeJsonError("Body too large", 413, { code: "validation" })
  }

  const resolution = await resolveOrgEventDeliveryForWebhook(deliveryId)
  if (!resolution) {
    // 404 leaks "this deliveryId is unknown vs disabled"; respond 401 to
    // collapse all "no trusted route" cases under the same status. Sender
    // sees the same code for "wrong id" and "wrong key", which is what we
    // want for a public endpoint.
    return routeJsonError("Unauthorized", 401, { code: "unauthorized" })
  }

  const verification = await verifyOrgEventWebhookSignature({
    resolution,
    rawBody,
    signatureHeader: request.headers.get("x-afenda-signature"),
    payloadHashHeader: request.headers.get("x-afenda-payload-hash"),
  })
  if (!verification.ok) {
    return routeJsonError("Unauthorized", 401, { code: verification.reason })
  }

  // From this point onward, `resolution.organizationId` is TRUSTED — the
  // signature establishes that the sender holds the org's signing key. All
  // subsequent reads/writes scope to that org.

  const evidence = await findEvidenceByDeliveryId(
    resolution.organizationId,
    deliveryId
  )
  if (!evidence) {
    // Delivery exists but no evidence row links to it — could be a non-HRM
    // delivery (e.g. integration test, future module). 400 because retrying
    // will not help.
    return routeJsonError("No evidence linked to this delivery", 400, {
      code: "no_evidence",
    })
  }

  // Optional bureau-supplied fields. All best-effort — the integrity lineage
  // is the body hash, not these convenience fields.
  let externalReference: string | null = null
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>
    const ref = parsed?.externalReference
    if (typeof ref === "string") {
      const trimmed = ref.trim()
      if (
        trimmed.length > 0 &&
        trimmed.length <= EXTERNAL_REFERENCE_MAX_LENGTH
      ) {
        externalReference = trimmed
      }
    }
  } catch {
    // Body was not JSON — that is fine. We still have the verified hash.
  }

  let result: Awaited<ReturnType<typeof acknowledgeEvidenceTransition>>
  try {
    result = await acknowledgeEvidenceTransition({
      organizationId: resolution.organizationId,
      evidenceId: evidence.id,
      source: "webhook",
      acknowledgedByUserId: null,
      // No HR session for bureau-initiated webhooks.
      actorSessionId: null,
      externalReference,
      authorityPayloadHash: verification.payloadHash,
      httpContext: {
        path: request.nextUrl.pathname,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent") ?? null,
      },
    })
  } catch (err) {
    logUnexpectedServerError("hrm_statutory_webhook_transition_failed", err, {
      scope: "api.integrations.hrm_statutory_acknowledgement",
      "erp.module": "hrm",
      deliveryId,
      organizationId: resolution.organizationId,
      evidenceId: evidence.id,
    })
    return routeJsonError("Internal Server Error", 500, { code: "unknown" })
  }

  if (result.status === "not_found") {
    // Race: evidence existed at lookup, gone at transition (deletion mid-
    // request). 400 — retrying will not bring it back.
    return routeJsonError("Evidence not found", 400, { code: "not_found" })
  }
  if (result.status === "no_audit_action") {
    return routeJsonError(`Unsupported pack type: ${result.packType}`, 400, {
      code: "unsupported_pack",
    })
  }
  if (result.status === "invalid_state") {
    // 409: bureau must re-send OUTBOUND first (e.g. row is `failed` so the
    // ack does not apply). Explicit code so retry logs make this visible.
    return routeJsonError(
      `Cannot acknowledge from state "${result.currentState}".`,
      409,
      { code: "invalid_state" }
    )
  }

  // Successful transition or already-acknowledged: revalidate compliance
  // dashboards so HR sees the new state on next render.
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "page"
  )

  if (result.status === "already_acknowledged") {
    return routeJsonOk({
      ok: true,
      alreadyAcknowledged: true,
      evidenceId: result.evidenceId,
      acknowledgedAt: result.acknowledgedAt?.toISOString() ?? null,
      acknowledgementSource: result.acknowledgementSource,
      authorityPayloadHash: result.authorityPayloadHash,
    })
  }

  return routeJsonOk({
    ok: true,
    alreadyAcknowledged: false,
    evidenceId: result.evidenceId,
    auditAction: result.auditAction,
    acknowledgedAt: result.acknowledgedAt.toISOString(),
    authorityPayloadHash: result.authorityPayloadHash,
  })
}
