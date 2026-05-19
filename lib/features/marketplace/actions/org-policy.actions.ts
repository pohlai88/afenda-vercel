"use server"

import { after } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { and, eq } from "drizzle-orm"

import {
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { orgCapabilityPolicy } from "#lib/db/schema"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import {
  toLocaleOrgNexusRevalidatePattern,
  toLocaleOrgShellRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

import { isKnownCapabilityId } from "../data/capability-catalog.shared"
import { organizationMarketplacePath } from "../constants"
import { capabilityMetricsTag } from "../data/marketplace-metrics.server"
import {
  MARKETPLACE_AUDIT_ACTIONS,
  MARKETPLACE_RESOURCE_TYPES,
} from "../marketplace.contract"
import {
  orgPolicyDeleteInputSchema,
  orgPolicyInputSchema,
} from "../schemas/org-policy.schema"
import type {
  DeleteOrgCapabilityPolicyResult,
  SetOrgCapabilityPolicyResult,
} from "../types"

/**
 * Capability Registry — org policy Server Actions.
 *
 * Tier A admin per `AGENTS.md §5 — IAM audit policy (ERP)`. Gate:
 * `requireOrgSession` + `canActInOrganization(..., "admin")` +
 * `requireRecentAuthStepUp` (governance-grade write).
 *
 * IDOR contract:
 *
 *   - `organizationId` comes from the validated session, not input.
 *   - `capabilityId` is validated against the live registry; an
 *     unknown id never persists a policy row.
 *
 * Cache invalidation:
 *
 *   - `revalidatePath` against marketplace utilities + admin pages.
 *   - `revalidatePath` against the locale layout — admin policy
 *     can promote a capability to `mandatory`, and the L1 rail
 *     (in the locale root layout) must reflect that for every
 *     viewer in the org.
 *   - `revalidateTag(capabilityMetricsTag(capabilityId))` to bust
 *     the chain-wide metrics aggregation cache.
 */

async function requireAdminWithStepUp(): Promise<{
  organizationId: string
  userId: string
  sessionId: string
}> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ]).catch(() => {
    throw new MarketplacePermissionDeniedError()
  })
  if (!gate.ok) {
    throw new MarketplacePermissionDeniedError()
  }
  const session = gate.session
  const locale = await getRequestAppLocale()
  const orgSlug = await getOrganizationSlugById(session.organizationId)
  if (!orgSlug) {
    throw new MarketplacePermissionDeniedError()
  }
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      organizationMarketplacePath(orgSlug, "admin") as never
    ),
  })
  return {
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
  }
}

class MarketplacePermissionDeniedError extends Error {
  readonly code = "permission_denied" as const
  constructor() {
    super("Admin role required for capability policy changes.")
    this.name = "MarketplacePermissionDeniedError"
  }
}

function denied(): {
  ok: false
  code: "permission_denied"
  message: string
} {
  return {
    ok: false,
    code: "permission_denied",
    message: "Admin role required for capability policy changes.",
  }
}

function revalidateMarketplaceForPolicy(capabilityId: string): void {
  revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
  revalidatePath(toLocaleOrgShellRevalidatePattern(), "layout")
  revalidateTag(capabilityMetricsTag(capabilityId), "max")
}

// ---------------------------------------------------------------------------
// setOrgCapabilityPolicyAction — UPSERT one (capability, audience) row
// ---------------------------------------------------------------------------

export async function setOrgCapabilityPolicyAction(
  raw: unknown
): Promise<SetOrgCapabilityPolicyResult> {
  let actor: { organizationId: string; userId: string; sessionId: string }
  try {
    actor = await requireAdminWithStepUp()
  } catch (err) {
    if (err instanceof MarketplacePermissionDeniedError) return denied()
    throw err
  }

  const parsed = orgPolicyInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid policy input.",
    }
  }
  const input = parsed.data

  if (!isKnownCapabilityId(input.capabilityId)) {
    return {
      ok: false,
      code: "unknown_capability",
      message: "Unknown capability id.",
    }
  }

  const [existing] = await db
    .select({
      id: orgCapabilityPolicy.id,
      state: orgCapabilityPolicy.state,
      audience: orgCapabilityPolicy.audience,
    })
    .from(orgCapabilityPolicy)
    .where(
      and(
        eq(orgCapabilityPolicy.organizationId, actor.organizationId),
        eq(orgCapabilityPolicy.capabilityId, input.capabilityId),
        eq(orgCapabilityPolicy.audience, input.audience)
      )
    )
    .limit(1)

  let writtenId: string
  let didWrite = false
  if (existing) {
    if (existing.state === input.state) {
      writtenId = existing.id
    } else {
      const updated = await db
        .update(orgCapabilityPolicy)
        .set({
          state: input.state,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(orgCapabilityPolicy.id, existing.id))
        .returning({ id: orgCapabilityPolicy.id })
      writtenId = updated[0]?.id ?? existing.id
      didWrite = true
    }
  } else {
    const inserted = await db
      .insert(orgCapabilityPolicy)
      .values({
        organizationId: actor.organizationId,
        capabilityId: input.capabilityId,
        state: input.state,
        audience: input.audience,
        updatedBy: actor.userId,
      })
      .returning({ id: orgCapabilityPolicy.id })
    writtenId = inserted[0]!.id
    didWrite = true
  }

  if (didWrite) {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: MARKETPLACE_AUDIT_ACTIONS.ORG_POLICY_SET,
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorSessionId: actor.sessionId,
        resourceType: MARKETPLACE_RESOURCE_TYPES.ORG_POLICY,
        resourceId: writtenId,
        metadata: {
          capabilityId: input.capabilityId,
          state: input.state,
          audience: input.audience,
        },
      })
    )
    revalidateMarketplaceForPolicy(input.capabilityId)
  }

  return {
    ok: true,
    policyId: writtenId,
    state: input.state,
    audience: input.audience,
  }
}

// ---------------------------------------------------------------------------
// deleteOrgCapabilityPolicyAction — reset one (capability, audience) row
// ---------------------------------------------------------------------------

export async function deleteOrgCapabilityPolicyAction(
  raw: unknown
): Promise<DeleteOrgCapabilityPolicyResult> {
  let actor: { organizationId: string; userId: string; sessionId: string }
  try {
    actor = await requireAdminWithStepUp()
  } catch (err) {
    if (err instanceof MarketplacePermissionDeniedError) return denied()
    throw err
  }

  const parsed = orgPolicyDeleteInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid policy input.",
    }
  }
  const input = parsed.data

  const deleted = await db
    .delete(orgCapabilityPolicy)
    .where(
      and(
        eq(orgCapabilityPolicy.organizationId, actor.organizationId),
        eq(orgCapabilityPolicy.capabilityId, input.capabilityId),
        eq(orgCapabilityPolicy.audience, input.audience)
      )
    )
    .returning({
      id: orgCapabilityPolicy.id,
      capabilityId: orgCapabilityPolicy.capabilityId,
      audience: orgCapabilityPolicy.audience,
    })

  const row = deleted[0]
  if (!row) {
    // Idempotent reset → no audit row, success result.
    return { ok: true }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: MARKETPLACE_AUDIT_ACTIONS.ORG_POLICY_DELETE,
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorSessionId: actor.sessionId,
      resourceType: MARKETPLACE_RESOURCE_TYPES.ORG_POLICY,
      resourceId: row.id,
      metadata: {
        capabilityId: row.capabilityId,
        audience: row.audience,
      },
    })
  )
  revalidateMarketplaceForPolicy(row.capabilityId)

  return { ok: true }
}
