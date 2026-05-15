"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { isOrbitAdvancedOperatorControlsEnabled } from "#flags"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import {
  batchAssignPlannerOwnership,
  batchPromotePlannerSignalsToItems,
  batchTransitionPlannerItemsLifecycle,
  batchTransitionPlannerSignalsLifecycle,
} from "../data/planner.mutations.server"
import { batchPlannerTriageActionFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

function parseBatchPlannerTriageForm(formData: FormData) {
  return batchPlannerTriageActionFormSchema.safeParse({
    operation: formData.get("operation"),
    signalIds: formData.getAll("signalIds"),
    itemIds: formData.getAll("itemIds"),
    subjectUserId: formData.get("subjectUserId") ?? undefined,
    subjectLabel: formData.get("subjectLabel") ?? undefined,
  })
}

function batchAuditShape(operation: string) {
  if (operation === "assign_items") {
    return {
      action: buildPlannerAuditAction("assignment", "assign"),
      resourceType: "planner_assignment",
    } as const
  }
  if (operation === "promote_signals") {
    return {
      action: buildPlannerAuditAction("signal", "promote"),
      resourceType: "planner_signal",
    } as const
  }
  if (operation === "defer_signals" || operation === "suppress_signals") {
    return {
      action: buildPlannerAuditAction("signal", "transition"),
      resourceType: "planner_signal",
    } as const
  }
  return {
    action: buildPlannerAuditAction("item", "transition"),
    resourceType: "planner_item",
  } as const
}

export async function batchPlannerTriageAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "triage")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

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

  const parsed = parseBatchPlannerTriageForm(formData)
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const scope = {
    scopeKind: "organization" as const,
    organizationId: session.organizationId,
  }

  switch (parsed.data.operation) {
    case "promote_signals":
      await batchPromotePlannerSignalsToItems({
        scope,
        signalIds: parsed.data.signalIds,
        actorUserId: session.userId,
      })
      break
    case "defer_signals":
      await batchTransitionPlannerSignalsLifecycle({
        scope,
        signalIds: parsed.data.signalIds,
        lifecycle: "deferred",
        actorUserId: session.userId,
      })
      break
    case "suppress_signals":
      await batchTransitionPlannerSignalsLifecycle({
        scope,
        signalIds: parsed.data.signalIds,
        lifecycle: "suppressed",
        actorUserId: session.userId,
      })
      break
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
      throw new Error("Unsupported planner batch operation")
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      ...batchAuditShape(parsed.data.operation),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceId:
        parsed.data.itemIds[0] ??
        parsed.data.signalIds[0] ??
        parsed.data.operation,
      metadata: {
        batch: true,
        operation: parsed.data.operation,
        itemCount: parsed.data.itemIds.length,
        signalCount: parsed.data.signalIds.length,
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
        surface,
        status: "batchUpdated",
      })
    )
  )
}
