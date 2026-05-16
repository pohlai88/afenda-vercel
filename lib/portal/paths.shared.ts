import type { Route } from "next"

import type { AppPath } from "#lib/i18n/locales.shared"

import type { PortalAudience } from "./constants"
import { normalizePortalSlugParam } from "./slug.shared"

export function portalPath(
  portalSlug: string,
  audience?: PortalAudience
): Route {
  const normalized = normalizePortalSlugParam(portalSlug)
  if (!normalized) {
    throw new Error("portalPath: invalid portal slug")
  }

  return (
    audience ? `/p/${normalized}/${audience}` : `/p/${normalized}`
  ) as Route
}

export type EmployeePortalSection =
  | "leave"
  | "payslips"
  | "claims"
  | "benefits"
  | "attendance"
  | "documents"

export function employeePortalPath(
  portalSlug: string,
  section?: EmployeePortalSection
): Route {
  const normalized = normalizePortalSlugParam(portalSlug)
  if (!normalized) {
    throw new Error("employeePortalPath: invalid portal slug")
  }

  return (
    section
      ? `/p/${normalized}/employee/${section}`
      : `/p/${normalized}/employee`
  ) as Route
}

export function toLocalePortalRevalidatePattern(
  portalTail: string = ""
): AppPath {
  const tail =
    portalTail === "" || portalTail === "/"
      ? ""
      : portalTail.startsWith("/")
        ? portalTail
        : `/${portalTail}`
  return `/[locale]/p/[portalSlug]${tail}` as AppPath
}
