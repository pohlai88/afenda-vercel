"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import {
  createPlannerSignalLink,
  insertPlannerSignal,
} from "#features/planner/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { requireOrgSession } from "#lib/tenant"

import {
  deleteOrgEventEndpoint as deleteEndpointRow,
  insertOrgEventEndpoint,
  rotateOrgEventEndpointSigningKey,
  updateOrgEventEndpoint as updateEndpointRow,
  getOrgEventEndpointSigningKey,
} from "../data/integrations-endpoints.mutations"
import { getOrgEventEndpoint } from "../data/integrations-endpoints.queries"
import { deliverEventNow } from "../data/integrations-delivery.server"
import type { ZodError } from "zod"

import {
  orgEventEndpointInputSchema,
  type OrgEventEndpointInput,
} from "../schemas/integrations-endpoint.schema"
import { organizationAdminPath } from "../constants"
import type { OrgEventDeliveryState, OrgEventEndpointSummary } from "../types"

export type EndpointActionState =
  | {
      ok: true
      message?: string
      signingKey?: string
      endpoint?: OrgEventEndpointSummary
    }
  | {
      ok: false
      error: string
      fieldErrors?: { name?: string; url?: string; events?: string }
    }
  | null

export type EndpointPingActionState =
  | {
      ok: true
      state: OrgEventDeliveryState
      httpStatus: number | null
      durationMs: number
    }
  | { ok: false; error: string }
  | null

function parseEndpointInput(formData: FormData) {
  const eventsRaw = formData.get("events")
  const events =
    typeof eventsRaw === "string"
      ? eventsRaw
          .split(",")
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0)
      : []
  const enabledRaw = formData.get("enabled")
  const enabled =
    enabledRaw === null
      ? true
      : enabledRaw === "true" || enabledRaw === "on" || enabledRaw === "1"
  return orgEventEndpointInputSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    events,
    enabled,
  })
}

function fieldErrorsFromZod(error: ZodError<OrgEventEndpointInput>): {
  name?: string
  url?: string
  events?: string
} {
  const flat = error.flatten().fieldErrors
  return {
    name: flat.name?.[0],
    url: flat.url?.[0],
    events: flat.events?.[0],
  }
}

async function requireOrgAdmin() {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return { ok: false as const, error: "Admin role required." }
  }
  return { ok: true as const, session }
}

/**
 * Revalidates at **layout** scope so the org-admin rail's `integrations`
 * pressure badge (Phase 2 — `getOrgAdminRailPressureCounts`) refreshes
 * after every endpoint mutation. The integrations page revalidation
 * comes along for free since it sits below the layout.
 */
function revalidateIntegrations() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern("/integrations"), "layout")
}

/** Tier B (admin-guarded master data) — `org.integration.endpoint.create`. */
export async function createOrgEventEndpoint(
  _prev: EndpointActionState,
  formData: FormData
): Promise<EndpointActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const parsed = parseEndpointInput(formData)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Fix the highlighted fields and try again.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    }
  }

  try {
    const created = await insertOrgEventEndpoint({
      organizationId: session.organizationId,
      data: parsed.data,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "org.integration.endpoint.create",
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "integration.endpoint",
        resourceId: created.endpoint.id,
        metadata: {
          eventCount: created.endpoint.events.length,
        },
      })
    )

    revalidateIntegrations()
    return {
      ok: true,
      endpoint: created.endpoint,
      signingKey: created.signingKey,
    }
  } catch {
    return { ok: false, error: "Could not create endpoint. Try again." }
  }
}

/** Tier B — `org.integration.endpoint.update`. */
export async function updateOrgEventEndpoint(
  _prev: EndpointActionState,
  formData: FormData
): Promise<EndpointActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const endpointId = formData.get("endpointId")
  if (typeof endpointId !== "string" || endpointId.length === 0) {
    return { ok: false, error: "Missing endpoint id." }
  }

  const parsed = parseEndpointInput(formData)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Fix the highlighted fields and try again.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    }
  }

  const updated = await updateEndpointRow({
    organizationId: session.organizationId,
    endpointId,
    data: parsed.data,
  })

  if (!updated) {
    return { ok: false, error: "Endpoint not found in this organization." }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "org.integration.endpoint.update",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "integration.endpoint",
      resourceId: endpointId,
    })
  )

  revalidateIntegrations()
  return { ok: true, endpoint: updated }
}

