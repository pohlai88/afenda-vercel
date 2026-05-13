"use client"

import { Store } from "lucide-react"
import { useTranslations } from "next-intl"

import { marketplaceRoute } from "#features/marketplace/client"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

/**
 * L1 utility-bar marketplace icon.
 *
 * Now a top-level entrypoint into `/{locale}/marketplace` (the
 * Capability Registry surface). Visible to every operator —
 * personal preferences are first-class, governance is gated inside
 * the marketplace's `admin` route.
 */
export function WorkbenchUtilityMarketplaceLink() {
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const tShell = useTranslations("Marketplace.overview")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={marketplaceRoute()}
      ariaLabel={tShell("title")}
      tooltip={tBar("marketplaceTooltip")}
    >
      <Store className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
