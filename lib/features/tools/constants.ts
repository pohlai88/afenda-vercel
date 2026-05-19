import type { Route } from "next"

import { ORG_APPS_HRM, ORG_APPS_HRM_IMPORTS } from "#lib/org-apps-module-paths"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"

const ORG_APPS_HRM_SIGNATURES = "/hrm/signatures" as const

function toolsOrgHrmPath(orgSlug: string, tail: string): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("toolsOrgHrmPath: invalid org slug")
  }
  return `/o/${slug}/dashboard${tail}` as Route
}

/** Locale-internal HRM signatures list (`/dashboard/hrm/signatures`). */
export function toolsSignaturesPath(orgSlug: string): Route {
  return toolsOrgHrmPath(orgSlug, ORG_APPS_HRM_SIGNATURES)
}

export function toolsSignatureRequestPath(
  orgSlug: string,
  publicSlug: string
): Route {
  return `${toolsSignaturesPath(orgSlug)}/${publicSlug}` as Route
}

/** Locale-internal HRM bulk import surface (`/dashboard/hrm/imports`). */
export function toolsImportsPath(orgSlug: string): Route {
  return toolsOrgHrmPath(orgSlug, ORG_APPS_HRM_IMPORTS)
}

/** HRM workbench root for back-navigation from tools surfaces. */
export function toolsHrmWorkbenchPath(orgSlug: string): Route {
  return toolsOrgHrmPath(orgSlug, ORG_APPS_HRM)
}

/** Portal ceremony deep link (`/p/{portalSlug}/employee/signatures/{token}`). */
export function toolsSignatureCeremonyPath(
  portalSlug: string,
  partyToken: string
): string {
  return `/p/${portalSlug}/employee/signatures/${partyToken}`
}

export { ORG_APPS_HRM_IMPORTS }
