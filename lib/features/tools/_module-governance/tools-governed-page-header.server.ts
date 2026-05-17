import "server-only"

import { getTranslations } from "next-intl/server"

import { parsePageHeaderData } from "#features/governed-surface"
import type { PageHeader } from "#features/governed-surface"

import { toolsHrmWorkbenchPath } from "../constants"

type ToolsWorkbenchHeaderKeys = {
  eyebrow?: string
  title: string
  description: string
  /** Pre-resolved copy when the message needs interpolation (avoids dynamic-namespace t() typing). */
  titleLiteral?: string
  descriptionLiteral?: string
}

type ToolsWorkbenchHeaderNavOverride = {
  href: string
  /** Literal back label (overrides `labelKey`). */
  label?: string
  /** Message key resolved from `bodyNamespace` when `label` is omitted. */
  labelKey?: string
}

export async function buildGovernedToolsWorkbenchHeader(
  orgSlug: string,
  bodyNamespace: string,
  keys: ToolsWorkbenchHeaderKeys,
  navOverride?: ToolsWorkbenchHeaderNavOverride
): Promise<PageHeader> {
  const [tBody, tShell] = await Promise.all([
    getTranslations(bodyNamespace as never),
    getTranslations("Dashboard.Hrm.shell"),
  ])
  const parsed = parsePageHeaderData({
    eyebrow: keys.eyebrow ? tBody(keys.eyebrow as never) : tShell("eyebrow"),
    title: keys.titleLiteral ?? tBody(keys.title as never),
    description: keys.descriptionLiteral ?? tBody(keys.description as never),
    backHref: navOverride?.href ?? toolsHrmWorkbenchPath(orgSlug),
    backLabel:
      navOverride?.label ??
      (navOverride?.labelKey
        ? tBody(navOverride.labelKey as never)
        : tShell("backToWorkspace")),
  })
  if (!parsed.success) {
    throw new Error(
      `buildGovernedToolsWorkbenchHeader: invalid header for ${bodyNamespace}`
    )
  }
  return parsed.data
}
