"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { stopPlannerSessionFormSchema } from "../domain/planner.schemas"
import { stopPlannerSession } from "../data/planner.mutations.server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function stopPlannerSessionAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "sessions")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = stopPlannerSessionFormSchema.safeParse({
    sessionId: formData.get("sessionId"),
  })
  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    await stopPlannerSession({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      sessionId: parsed.data.sessionId,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("session", "stop"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_session",
        resourceId: parsed.data.sessionId,
        metadata: null,
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
          status: "stoppedSession",
        })
      )
    )
  }

  const session = await requireSignedInSession()
  await stopPlannerSession({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    sessionId: parsed.data.sessionId,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("session", "stop"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_session",
      resourceId: parsed.data.sessionId,
      metadata: null,
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
        status: "stoppedSession",
      })
    )
  )
}
