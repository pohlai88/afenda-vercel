"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { isOrbitAdvancedOperatorControlsEnabled } from "#flags"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import {
  batchAssignPlannerOwnership,
  batchTransitionPlannerItemsLifecycle,
} from "../data/planner.mutations.server"
import { batchPlannerQueueItemsActionFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  revalidateOrbitScope,
} from "./planner-action.shared"

function parseBatchPlannerQueueItemsForm(formData: FormData) {
  return batchPlannerQueueItemsActionFormSchema.safeParse({
    operation: formData.get("operation"),
    itemIds: formData.getAll("itemIds"),
    subjectUserId: formData.get("subjectUserId") ?? undefined,
    subjectLabel: formData.get("subjectLabel") ?? undefined,
    surface: formData.get("surface"),
  })
}

function batchQueueAuditShape(operation: string) {
  if (operation === "assign_items") {
    return {
      action: buildPlannerAuditAction("assignment", "assign"),
      resourceType: "planner_assignment",
    } as const
  }
  return {
    action: buildPlannerAuditAction("item", "transition"),
    resourceType: "planner_item",
  } as const
}

export async function batchPlannerQueueItemsAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()
  const surfaceRaw = String(formData.get("surface") ?? "queue")
  const surface =
    surfaceRaw === "today" || surfaceRaw === "timeline" ? surfaceRaw : "queue"

  if (!(await isOrbitAdvancedOperatorControlsEnabled())) {
    redirect(
      toLocalePath(
        locale,
        orbitStatusPath({
          scopeKind,
          orgSlug,
          surface,
          status: "featureDisabled",
        })
      )
    )
  }

  const parsed = parseBatchPlannerQueueItemsForm(formData)
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const parsedSurface = parsed.data.surface

  const session = await requireOrgSession()
  const scope = {
    scopeKind: "organization" as const,
    organizationId: session.organizationId,
  }

  switch (parsed.data.operation) {
    case "activate_items":
      await batchTransitionPlannerItemsLifecycle({
        scope,
        itemIds: parsed.data.itemIds,
        lifecycle: "active",
        actorUserId: session.userId,
      })
      break
    case "block_items":
      await batchTransitionPlannerItemsLifecycle({
        scope,
        itemIds: parsed.data.itemIds,
        lifecycle: "blocked",
        actorUserId: session.userId,
      })
      break
    case "ready_items":
      await batchTransitionPlannerItemsLifecycle({
        scope,
        itemIds: parsed.data.itemIds,
        lifecycle: "ready_for_review",
        actorUserId: session.userId,
      })
      break
    case "verify_items":
      await batchTransitionPlannerItemsLifecycle({
        scope,
        itemIds: parsed.data.itemIds,
        lifecycle: "verified",
        actorUserId: session.userId,
      })
      break
    case "assign_items":
      await batchAssignPlannerOwnership({
        scope,
        itemIds: parsed.data.itemIds,
        role: "assignee",
        subjectUserId: parsed.data.subjectUserId,
        subjectLabel: parsed.data.subjectLabel,
        actorUserId: session.userId,
      })
      break
    default:
      throw new Error("Unsupported planner queue batch operation")
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      ...batchQueueAuditShape(parsed.data.operation),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceId: parsed.data.itemIds[0] ?? parsed.data.operation,
      metadata: {
        batch: true,
        operation: parsed.data.operation,
        surface: parsedSurface,
        itemCount: parsed.data.itemIds.length,
        subjectUserId: parsed.data.subjectUserId ?? null,
        subjectLabel: parsed.data.subjectLabel ?? null,
      },
    })
  )

  revalidateOrbitScope(scopeKind)
  redirect(
    toLocalePath(
      locale,
      orbitStatusPath({
        scopeKind,
        orgSlug,
        surface: parsedSurface,
        status: "batchUpdated",
      })
    )
  )
}
