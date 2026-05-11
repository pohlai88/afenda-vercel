"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { correlatePlannerSignalToExistingItem } from "../data/planner.mutations.server"
import { correlatePlannerSignalFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function correlatePlannerSignalAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "signals")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = correlatePlannerSignalFormSchema.safeParse({
    signalId: formData.get("signalId"),
    itemId: formData.get("itemId"),
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    const created = await correlatePlannerSignalToExistingItem({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      signalId: parsed.data.signalId,
      itemId: parsed.data.itemId,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("signal", "transition"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_signal",
        resourceId: parsed.data.signalId,
        metadata: {
          lifecycle: "correlated",
          itemId: parsed.data.itemId,
          relationId: created.relationId,
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
          status: "updatedSignal",
          focusKind: "signal",
          focusId: parsed.data.signalId,
        })
      )
    )
  }

  const session = await requireSignedInSession()
  const created = await correlatePlannerSignalToExistingItem({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    signalId: parsed.data.signalId,
    itemId: parsed.data.itemId,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("signal", "transition"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_signal",
      resourceId: parsed.data.signalId,
      metadata: {
        lifecycle: "correlated",
        itemId: parsed.data.itemId,
        relationId: created.relationId,
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
        status: "updatedSignal",
        focusKind: "signal",
        focusId: parsed.data.signalId,
      })
    )
  )
}
