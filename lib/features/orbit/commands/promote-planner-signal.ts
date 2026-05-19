"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { promotePlannerSignalFormSchema } from "../domain/planner.schemas"
import { promotePlannerSignalToItem } from "../data/planner.mutations.server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function promotePlannerSignalAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "signals")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = promotePlannerSignalFormSchema.safeParse({
    signalId: formData.get("signalId"),
  })
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const promoted = await promotePlannerSignalToItem({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    signalId: parsed.data.signalId,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("signal", "promote"),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_signal",
      resourceId: parsed.data.signalId,
      metadata: {
        promotedItemId: promoted.itemId,
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
        surface: "queue",
        status: "promotedSignal",
        focusKind: "item",
        focusId: promoted.itemId,
      })
    )
  )
}
