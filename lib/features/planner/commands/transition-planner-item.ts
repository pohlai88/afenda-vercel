"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { transitionPlannerItemFormSchema } from "../domain/planner.schemas"
import { transitionPlannerItemLifecycle } from "../data/planner.mutations.server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function transitionPlannerItemAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = transitionPlannerItemFormSchema.safeParse({
    itemId: formData.get("itemId"),
    lifecycle: formData.get("lifecycle"),
    correlatedSignalPolicy: formData.get("correlatedSignalPolicy") || undefined,
    closeActiveNotices: formData.get("closeActiveNotices"),
    resolutionNote: formData.get("resolutionNote") || undefined,
  })
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    await transitionPlannerItemLifecycle({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
      lifecycle: parsed.data.lifecycle,
      actorUserId: session.userId,
      correlatedSignalPolicy: parsed.data.correlatedSignalPolicy,
      closeActiveNotices: parsed.data.closeActiveNotices,
      resolutionNote: parsed.data.resolutionNote,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("item", "transition"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_item",
        resourceId: parsed.data.itemId,
        metadata: {
          lifecycle: parsed.data.lifecycle,
          correlatedSignalPolicy: parsed.data.correlatedSignalPolicy ?? null,
          closeActiveNotices: parsed.data.closeActiveNotices ?? false,
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
          status: "updatedItem",
          focusKind: "item",
          focusId: parsed.data.itemId,
        })
      )
    )
  }

  const session = await requireSignedInSession()
  await transitionPlannerItemLifecycle({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    itemId: parsed.data.itemId,
    lifecycle: parsed.data.lifecycle,
    actorUserId: session.userId,
    correlatedSignalPolicy: parsed.data.correlatedSignalPolicy,
    closeActiveNotices: parsed.data.closeActiveNotices,
    resolutionNote: parsed.data.resolutionNote,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("item", "transition"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_item",
      resourceId: parsed.data.itemId,
      metadata: {
        lifecycle: parsed.data.lifecycle,
        correlatedSignalPolicy: parsed.data.correlatedSignalPolicy ?? null,
        closeActiveNotices: parsed.data.closeActiveNotices ?? false,
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
        status: "updatedItem",
        focusKind: "item",
        focusId: parsed.data.itemId,
      })
    )
  )
}
