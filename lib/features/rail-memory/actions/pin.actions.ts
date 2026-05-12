"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import {
  RAIL_MEMORY_AUDIT_ACTIONS,
  RAIL_MEMORY_RESOURCE_TYPES,
  RAIL_PIN_LIMIT_PER_WORKBENCH,
  WORKBENCH_REVALIDATE_PATTERNS,
  isWorkbenchId,
} from "../constants"
import {
  deletePin,
  findExistingPin,
  insertPin,
  reorderPins,
} from "../data/pin.mutations.server"
import { countPinsForUser, listPinnedForUser } from "../data/pin.queries.server"
import {
  pinRecordInputSchema,
  reorderPinsInputSchema,
  unpinRecordInputSchema,
} from "../schemas/pin-input.schema"
import type {
  PinRecordResult,
  ReorderPinsResult,
  UnpinRecordResult,
} from "../types"

/**
 * Working Memory Rail — pin Server Actions.
 *
 * Tier B per `AGENTS.md §5 — IAM audit policy (ERP)`. The action gate
 * is `requireOrgSession` (member-default); a personal pin is not
 * admin-guarded master data, so we do not invoke
 * `canActInOrganization(..., "admin")`. The `organizationId` +
 * `userId` come from the validated session, never from input — closing
 * the IDOR vector for cross-tenant pin writes.
 *
 * Audit contract:
 *
 *   `iam.workbench.pin.create`   — successful insert
 *   `iam.workbench.pin.delete`   — successful delete
 *   `iam.workbench.pin.reorder`  — successful full-permutation reorder
 *
 * Idempotent / no-op paths (re-pin of an already-pinned record,
 * unpin of a stale id) do NOT audit — `iam_audit_event` records
 * authority change, and a no-op is not a state change.
 *
 * Revalidation runs at `layout` scope so the workbench's rail
 * (mounted in `layout.tsx`) re-reads `listPinnedForUser` on the next
 * request. Page-scope would miss the rail.
 */

function revalidateRailForWorkbench(workbenchId: string): void {
  if (!isWorkbenchId(workbenchId)) return
  revalidatePath(WORKBENCH_REVALIDATE_PATTERNS[workbenchId], "layout")
}

// ---------------------------------------------------------------------------
// pinRecordAction — INSERT (or no-op when already pinned)
// ---------------------------------------------------------------------------

export async function pinRecordAction(raw: unknown): Promise<PinRecordResult> {
  const session = await requireOrgSession()

  const parsed = pinRecordInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid pin input.",
    }
  }
  const input = parsed.data

  // Two pre-flight checks before INSERT. Both are cheap (indexed
  // lookups against the operator's pin set) and let the action return
  // a closed-set `code` instead of failing on a unique-index conflict
  // at write time.
  const [existing, currentCount] = await Promise.all([
    findExistingPin({
      organizationId: session.organizationId,
      userId: session.userId,
      workbenchId: input.workbenchId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    }),
    countPinsForUser({
      organizationId: session.organizationId,
      userId: session.userId,
      workbenchId: input.workbenchId,
    }),
  ])

  if (existing) {
    // Already pinned — surface the existing id so the UI can switch
    // the affordance from "Pin" to "Unpin" without a second round
    // trip. No DB write -> no audit row.
    return { ok: true, pinId: existing.id, alreadyPinned: true }
  }

  if (currentCount >= RAIL_PIN_LIMIT_PER_WORKBENCH) {
    return {
      ok: false,
      code: "limit_reached",
      message: `Pin limit reached (${RAIL_PIN_LIMIT_PER_WORKBENCH}). Unpin one first.`,
    }
  }

  const inserted = await insertPin({
    organizationId: session.organizationId,
    userId: session.userId,
    workbenchId: input.workbenchId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    label: input.label,
    href: input.href,
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.PIN_CREATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.PIN,
      resourceId: inserted.id,
      metadata: {
        workbenchId: input.workbenchId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        label: input.label,
        rank: inserted.rank,
      },
    })
  )
  revalidateRailForWorkbench(input.workbenchId)

  return { ok: true, pinId: inserted.id, alreadyPinned: false }
}

// ---------------------------------------------------------------------------
// unpinRecordAction — DELETE (IDOR-safe via .returning())
// ---------------------------------------------------------------------------

export async function unpinRecordAction(
  raw: unknown
): Promise<UnpinRecordResult> {
  const session = await requireOrgSession()

  const parsed = unpinRecordInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid unpin input.",
    }
  }
  const input = parsed.data

  const deleted = await deletePin({
    organizationId: session.organizationId,
    userId: session.userId,
    pinId: input.pinId,
  })

  if (!deleted) {
    return {
      ok: false,
      code: "not_found",
      message: "Pin not found or not yours.",
    }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.PIN_DELETE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.PIN,
      resourceId: deleted.id,
      metadata: {
        workbenchId: deleted.workbenchId,
        resourceType: deleted.resourceType,
        resourceId: deleted.resourceId,
        label: deleted.label,
      },
    })
  )
  revalidateRailForWorkbench(deleted.workbenchId)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// reorderPinsAction — full permutation only
// ---------------------------------------------------------------------------

export async function reorderPinsAction(
  raw: unknown
): Promise<ReorderPinsResult> {
  const session = await requireOrgSession()

  const parsed = reorderPinsInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid reorder input.",
    }
  }
  const input = parsed.data

  // Verify the input is a permutation of the operator's pin set in
  // this workbench. Two checks: (1) the input length matches the
  // current pin count; (2) the input id set matches the current id
  // set. The action returns `validation` for both because the
  // alternative — `reorderPins` silently no-op'ing — would surface as
  // a "successful no-op" to the client, masking the bug.
  const current = await listPinnedForUser({
    organizationId: session.organizationId,
    userId: session.userId,
    workbenchId: input.workbenchId,
  })
  if (current.length !== input.orderedPinIds.length) {
    return {
      ok: false,
      code: "validation",
      message: "Reorder must include every pin in this workbench.",
    }
  }
  const currentIds = new Set(current.map((row) => row.id))
  for (const id of input.orderedPinIds) {
    if (!currentIds.has(id)) {
      return {
        ok: false,
        code: "not_found",
        message: "Reorder references a pin that no longer exists.",
      }
    }
  }

  const result = await reorderPins({
    organizationId: session.organizationId,
    userId: session.userId,
    workbenchId: input.workbenchId,
    orderedPinIds: input.orderedPinIds,
  })

  if (result.updated === 0) {
    // The pre-flight checks above caught the obvious "input drifted"
    // cases; reaching here means a parallel mutation removed every
    // pin between the SELECT and the UPDATE. Rare enough to surface
    // as `not_found` so the UI can re-fetch and re-issue.
    return {
      ok: false,
      code: "not_found",
      message: "Pins changed during reorder; refresh and try again.",
    }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: RAIL_MEMORY_AUDIT_ACTIONS.PIN_REORDER,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: RAIL_MEMORY_RESOURCE_TYPES.PIN,
      resourceId: input.workbenchId,
      metadata: {
        workbenchId: input.workbenchId,
        count: result.updated,
        // Capture the new ordering so a future "pin audit timeline"
        // surface can reconstruct historical state without joining
        // back to the row.
        orderedPinIds: [...input.orderedPinIds],
      },
    })
  )
  revalidateRailForWorkbench(input.workbenchId)

  return { ok: true, count: result.updated }
}
