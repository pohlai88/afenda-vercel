"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { upsertPlannerRecurrence } from "../data/planner.mutations.server"
import { upsertPlannerRecurrenceFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function upsertPlannerRecurrenceAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = upsertPlannerRecurrenceFormSchema.safeParse({
    itemId: formData.get("itemId"),
    rrule: formData.get("rrule"),
    timeZone: formData.get("timeZone") ?? undefined,
    nextRunAt: formData.get("nextRunAt") ?? undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const updated = await upsertPlannerRecurrence({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    itemId: parsed.data.itemId,
    rrule: parsed.data.rrule,
    timeZone: parsed.data.timeZone,
    nextRunAt: parsed.data.nextRunAt,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("recurrence", "upsert"),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_recurrence",
      resourceId: updated.recurrenceId,
      metadata: { itemId: parsed.data.itemId, rrule: parsed.data.rrule },
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
