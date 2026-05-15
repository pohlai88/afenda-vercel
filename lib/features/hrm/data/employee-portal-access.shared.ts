import type { PortalContext } from "#lib/portal"
import { PORTAL_SLUG_MAX_LENGTH, normalizePortalSlugParam } from "#lib/portal"

export const EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR =
  "Employee portal access is unavailable."

export type EmployeePortalSubjectRow = {
  id: string
  employeeNumber: string
  legalName: string
  linkedUserId: string | null
  archivedAt: Date | null
}

export type EmployeePortalContext = {
  portal: PortalContext
  employee: EmployeePortalSubjectRow
}

export type EmployeePortalAccessSnapshot = {
  portalId: string | null
  portalSlug: string | null
  portalDisplayName: string | null
  accessId: string | null
  accessStatus: "active" | "revoked" | null
  accessUserId: string | null
}

export type EmployeePortalContextResolution =
  | { ok: true; context: EmployeePortalContext }
  | {
      ok: false
      reason:
        | "wrong_audience"
        | "missing_subject"
        | "employee_not_found"
        | "employee_archived"
        | "linked_user_mismatch"
    }

const PORTAL_SUFFIX = "-employee"

function compactOrgIdSuffix(organizationId: string): string {
  const compact = organizationId.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase()
  return compact.slice(0, 12) || "org"
}

function trimPortalSlugBase(base: string, suffixLength: number): string {
  const maxBaseLength = PORTAL_SLUG_MAX_LENGTH - suffixLength
  const trimmed = base.slice(0, maxBaseLength).replace(/[-_]+$/g, "")
  if (trimmed.length === 0) {
    throw new Error("employee portal slug base cannot be empty")
  }
  return trimmed
}

export function buildEmployeePortalSlugCandidates(input: {
  orgSlug: string
  organizationId: string
}): readonly [primary: string, fallback: string] {
  const normalizedOrgSlug = normalizePortalSlugParam(input.orgSlug)
  if (!normalizedOrgSlug) {
    throw new Error("employee portal slug: invalid organization slug")
  }

  const primaryBase = trimPortalSlugBase(
    normalizedOrgSlug,
    PORTAL_SUFFIX.length
  )
  const primary = `${primaryBase}${PORTAL_SUFFIX}`
  const suffix = `-employee-${compactOrgIdSuffix(input.organizationId)}`
  const fallbackBase = trimPortalSlugBase(normalizedOrgSlug, suffix.length)
  const fallback = `${fallbackBase}${suffix}`

  const normalizedPrimary = normalizePortalSlugParam(primary)
  const normalizedFallback = normalizePortalSlugParam(fallback)
  if (!normalizedPrimary || !normalizedFallback) {
    throw new Error("employee portal slug: could not build valid slug")
  }

  return [normalizedPrimary, normalizedFallback]
}

export function resolveEmployeePortalContextFromRows(input: {
  portal: PortalContext
  employee: EmployeePortalSubjectRow | null
}): EmployeePortalContextResolution {
  const { portal, employee } = input

  if (portal.portalAudience !== "employee") {
    return { ok: false, reason: "wrong_audience" }
  }
  if (!portal.subjectId) {
    return { ok: false, reason: "missing_subject" }
  }
  if (!employee || employee.id !== portal.subjectId) {
    return { ok: false, reason: "employee_not_found" }
  }
  if (employee.archivedAt) {
    return { ok: false, reason: "employee_archived" }
  }
  if (employee.linkedUserId && employee.linkedUserId !== portal.userId) {
    return { ok: false, reason: "linked_user_mismatch" }
  }

  return { ok: true, context: { portal, employee } }
}
