"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { railSavedView } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"

import {
  RAIL_MEMORY_AUDIT_ACTIONS,
  RAIL_MEMORY_RESOURCE_TYPES,
  RAIL_VIEW_LIMIT_PER_WORKBENCH,
  WORKBENCH_REVALIDATE_PATTERNS,
  isWorkbenchId,
} from "../constants"
import { countSavedViewsForUser } from "../data/view.queries.server"
import {
  deleteViewInputSchema,
  saveViewInputSchema,
  updateViewInputSchema,
} from "../schemas/view-input.schema"
import type {
  DeleteViewResult,
  SaveViewResult,
  UpdateViewResult,
} from "../types"

/**
 * Working Memory Rail — saved-view Server Actions.
 *
 * Same Tier B + `requireOrgSession` discipline as `pin.actions.ts`.
 * The audit grammar mirrors pins: every successful state change
 * writes one `iam.workbench.view.*` row; idempotent / no-op paths
 * (validation rejection, no-op update) write nothing.
 *
 * `href` is operator-supplied (the URL of the filtered list the
 * operator just bookmarked). Validation is structural only — the
 * action does not attempt to confirm the URL points at a real route,
 * because operators legitimately save views that link to filters
 * they're about to add. The rail UI rendering layer is the
 * authoritative gate (the kernel `parseAppShellPrimaryLeftRailView` runs at
 * the slot boundary).
 */

/**
 * Centralized "revalidate this workbench's rail" helper. Takes an
 * untrusted workbench-id string (DB-derived or input-derived) and
 * narrows via `isWorkbenchId` before reading the canonical pattern
 * map. The narrow keeps `revalidatePath` from being called with an
 * invented workbench id from a stale row.
 */
function revalidateRailForWorkbench(workbenchId: string): void {
  if (!isWorkbenchId(workbenchId)) return
  revalidatePath(WORKBENCH_REVALIDATE_PATTERNS[workbenchId], "layout")
}

// ---------------------------------------------------------------------------
// saveViewAction
// ---------------------------------------------------------------------------

export async function saveViewAction(raw: unknown): Promise<SaveViewResult> {
  const session = await requireOrgSession()

  const parsed = saveViewInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid view input.",
    }
  }
  const input = parsed.data

  const currentCount = await countSavedViewsForUser({
    organizationId: session.organizationId,
    userId: session.userId,
    workbenchId: input.workbenchId,
  })
  if (currentCount >= RAIL_VIEW_LIMIT_PER_WORKBENCH) {
    return {
      ok: false,
      code: "limit_reached",
      message: `Saved-view limit reached (${RAIL_VIEW_LIMIT_PER_WORKBENCH}). Delete one first.`,
    }
  }

  const viewId = crypto.randomUUID()
  await db.insert(railSavedView).values({
    id: viewId,
    organizationId: session.organizationId,
    userId: session.userId,
    workbenchId: input.workbenchId,
    label: input.label,
    href: input.href,
    icon: input.icon ?? null,
    rank: currentCount,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.VIEW_CREATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.VIEW,
      resourceId: viewId,
      metadata: {
        workbenchId: input.workbenchId,
        label: input.label,
        href: input.href,
      },
    })
  )
  revalidateRailForWorkbench(input.workbenchId)

  return { ok: true, viewId }
}

// ---------------------------------------------------------------------------
// deleteViewAction
// ---------------------------------------------------------------------------

export async function deleteViewAction(
  raw: unknown
): Promise<DeleteViewResult> {
  const session = await requireOrgSession()

  const parsed = deleteViewInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid delete input.",
    }
  }
  const input = parsed.data

  const existing = await db
    .select({
      id: railSavedView.id,
      workbenchId: railSavedView.workbenchId,
      label: railSavedView.label,
    })
    .from(railSavedView)
    .where(
      and(
        eq(railSavedView.id, input.viewId),
        eq(railSavedView.organizationId, session.organizationId),
        eq(railSavedView.userId, session.userId)
      )
    )
    .limit(1)

  if (existing.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: "View not found or not yours.",
    }
  }
  const row = existing[0]!

  await db.delete(railSavedView).where(eq(railSavedView.id, input.viewId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.VIEW_DELETE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.VIEW,
      resourceId: row.id,
      metadata: {
        workbenchId: row.workbenchId,
        label: row.label,
      },
    })
  )
  revalidateRailForWorkbench(row.workbenchId)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// updateViewAction
// ---------------------------------------------------------------------------

export async function updateViewAction(
  raw: unknown
): Promise<UpdateViewResult> {
  const session = await requireOrgSession()

  const parsed = updateViewInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid update input.",
    }
  }
  const input = parsed.data

  const existing = await db
    .select({
      id: railSavedView.id,
      workbenchId: railSavedView.workbenchId,
      label: railSavedView.label,
      href: railSavedView.href,
      icon: railSavedView.icon,
    })
    .from(railSavedView)
    .where(
      and(
        eq(railSavedView.id, input.viewId),
        eq(railSavedView.organizationId, session.organizationId),
        eq(railSavedView.userId, session.userId)
      )
    )
    .limit(1)

  if (existing.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: "View not found or not yours.",
    }
  }
  const row = existing[0]!

  // Build the change set + a typed list of changed field names. The
  // changed list is the audit metadata operators read on dispute —
  // "what was different about this view that needed to change?"
  const changes: {
    label?: string
    href?: string
    icon?: string | null
  } = {}
  const changed: Array<"label" | "href" | "icon"> = []

  if (input.label !== undefined && input.label !== row.label) {
    changes.label = input.label
    changed.push("label")
  }
  if (input.href !== undefined && input.href !== row.href) {
    changes.href = input.href
    changed.push("href")
  }
  if (input.icon !== undefined) {
    const nextIcon = input.icon === null ? null : input.icon
    if (nextIcon !== row.icon) {
      changes.icon = nextIcon
      changed.push("icon")
    }
  }

  if (changed.length === 0) {
    // No-op: the schema demanded *some* field be present but every
    // value matched what's already stored. No DB write -> no audit
    // (AGENTS §5 doctrine). Still report `ok: true` with empty
    // `changed` so the UI knows the request was understood.
    return { ok: true, changed: [] }
  }

  await db
    .update(railSavedView)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(railSavedView.id, input.viewId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.VIEW_UPDATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.VIEW,
      resourceId: row.id,
      metadata: {
        workbenchId: row.workbenchId,
        changed,
        // Capture the BEFORE / AFTER for human-readable fields so a
        // future "view audit timeline" surface can render the diff
        // without joining back to the row.
        ...(changes.label !== undefined
          ? { previousLabel: row.label, nextLabel: changes.label }
          : {}),
        ...(changes.href !== undefined
          ? { previousHref: row.href, nextHref: changes.href }
          : {}),
        ...(changes.icon !== undefined
          ? { previousIcon: row.icon, nextIcon: changes.icon }
          : {}),
      },
    })
  )
  revalidateRailForWorkbench(row.workbenchId)

  return { ok: true, changed }
}