/** Tier B — `org.integration.endpoint.delete`. */
export async function deleteOrgEventEndpoint(
  _prev: EndpointActionState,
  formData: FormData
): Promise<EndpointActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const endpointId = formData.get("endpointId")
  if (typeof endpointId !== "string" || endpointId.length === 0) {
    return { ok: false, error: "Missing endpoint id." }
  }

  const removed = await deleteEndpointRow({
    organizationId: session.organizationId,
    endpointId,
  })

  if (!removed) {
    return { ok: false, error: "Endpoint not found in this organization." }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "org.integration.endpoint.delete",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "integration.endpoint",
      resourceId: endpointId,
    })
  )

  revalidateIntegrations()
  return { ok: true }
}

/** Tier B — `org.integration.endpoint.rotate_secret`. */
export async function rotateOrgEventEndpointSecret(
  _prev: EndpointActionState,
  formData: FormData
): Promise<EndpointActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const endpointId = formData.get("endpointId")
  if (typeof endpointId !== "string" || endpointId.length === 0) {
    return { ok: false, error: "Missing endpoint id." }
  }

  const rotated = await rotateOrgEventEndpointSigningKey({
    organizationId: session.organizationId,
    endpointId,
  })

  if (!rotated) {
    return { ok: false, error: "Endpoint not found in this organization." }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "org.integration.endpoint.rotate_secret",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "integration.endpoint",
      resourceId: endpointId,
    })
  )

  revalidateIntegrations()
  return {
    ok: true,
    endpoint: rotated.endpoint,
    signingKey: rotated.signingKey,
  }
}

/** Tier B — `org.integration.endpoint.ping`. Issues a synthetic `system.ping` event. */
export async function pingOrgEventEndpoint(
  _prev: EndpointPingActionState,
  formData: FormData
): Promise<EndpointPingActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const endpointId = formData.get("endpointId")
  if (typeof endpointId !== "string" || endpointId.length === 0) {
    return { ok: false, error: "Missing endpoint id." }
  }

  const endpoint = await getOrgEventEndpoint(session.organizationId, endpointId)
  if (!endpoint) {
    return { ok: false, error: "Endpoint not found in this organization." }
  }

  const signingKey = await getOrgEventEndpointSigningKey({
    organizationId: session.organizationId,
    endpointId,
  })
  if (!signingKey) {
    return { ok: false, error: "Endpoint signing key unavailable." }
  }

  const { delivery } = await deliverEventNow({
    endpoint,
    signingKey,
    envelope: {
      id: crypto.randomUUID(),
      type: "system.ping",
      occurredAt: new Date().toISOString(),
      organizationId: session.organizationId,
      data: { reason: "manual_ping" },
    },
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "org.integration.endpoint.ping",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "integration.endpoint",
      resourceId: endpointId,
      metadata: {
        deliveryState: delivery.state,
        httpStatus: delivery.httpStatus,
      },
    })
  )

  if (delivery.state !== "delivered") {
    const orgSlug = await getOrganizationSlugById(session.organizationId)
    const signal = await insertPlannerSignal({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      title: `Integration endpoint ping failed for ${endpoint.name}`,
      description:
        "Manual endpoint ping did not complete successfully and needs investigation.",
      signalClass: "anomaly",
      actorUserId: session.userId,
      originatingSystem: "org_admin.integrations",
      pressure: {
        urgency: 3,
        impact: 3,
        severity: 3,
        confidence: 4,
        effort: 2,
        escalationLevel: 2,
        temporalProximity: 2,
        ownershipPressure: 2,
      },
    })

    await createPlannerSignalLink({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      signalId: signal.id,
      module: "org_admin",
      entityType: "integration_endpoint",
      entityId: endpoint.id,
      displayLabel: endpoint.name,
      href: orgSlug ? organizationAdminPath(orgSlug, "integrations") : null,
      causalityReason: "Endpoint ping failed.",
      actorUserId: session.userId,
    })
  }

  revalidateIntegrations()
  return {
    ok: true,
    state: delivery.state,
    httpStatus: delivery.httpStatus,
    durationMs: delivery.durationMs ?? 0,
  }
}
