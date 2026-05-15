"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import {
  deleteUserOperationalScope,
  upsertUserOperationalScope,
} from "../data/operational-scope.queries.server"
import {
  pinScopeSchema,
  setUserScopeSelectionSchema,
  unpinScopeSchema,
} from "../schemas/operational-scope.schemas"
import { OPERATIONAL_SCOPE_AUDIT_ACTIONS } from "../operational-scope.contract"

type OkResult = { ok: true }
type ErrResult = { ok: false; error: string }
type ScopeActionResult = OkResult | ErrResult

/**
 * Pin a scope dimension to the user's rail and optionally set an initial selection.
 * Tier B — `requireOrgSession` only.
 */
export async function pinScopeAction(
  input: unknown
): Promise<ScopeActionResult> {
  const session = await requireOrgSession()

  const parsed = pinScopeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    }
  }

  await upsertUserOperationalScope({
    organizationId: session.organizationId,
    userId: session.userId,
    scopeType: parsed.data.scopeType,
    displayOrder: parsed.data.displayOrder,
    pinned: true,
  })

  await writeIamAuditEventFromNextHeaders({
    action: OPERATIONAL_SCOPE_AUDIT_ACTIONS.USER_SCOPE_UPDATE,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "user_operational_scope",
    resourceId: `${session.organizationId}:${session.userId}:${parsed.data.scopeType}`,
    metadata: {
      scopeType: parsed.data.scopeType,
      operation: "pin",
      displayOrder: parsed.data.displayOrder,
    },
  })

  revalidatePath(toLocaleOrgDashboardRevalidatePattern(""), "layout")
  return { ok: true }
}

/**
 * Unpin a scope dimension and clear its selection from the user's rail.
 * Tier B — `requireOrgSession` only.
 */
export async function unpinScopeAction(
  input: unknown
): Promise<ScopeActionResult> {
  const session = await requireOrgSession()

  const parsed = unpinScopeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    }
  }

  await deleteUserOperationalScope({
    organizationId: session.organizationId,
    userId: session.userId,
    scopeType: parsed.data.scopeType,
  })

  await writeIamAuditEventFromNextHeaders({
    action: OPERATIONAL_SCOPE_AUDIT_ACTIONS.USER_SCOPE_UPDATE,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "user_operational_scope",
    resourceId: `${session.organizationId}:${session.userId}:${parsed.data.scopeType}`,
    metadata: {
      scopeType: parsed.data.scopeType,
      operation: "unpin",
    },
  })

  revalidatePath(toLocaleOrgDashboardRevalidatePattern(""), "layout")
  return { ok: true }
}

/**
 * Set or clear the selected entity for a pinned scope dimension.
 * Tier B — `requireOrgSession` only.
 */
export async function setUserScopeSelectionAction(
  input: unknown
): Promise<ScopeActionResult> {
  const session = await requireOrgSession()

  const parsed = setUserScopeSelectionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    }
  }

  const { scopeType, selectedId, selectedLabel, selectedSlug } = parsed.data

  await upsertUserOperationalScope({
    organizationId: session.organizationId,
    userId: session.userId,
    scopeType,
    selectedId,
    selectedLabel,
    selectedSlug,
    pinned: true,
  })

  await writeIamAuditEventFromNextHeaders({
    action: OPERATIONAL_SCOPE_AUDIT_ACTIONS.USER_SCOPE_UPDATE,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "user_operational_scope",
    resourceId: `${session.organizationId}:${session.userId}:${scopeType}`,
    metadata: {
      scopeType,
      operation: "selection",
      selectedId,
    },
  })

  revalidatePath(toLocaleOrgDashboardRevalidatePattern(""), "layout")
  return { ok: true }
}
