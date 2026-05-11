"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { startPlannerSessionFormSchema } from "../domain/planner.schemas"
import { startPlannerSession } from "../data/planner.mutations.server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function startPlannerSessionAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "sessions")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = startPlannerSessionFormSchema.safeParse({
    itemId: formData.get("itemId") || undefined,
  })
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    const started = await startPlannerSession({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("session", "start"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_session",
        resourceId: started.id,
        metadata: {
          itemId: parsed.data.itemId ?? null,
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
          surface: "sessions",
          status: "startedSession",
          focusKind: "session",
          focusId: started.id,
        })
      )
    )
  }

  const session = await requireSignedInSession()
  const started = await startPlannerSession({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    itemId: parsed.data.itemId,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("session", "start"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_session",
      resourceId: started.id,
      metadata: {
        itemId: parsed.data.itemId ?? null,
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
        surface: "sessions",
        status: "startedSession",
        focusKind: "session",
        focusId: started.id,
      })
    )
  )
}
