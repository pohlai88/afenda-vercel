import "server-only"

import type { Route } from "next"

import { getOrganizationSlugById } from "#lib/org-slug.server"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/** Same-origin locale-internal path under `/o/{orgSlug}/…` (hidden form input). */
function trustedOrgScopedResumePath(raw: unknown): Route | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return null
  if (t.includes("\n") || t.includes("\r")) return null
  const parts = t.split("/").filter(Boolean)
  if (parts[0] !== "o" || !parts[1]) return null
  return t as Route
}

/**
 * Resume path for step-up after org OneThing admin flows.
 * Prefer a validated hidden-field path; otherwise active org slug → dashboard OneThing.
 */
export async function resolveOrgOneThingAdminStepUpResumePath(
  formData: FormData,
  organizationId: string
): Promise<Route> {
  const fromForm = trustedOrgScopedResumePath(formData.get("resumePath"))
  if (fromForm) return fromForm

  const slug = await getOrganizationSlugById(organizationId)
  const normalized = slug ? normalizeOrgSlugParam(slug) : null
  if (normalized) {
    return `/o/${normalized}/dashboard/onething` as Route
  }
  return "/console" as Route
}
