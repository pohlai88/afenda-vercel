"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { createPlannerLink } from "../data/planner.mutations.server"
import { createPlannerLinkFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function createPlannerLinkAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = createPlannerLinkFormSchema.safeParse({
    itemId: formData.get("itemId"),
    module: formData.get("module"),
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    displayLabel: formData.get("displayLabel"),
    href: formData.get("href") ?? undefined,
    causalityReason: formData.get("causalityReason") ?? undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const created = await createPlannerLink({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    itemId: parsed.data.itemId,
    module: parsed.data.module,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    displayLabel: parsed.data.displayLabel,
    href: parsed.data.href,
    causalityReason: parsed.data.causalityReason,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("link", "create"),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_link",
      resourceId: created.linkId,
      metadata: {
        itemId: parsed.data.itemId,
        module: parsed.data.module,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
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
