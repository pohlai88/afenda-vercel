"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { createPlannerSignalFormSchema } from "../domain/planner.schemas"
import { insertPlannerSignal } from "../data/planner.mutations.server"
import {
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function createPlannerSignalAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = createPlannerSignalFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    signalClass: formData.get("signalClass") ?? "manual_capture",
  })

  if (!parsed.success) {
    redirect(
      toLocalePath(
        locale,
        orbitStatusPath({
          scopeKind,
          orgSlug,
          surface,
          status: "invalidInput",
        })
      )
    )
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    const row = await insertPlannerSignal({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      title: parsed.data.title,
      description: parsed.data.description,
      signalClass: parsed.data.signalClass,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("signal", "create"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_signal",
        resourceId: row.id,
        metadata: {
          scopeKind,
          signalClass: parsed.data.signalClass,
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
          status: "createdSignal",
          focusKind: "signal",
          focusId: row.id,
        })
      )
    )
  }

  const session = await requireSignedInSession()
  const row = await insertPlannerSignal({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    title: parsed.data.title,
    description: parsed.data.description,
    signalClass: parsed.data.signalClass,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("signal", "create"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_signal",
      resourceId: row.id,
      metadata: {
        scopeKind,
        signalClass: parsed.data.signalClass,
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
        status: "createdSignal",
        focusKind: "signal",
        focusId: row.id,
      })
    )
  )
}
