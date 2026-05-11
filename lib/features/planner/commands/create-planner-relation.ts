"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession, requireSignedInSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { createPlannerRelation } from "../data/planner.mutations.server"
import { createPlannerRelationFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function createPlannerRelationAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = createPlannerRelationFormSchema.safeParse({
    itemId: formData.get("itemId"),
    relationType: formData.get("relationType"),
    relatedItemId: formData.get("relatedItemId") || undefined,
    relatedSignalId: formData.get("relatedSignalId") || undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  if (scopeKind === "organization") {
    const session = await requireOrgSession()
    const created = await createPlannerRelation({
      scope: {
        scopeKind: "organization",
        organizationId: session.organizationId,
      },
      itemId: parsed.data.itemId,
      relationType: parsed.data.relationType,
      relatedItemId: parsed.data.relatedItemId,
      relatedSignalId: parsed.data.relatedSignalId,
      actorUserId: session.userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: buildPlannerAuditAction("relation", "create"),
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "planner_relation",
        resourceId: created.relationId,
        metadata: {
          itemId: parsed.data.itemId,
          relationType: parsed.data.relationType,
          relatedItemId: parsed.data.relatedItemId ?? null,
          relatedSignalId: parsed.data.relatedSignalId ?? null,
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
  const created = await createPlannerRelation({
    scope: { scopeKind: "personal", ownerUserId: session.userId },
    itemId: parsed.data.itemId,
    relationType: parsed.data.relationType,
    relatedItemId: parsed.data.relatedItemId,
    relatedSignalId: parsed.data.relatedSignalId,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("relation", "create"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_relation",
      resourceId: created.relationId,
      metadata: {
        itemId: parsed.data.itemId,
        relationType: parsed.data.relationType,
        relatedItemId: parsed.data.relatedItemId ?? null,
        relatedSignalId: parsed.data.relatedSignalId ?? null,
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
