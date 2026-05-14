import "server-only"

import { getTranslations } from "next-intl/server"

import { parsePageHeaderData } from "#features/governed-surface"
import type { PageHeader } from "#features/governed-surface"

import { organizationHrmPath } from "../constants"

type HrmWorkbenchHeaderKeys = {
  /** When omitted, uses the HRM shell catalog `eyebrow` string (workforce kicker). */
  eyebrow?: string
  title: string
  description: string
}

type HrmWorkbenchHeaderNavOverride = {
  href: string
  label: string
}

/**
 * Shared governed header for HRM capability surfaces — eyebrow comes from the
 * HRM shell catalog; title/description from the caller’s namespace. Defaults
 * back to the HRM workbench root unless `navOverride` is supplied (e.g. landing
 * page returns to the ERP home).
 */
export async function buildGovernedHrmWorkbenchHeader(
  orgSlug: string,
  bodyNamespace: string,
  keys: HrmWorkbenchHeaderKeys,
  navOverride?: HrmWorkbenchHeaderNavOverride
): Promise<PageHeader> {
  const [tBody, tShell] = await Promise.all([
    // Call sites use `Dashboard.Hrm.*` namespaces from the message catalog; the
    // union of literal namespaces is too wide for next-intl’s generated keys.
    getTranslations(bodyNamespace as never),
    getTranslations("Dashboard.Hrm.shell"),
  ])
  const parsed = parsePageHeaderData({
    eyebrow: keys.eyebrow ? tBody(keys.eyebrow as never) : tShell("eyebrow"),
    title: tBody(keys.title as never),
    description: tBody(keys.description as never),
    backHref: navOverride?.href ?? organizationHrmPath(orgSlug, "overview"),
    backLabel: navOverride?.label ?? tShell("backToWorkspace"),
  })
  if (!parsed.success) {
    throw new Error(
      `buildGovernedHrmWorkbenchHeader: invalid header for ${bodyNamespace}`
    )
  }
  return parsed.data
}
