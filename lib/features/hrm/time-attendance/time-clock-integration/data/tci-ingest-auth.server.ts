import "server-only"

import { timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmTimeClockDevice } from "#lib/db/schema"
import { getOrgSessionFromRequest } from "#lib/auth"

import type { TimeClockCommandContext } from "./tci-punch-commands.server"

function constantTimeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  return token || null
}

async function resolveApiKeyActor(input: {
  organizationId: string
  token: string
}): Promise<TimeClockCommandContext | null> {
  const envKey = process.env.HRM_TIME_CLOCK_INGEST_API_KEY?.trim()
  if (envKey && constantTimeEqual(envKey, input.token)) {
    const actorUserId =
      process.env.HRM_TIME_CLOCK_INGEST_ACTOR_USER_ID?.trim() ?? null
    if (!actorUserId) return null
    return {
      organizationId: input.organizationId,
      userId: actorUserId,
      sessionId: null,
    }
  }

  const devices = await db
    .select({
      id: hrmTimeClockDevice.id,
      integrationCredentialRef: hrmTimeClockDevice.integrationCredentialRef,
      createdByUserId: hrmTimeClockDevice.createdByUserId,
    })
    .from(hrmTimeClockDevice)
    .where(
      and(
        eq(hrmTimeClockDevice.organizationId, input.organizationId),
        eq(hrmTimeClockDevice.state, "active")
      )
    )

  const matched = devices.find(
    (row) =>
      row.integrationCredentialRef != null &&
      row.integrationCredentialRef.length > 0 &&
      constantTimeEqual(row.integrationCredentialRef, input.token)
  )
  if (!matched) return null

  const userId =
    process.env.HRM_TIME_CLOCK_INGEST_ACTOR_USER_ID?.trim() ??
    matched.createdByUserId
  if (!userId) return null

  return {
    organizationId: input.organizationId,
    userId,
    sessionId: null,
  }
}

/**
 * Org session (browser) or integration API key (Bearer + organization header).
 */
export async function resolveTimeClockIngestActor(
  request: NextRequest,
  bodyOrganizationId: string
): Promise<TimeClockCommandContext | null> {
  const session = await getOrgSessionFromRequest(request)
  if (session?.organizationId && session.userId) {
    if (session.organizationId !== bodyOrganizationId) return null
    return {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId ?? null,
    }
  }

  const orgHeader = request.headers.get("x-afenda-organization-id")?.trim()
  if (!orgHeader || orgHeader !== bodyOrganizationId) return null

  const token = parseBearerToken(request.headers.get("authorization"))
  if (!token) return null

  return resolveApiKeyActor({ organizationId: bodyOrganizationId, token })
}
