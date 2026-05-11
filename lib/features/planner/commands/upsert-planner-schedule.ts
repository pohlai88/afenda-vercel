"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { schedulePlannerItem } from "../data/planner.mutations.server"
import { upsertPlannerScheduleFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function upsertPlannerScheduleAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = upsertPlannerScheduleFormSchema.safeParse({
    itemId: formData.get("itemId"),
    scheduleStartAt: formData.get("scheduleStartAt") ?? undefined,
    scheduledEndAt: formData.get("scheduledEndAt") ?? undefined,
    dueAt: formData.get("dueAt") ?? undefined,
    snoozedUntil: formData.get("snoozedUntil") ?? undefined,
    timeZone: formData.get("timeZone") ?? undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    await schedulePlannerItem({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
      scheduleStartAt: parsed.data.scheduleStartAt,
      scheduledEndAt: parsed.data.scheduledEndAt,
      dueAt: parsed.data.dueAt,
      snoozedUntil: parsed.data.snoozedUntil,
      timeZone: parsed.data.timeZone,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("item", "schedule"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_item",
        resourceId: parsed.data.itemId,
        metadata: {
          hasScheduleStartAt: Boolean(parsed.data.scheduleStartAt),
          hasDueAt: Boolean(parsed.data.dueAt),
          hasSnooze: Boolean(parsed.data.snoozedUntil),
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
  await schedulePlannerItem({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    itemId: parsed.data.itemId,
    scheduleStartAt: parsed.data.scheduleStartAt,
    scheduledEndAt: parsed.data.scheduledEndAt,
    dueAt: parsed.data.dueAt,
    snoozedUntil: parsed.data.snoozedUntil,
    timeZone: parsed.data.timeZone,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("item", "schedule"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_item",
      resourceId: parsed.data.itemId,
      metadata: {
        hasScheduleStartAt: Boolean(parsed.data.scheduleStartAt),
        hasDueAt: Boolean(parsed.data.dueAt),
        hasSnooze: Boolean(parsed.data.snoozedUntil),
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
