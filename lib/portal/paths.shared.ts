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
  | "advances"
  | "claims"
  | "benefits"
  | "training"
  | "attendance"
  | "documents"
  | "signatures"
  | "profile"
  | "performance"
  | "offboarding"

export type EmployeePortalProfileSection = "personal" | "emergency" | "banking"

export type CandidatePortalSection = "careers"

export function candidatePortalPath(
  portalSlug: string,
  section: CandidatePortalSection = "careers"
): Route {
  const normalized = normalizePortalSlugParam(portalSlug)
  if (!normalized) {
    throw new Error("candidatePortalPath: invalid portal slug")
  }

  return `/p/${normalized}/candidate/${section}` as Route
}

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

export function employeePortalProfilePath(
  portalSlug: string,
  section?: EmployeePortalProfileSection
): Route {
  const normalized = normalizePortalSlugParam(portalSlug)
  if (!normalized) {
    throw new Error("employeePortalProfilePath: invalid portal slug")
  }

  return (
    section
      ? `/p/${normalized}/employee/profile/${section}`
      : `/p/${normalized}/employee/profile`
  ) as Route
}

export function employeePortalPerformanceGoalPath(
  portalSlug: string,
  goalId: string
): Route {
  const normalized = normalizePortalSlugParam(portalSlug)
  if (!normalized) {
    throw new Error("employeePortalPerformanceGoalPath: invalid portal slug")
  }

  return `/p/${normalized}/employee/performance/goals/${goalId}` as Route
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
