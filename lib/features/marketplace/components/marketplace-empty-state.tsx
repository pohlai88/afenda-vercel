import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "#components/ui/empty"

export type MarketplaceEmptyStateProps = {
  title: string
  description: string
  /** Optional CTAs (e.g. a "Back to overview" link). */
  children?: ReactNode
}

/**
 * Calm empty-state for non-Utilities marketplace categories.
 *
 * Shown by `/marketplace/[category]` for `plugins | mcp | integrations |
 * automations | operators | surfaces`. The category exists in the
 * registry contract (so future capabilities can be added without a
 * route migration), but the Marketplace v1 ships only Utilities.
 */
export function MarketplaceEmptyState({
  title,
  description,
  children,
}: MarketplaceEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  )
}
