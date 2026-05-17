import type { ReactNode } from "react"

import { AppShellSurface } from "#app-shell"

import {
  MarketplaceCategoryNav,
  type MarketplaceCategoryNavItem,
} from "./marketplace-category-nav"

export type MarketplaceShellProps = {
  /** Page title rendered inside the surface intro. */
  title: string
  /** Subtitle / lede paragraph. */
  subtitle: string
  /** Sticky breadcrumb chain for the surface chrome. */
  breadcrumbs?: ReadonlyArray<{ label: string; href?: string }>
  /** Right-aligned slot in the sticky chrome (view switcher, etc.). */
  headerActions?: ReactNode
  /** Category nav rendered above the page body. */
  nav: {
    ariaLabel: string
    activePath: string
    comingSoonLabel: string
    items: readonly MarketplaceCategoryNavItem[]
  }
  children: ReactNode
}

/**
 * Marketplace surface scaffold — pulls the per-page AppShellSurface
 * mount + category nav into one composition primitive so each
 * marketplace route stays focused on its own content.
 *
 * Pure RSC; the only client islands inside its subtree are the toggle
 * buttons, the view switcher, and the detail dialog.
 */
export function MarketplaceShell({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  nav,
  children,
}: MarketplaceShellProps) {
  return (
    <AppShellSurface
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs ? Array.from(breadcrumbs) : undefined}
      headerActions={headerActions}
    >
      <div className="flex flex-col gap-6">
        <MarketplaceCategoryNav
          ariaLabel={nav.ariaLabel}
          activePath={nav.activePath}
          comingSoonLabel={nav.comingSoonLabel}
          items={nav.items}
        />
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </AppShellSurface>
  )
}
