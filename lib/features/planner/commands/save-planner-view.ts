"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { upsertPlannerView } from "../data/planner.mutations.server"
import {
  parsePlannerViewFilterJson,
  savePlannerViewFormSchema,
} from "../domain/planner.schemas"
import {
  orbitScopedPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function savePlannerViewAction(formData: FormData): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = savePlannerViewFormSchema.safeParse({
    viewId: formData.get("viewId") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    surface: formData.get("surface"),
    filterState: formData.get("filterState"),
    sortMode: formData.get("sortMode") || undefined,
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const filterState = parsePlannerViewFilterJson(parsed.data.filterState)
  if (!filterState) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const row = await upsertPlannerView({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    viewId: parsed.data.viewId,
    slug: parsed.data.slug,
    name: parsed.data.name,
    surface: parsed.data.surface,
    filterState,
    sortMode: parsed.data.sortMode,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("view", "upsert"),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_view",
      resourceId: row.id,
      metadata: {
        surface: parsed.data.surface,
        slug: row.slug,
      },
    })
  )

  revalidateOrbitScope(scopeKind)
  const href = orbitScopedPath({
    scopeKind,
    orgSlug,
    surface: parsed.data.surface,
  })
  redirect(toLocalePath(locale, `${href}?view=${row.slug}&status=savedView`))
}
