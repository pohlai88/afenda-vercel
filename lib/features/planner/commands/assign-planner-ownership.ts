"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { publishOrgNotification } from "#features/org-notifications/server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { organizationOrbitPath } from "../constants"
import { assignPlannerOwnership } from "../data/planner.mutations.server"
import { assignPlannerOwnershipFormSchema } from "../domain/planner.schemas"
import { buildPlannerAssignmentNotice } from "../policies/planner-notification-policy.shared"
import { getPlannerItemNotificationContext } from "../server"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function assignPlannerOwnershipAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = assignPlannerOwnershipFormSchema.safeParse({
    itemId: formData.get("itemId"),
    role: formData.get("role"),
    subjectUserId: formData.get("subjectUserId") ?? undefined,
    subjectLabel: formData.get("subjectLabel") ?? undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    const itemContext = await getPlannerItemNotificationContext({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
    })
    await assignPlannerOwnership({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
      role: parsed.data.role,
      subjectUserId: parsed.data.subjectUserId,
      subjectLabel: parsed.data.subjectLabel,
      actorUserId: session.userId,
    })

    if (
      parsed.data.subjectUserId &&
      parsed.data.subjectUserId !== session.userId &&
      (parsed.data.role === "assignee" ||
        parsed.data.role === "reviewer" ||
        parsed.data.role === "escalation_owner")
    ) {
      const targetUserId = parsed.data.subjectUserId
      const notice = buildPlannerAssignmentNotice({
        role: parsed.data.role,
        itemTitle: itemContext?.title ?? "Execution item",
        itemDescription: itemContext?.description ?? null,
      })
      await publishOrgNotification({
        organizationId: session.organizationId,
        targetUserId,
        title: notice.title,
        body: notice.body,
        severity: notice.severity,
        linkedEntityType: "planner_item",
        linkedEntityId: parsed.data.itemId,
        linkedEntityLabel: itemContext?.title ?? parsed.data.itemId,
        linkedPath: orgSlug
          ? `${organizationOrbitPath(orgSlug)}?focusKind=item&focusId=${parsed.data.itemId}`
          : null,
      })
    }

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("assignment", "assign"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_assignment",
        resourceId: parsed.data.itemId,
        metadata: {
          role: parsed.data.role,
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
          status: "updatedItem",
          focusKind: "item",
          focusId: parsed.data.itemId,
        })
      )
    )
  }

  const session = await requireSignedInSession()
  await assignPlannerOwnership({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    itemId: parsed.data.itemId,
    role: parsed.data.role,
    subjectUserId: parsed.data.subjectUserId,
    subjectLabel: parsed.data.subjectLabel,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("assignment", "assign"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_assignment",
      resourceId: parsed.data.itemId,
      metadata: {
        role: parsed.data.role,
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
        status: "updatedItem",
        focusKind: "item",
        focusId: parsed.data.itemId,
      })
    )
  )
}
