import { Card, CardContent } from "#components/ui/card"

export type MarketplaceMetricStrip = {
  /** Capability id ("right.notifications", etc.). */
  capabilityId: string
  /** Display name (already localized — RSC translator owns lookup). */
  displayName: string
  /** Aggregated cohort metric ("12 users · 3 orgs"). `null` when below k. */
  primaryLabel: string | null
  /** Smaller secondary detail line ("3 orgs allowing"). `null` when below k. */
  secondaryLabel: string | null
}

export type MarketplaceMetricsStripProps = {
  /** Section title ("Adopted across Afenda"). */
  title: string
  /** Sentence shown when every metric is below the k-anonymity threshold. */
  emptyMessage: string
  /** Capability metrics in the desired display order (typically priority). */
  items: readonly MarketplaceMetricStrip[]
}

/**
 * Chain-wide adoption strip rendered on the Marketplace overview.
 *
 * Counts come from `getCapabilityChainMetrics` which gates each
 * aggregate behind k-anonymity. Capabilities with every metric below
 * the threshold render as inert (`—`) so we never leak per-org or
 * per-user existence.
 */
export function MarketplaceMetricsStrip({
  title,
  emptyMessage,
  items,
}: MarketplaceMetricsStripProps) {
  const visible = items.filter(
    (item) => item.primaryLabel !== null || item.secondaryLabel !== null
  )

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-foreground">
          {title}
        </h2>
      </header>

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.capabilityId}>
              <Card
                size="sm"
                className="rounded-lg border border-border/60 bg-background/90 shadow-none"
              >
                <CardContent className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span
                    aria-hidden
                    className="mt-1 size-2 rounded-full bg-info"
                  />
                  <p className="text-xs font-medium tracking-tight text-foreground">
                    {item.displayName}
                  </p>
                  <p className="col-start-2 text-sm text-foreground">
                    {item.primaryLabel ?? "—"}
                  </p>
                  {item.secondaryLabel ? (
                    <p className="col-start-2 text-[11px] text-muted-foreground">
                      {item.secondaryLabel}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
