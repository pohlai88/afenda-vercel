"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { acknowledgeOrgNotification } from "#features/org-notifications/server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { appendPlannerActivity } from "../data/planner.mutations.server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

const plannerNoticeActionFormSchema = z.object({
  noticeId: z.string().uuid(),
  itemId: z.string().uuid(),
})

export async function acknowledgePlannerNoticeAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = plannerNoticeActionFormSchema.safeParse({
    noticeId: formData.get("noticeId"),
    itemId: formData.get("itemId"),
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind !== "organization") {
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

  const session = await requireOrgSession()
  await acknowledgeOrgNotification({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    noticeId: parsed.data.noticeId,
  })
  await appendPlannerActivity({
    itemId: parsed.data.itemId,
    activityType: "notice_acknowledged",
    body: "Orbit notice acknowledged.",
    actorUserId: session.userId,
    metadata: {
      noticeId: parsed.data.noticeId,
    },
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "org.notification.acknowledge",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "org_notification_notice",
      resourceId: parsed.data.noticeId,
      metadata: {
        linkedPlannerItemId: parsed.data.itemId,
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
        status: "noticeAcknowledged",
        focusKind: "item",
        focusId: parsed.data.itemId,
      })
    )
  )
}
