import type { Route } from "next"

import { ORG_ADMIN_PATH_SEGMENTS } from "#lib/i18n/org-apps-path.shared"
import {
  ORG_APPS_MODULES,
  type OrgAppsModule,
} from "#lib/i18n/org-apps-path.shared"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"

const PROFILE_PATH_SEGMENTS = new Set(["identity", "security"])

/**
 * Locale-internal pathname for org admin (`localePrefix: "always"`).
 * Client-safe — use from app shell instead of `#features/org-admin` barrel.
 */
export function organizationAdminPath(
  orgSlug: string,
  section: "overview" | string
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationAdminPath: invalid org slug")
  }
  const base = `/o/${slug}/admin`
  if (section === "overview") {
    return base as Route
  }
  if (!ORG_ADMIN_PATH_SEGMENTS.has(section)) {
    throw new Error(`organizationAdminPath: unknown admin segment "${section}"`)
  }
  return `${base}/${section}` as Route
}

/** Locale-internal pathname for org-scoped member IAM profile (`/o/{slug}/iam-profile/...`). */
export function organizationIamProfilePath(
  orgSlug: string,
  section: "overview" | "identity" | "security" | string = "overview"
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationIamProfilePath: invalid org slug")
  }
  const base = `/o/${slug}/iam-profile`
  if (section === "overview") {
    return base as Route
  }
  if (!PROFILE_PATH_SEGMENTS.has(section)) {
    throw new Error(
      `organizationIamProfilePath: unknown profile segment "${section}"`
    )
  }
  return `${base}/${section}` as Route
}

/** Tail segment for org HRM app (`revalidatePath` / tags). */
export const ORG_APPS_HRM = "/hrm" as const

export const ORG_APPS_HRM_EMPLOYEES = "/hrm/employees" as const

export const ORG_APPS_HRM_EMPLOYEE_DETAIL =
  "/hrm/employees/[employeeId]" as const

export const ORG_APPS_HRM_COMPLIANCE_DETAIL =
  "/hrm/compliance/[evidenceId]" as const

export const ORG_APPS_HRM_CLAIMS = "/hrm/claims" as const
export const ORG_APPS_HRM_CLAIM_DETAIL = "/hrm/claims/[claimId]" as const
export const ORG_APPS_HRM_IMPORTS = "/hrm/imports" as const
export const ORG_APPS_HRM_RECRUITMENT = "/hrm/recruitment" as const
export const ORG_APPS_HRM_ORGANIZATION = "/hrm/organization" as const
export const ORG_APPS_HRM_ONBOARDING = "/hrm/onboarding" as const
export const ORG_APPS_HRM_PERFORMANCE = "/hrm/performance" as const
export const ORG_APPS_HRM_KPI = "/hrm/kpi" as const
export const ORG_APPS_HRM_TRAINING = "/hrm/training" as const
export const ORG_APPS_HRM_ADVANCES = "/hrm/advances" as const

/**
 * Locale-internal pathname for an org-scoped ERP app URL.
 * `"home"` → Nexus field (`/o/{slug}/nexus`).
 *
 * @see docs/decisions/0029-org-apps-url-model.md
 */
export function organizationAppsPath(
  orgSlug: string,
  modulePath: OrgAppsModule | "home"
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationAppsPath: invalid org slug")
  }
  if (modulePath === "home") {
    return `/o/${slug}/nexus` as Route
  }
  return `/o/${slug}/apps/${modulePath}` as Route
}

/** ERP module order under `/o/{slug}/apps` (excludes Nexus `home`). */
export const APPS_NAV_MODULES = [...ORG_APPS_MODULES] as const satisfies ReadonlyArray<
  Exclude<Parameters<typeof organizationAppsPath>[1], "home">
>

export type AppsNavModule = (typeof APPS_NAV_MODULES)[number]

export const ORG_APPS_CONTACTS = "/contacts" as const
export const ORG_APPS_ORBIT = "/orbit" as const
export const ORG_APPS_KNOWLEDGE = "/knowledge" as const
export const ORG_APPS_LYNX = "/lynx" as const
export const ORG_APPS_SALE = "/sale" as const
export const ORG_APPS_PURCHASE = "/purchase" as const
export const ORG_APPS_INVENTORY = "/inventory" as const
export const ORG_APPS_ACCOUNTING = "/accounting" as const
