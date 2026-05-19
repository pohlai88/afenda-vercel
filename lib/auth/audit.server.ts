import "server-only"

import { headers } from "next/headers"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

import {
  IAM_AUDIT_TELEMETRY_TAG,
  resolveIamAuditTelemetryEnabled,
} from "./iam-audit-telemetry.shared"
import {
  AUDIT_ACTOR_MODE,
  AUDIT_ORIGIN,
  resolveAuditActorModeForInsert,
} from "./audit-origin.shared"
import { getSimulationContextOrNull } from "#lib/erp/simulation-context.server"

export type WriteIamAuditEventInput = {
  action: string
  actorUserId?: string | null
  actorSessionId?: string | null
  organizationId?: string | null
  resourceType?: string | null
  resourceId?: string | null
  path?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

function clientIpFromHeaders(headers: Headers | undefined): string | null {
  if (!headers) return null
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return null
}

function userAgentFromHeaders(headers: Headers | undefined): string | null {
  const raw = headers?.get("user-agent")
  if (!raw) return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

/**
 * Best-effort audit insert. Never throws to callers (logs in development only).
 */
export async function writeIamAuditEvent(
  input: WriteIamAuditEventInput
): Promise<void> {
  try {
    const metadata =
      input.metadata && Object.keys(input.metadata).length > 0
        ? JSON.stringify(input.metadata)
        : null
    const simulation = getSimulationContextOrNull()
    const auditOrigin = simulation
      ? AUDIT_ORIGIN.simulation
      : AUDIT_ORIGIN.production
    const auditActorMode = simulation
      ? AUDIT_ACTOR_MODE.systemSimulation
      : resolveAuditActorModeForInsert(input.actorUserId)

    await db.insert(iamAuditEvent).values({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorSessionId: input.actorSessionId ?? null,
      organizationId: input.organizationId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      path: input.path ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata,
      auditOrigin,
      simulationRunId: simulation?.simulationRunId ?? null,
      scenarioId: simulation?.scenarioId ?? null,
      scenarioVersion: simulation?.scenarioVersion ?? null,
      simulationSeed: simulation?.seed ?? null,
      auditActorMode,
    })
    if (resolveIamAuditTelemetryEnabled()) {
      // Raw JSON stdout for Vercel log drains — bypasses Pino intentionally.
      // Gated by AFENDA_IAM_AUDIT_LOG / VERCEL env vars (see iam-audit-telemetry.shared.ts).
      // eslint-disable-next-line no-console
      console.info(
        JSON.stringify({
          tag: IAM_AUDIT_TELEMETRY_TAG,
          action: input.action,
          resourceType: input.resourceType ?? undefined,
          organizationScoped: Boolean(input.organizationId),
          auditOrigin,
          t: new Date().toISOString(),
        })
      )
    }
  } catch (err) {
    logUnexpectedServerError("iam_audit_event_write_failed", err)
  }
}

/** Headers from a Better Auth hook / Request-like object. */
export function writeIamAuditEventFromHeaders(
  headers: Headers | undefined,
  input: Omit<WriteIamAuditEventInput, "ipAddress" | "userAgent"> &
    Partial<Pick<WriteIamAuditEventInput, "ipAddress" | "userAgent">>
): Promise<void> {
  return writeIamAuditEvent({
    ...input,
    ipAddress: input.ipAddress ?? clientIpFromHeaders(headers),
    userAgent: input.userAgent ?? userAgentFromHeaders(headers),
  })
}

function pathFromIncomingHeaders(h: Headers): string | null {
  const referer = h.get("referer")?.trim()
  if (referer) {
    try {
      return new URL(referer).pathname || null
    } catch {
      return null
    }
  }
  return null
}

/**
 * Server Actions / RSC: enrich audit rows with IP, user-agent, and path (from Referer pathname).
 */
export async function writeIamAuditEventFromNextHeaders(
  input: Omit<WriteIamAuditEventInput, "ipAddress" | "userAgent" | "path"> &
    Partial<Pick<WriteIamAuditEventInput, "ipAddress" | "userAgent" | "path">>
): Promise<void> {
  const h = await headers()
  const path = input.path ?? pathFromIncomingHeaders(h)
  return writeIamAuditEventFromHeaders(h, { ...input, path })
}
