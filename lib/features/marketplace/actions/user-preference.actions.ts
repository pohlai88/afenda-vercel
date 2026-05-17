"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { userCapabilityPreference } from "#lib/db/schema"
import {
  toLocaleMarketplaceRevalidatePattern,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { isKnownCapabilityId } from "../data/capability-catalog.shared"
import {
  MARKETPLACE_AUDIT_ACTIONS,
  MARKETPLACE_RESOURCE_TYPES,
} from "../marketplace.contract"
import { userPreferenceInputSchema } from "../schemas/user-preference.schema"
import type { SetUserCapabilityPreferenceResult } from "../types"

/**
 * Capability Registry — user preference Server Action.
 *
 * Tier B per `AGENTS.md §5 — IAM audit policy (ERP)`. The gate is
 * `requireOrgSession` (member-default) — a personal preference is
 * not admin-guarded master data.
 *
 * IDOR contract:
 *
 *   - `organizationId` + `userId` come from the session, not input.
 *   - `capabilityId` is validated against the live registry; an
 *     unknown id returns `unknown_capability` and never inserts a
 *     row (would otherwise leave dangling preferences for ids that
 *     no resolver can see).
 *
 * Audit emits **only on a real DB write**: a no-op idempotent set
 * (state already matches the desired state) returns `ok: true` with
 * the existing preference id but writes no audit row, matching the
 * `iam_audit_event` doctrine "DB write → audit; otherwise no audit."
 *
 * Cache invalidation:
 *
 *   - `revalidatePath` against the marketplace utilities surface
 *     so the user's view reflects the toggle on next render.
 *   - `revalidatePath` against the locale layout — the L1 utility
 *     bar lives in the root locale `layout.tsx`, so a page-scope
 *     revalidation alone would miss the rail.
 */

export async function setUserCapabilityPreferenceAction(
  raw: unknown
): Promise<SetUserCapabilityPreferenceResult> {
  const session = await requireOrgSession()

  const parsed = userPreferenceInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid preference input.",
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

  // Pre-flight existence check so an idempotent re-set is a true no-op
  // (no DB write → no audit row) and the action can return the existing id.
  const [existing] = await db
    .select({
      id: userCapabilityPreference.id,
      state: userCapabilityPreference.state,
    })
    .from(userCapabilityPreference)
    .where(
      and(
        eq(userCapabilityPreference.organizationId, session.organizationId),
        eq(userCapabilityPreference.userId, session.userId),
        eq(userCapabilityPreference.capabilityId, input.capabilityId)
      )
    )
    .limit(1)

  if (existing && existing.state === input.state) {
    return {
      ok: true,
      preferenceId: existing.id,
      state: input.state,
    }
  }

  let writtenId: string
  if (existing) {
    const updated = await db
      .update(userCapabilityPreference)
      .set({ state: input.state, updatedAt: new Date() })
      .where(eq(userCapabilityPreference.id, existing.id))
      .returning({ id: userCapabilityPreference.id })
    writtenId = updated[0]?.id ?? existing.id
  } else {
    const inserted = await db
      .insert(userCapabilityPreference)
      .values({
        organizationId: session.organizationId,
        userId: session.userId,
        capabilityId: input.capabilityId,
        state: input.state,
      })
      .returning({ id: userCapabilityPreference.id })
    writtenId = inserted[0]!.id
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: MARKETPLACE_AUDIT_ACTIONS.USER_PREFERENCE_SET,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: MARKETPLACE_RESOURCE_TYPES.USER_PREFERENCE,
      resourceId: writtenId,
      metadata: {
        capabilityId: input.capabilityId,
        state: input.state,
      },
    })
  )

  // Refresh the marketplace utility list AND the locale layout so the
  // L1 rail (mounted in the locale root layout) re-runs the resolver.
  revalidatePath(toLocaleMarketplaceRevalidatePattern("/utilities"), "page")
  revalidatePath(toLocaleRoutePattern("/" as `/${string}`), "layout")

  return {
    ok: true,
    preferenceId: writtenId,
    state: input.state,
  }
}
