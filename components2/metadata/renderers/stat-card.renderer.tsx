import { Card, CardContent } from "#components2/ui/card"
import { GovernedEmpty } from "#features/governed-surface"
import {
  parseStatCardConfiguration,
  type StatCardDensity,
  type StatCardItem,
  type StatCardTone,
} from "#features/governed-surface/schemas/stat-card.schema"
import { cn } from "#lib/utils"

import type { GovernedComponentRendererDiagnostics } from "../registry"

/**
 * Maps the schema tone enum to design-token text colours.
 * Typed as `Record<StatCardTone, string>` so a new tone forces a compile error
 * here before runtime — see ADR-0025 §4.
 */
const DELTA_TONE_CLASS: Record<StatCardTone, string> = {
  positive: "text-success",
  attention: "text-warning-foreground",
  default: "text-muted-foreground",
  critical: "text-destructive",
}

/**
 * Container-relative grid breakpoints (ADR-0025 §1).
 *
 * `comfortable` fans out from 1 → 2 → 4 columns as the container widens.
 * `compact` caps at 2 columns, used for narrow rails (≤ ~500 px) and ≤ 2 tiles.
 *
 * The `@container` declaration on the outer `<section>` activates these
 * container-query breakpoints; viewport breakpoints (`sm:`, `md:`) are
 * forbidden here.
 */
const GRID_DENSITY_CLASS: Record<StatCardDensity, string> = {
  comfortable: "grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-4",
  compact: "grid grid-cols-1 gap-2 @sm:grid-cols-2",
}

/**
 * Per-tile inner spacing. Compact tiles trim padding to keep narrow rails
 * legible without truncation.
 */
const TILE_DENSITY_CLASS: Record<StatCardDensity, string> = {
  comfortable: "gap-1 p-4",
  compact: "gap-0.5 p-3",
}

export type StatCardRendererProps = {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}

/**
 * `governed:stat-card` — display-only KPI / snapshot tiles.
 *
 * Geometry is fully container-relative: the renderer is correct in any
 * placement that gives it ≥ 280 px of inline space (see
 * `AFENDA_GOVERNED_RENDERER_CONTRACTS["stat-card"].minContainerPx`).
 */
export function StatCardRenderer({
  configuration,
  diagnostics = "user",
}: StatCardRendererProps) {
  const parsed = parseStatCardConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Card unavailable",
          description:
            diagnostics === "operator"
              ? "The stat card configuration failed validation."
              : "This card could not be loaded safely.",
        }}
      />
    )
  }

  const { stats, density } = parsed.data

  return (
    <section aria-label="Statistics" className="@container">
      <div className={GRID_DENSITY_CLASS[density]}>
        {stats.map((stat, index) => (
          <StatTile
            key={`${index}-${stat.label}`}
            stat={stat}
            density={density}
          />
        ))}
      </div>
    </section>
  )
}

function StatTile({
  stat,
  density,
}: {
  stat: StatCardItem
  density: StatCardDensity
}) {
  return (
    <Card className="@container/tile">
      <CardContent
        className={cn("flex flex-col", TILE_DENSITY_CLASS[density])}
      >
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {stat.label}
        </span>
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {stat.value}
        </span>
        {stat.delta !== undefined ? (
          <span
            className={cn(
              "text-xs font-medium",
              DELTA_TONE_CLASS[stat.tone]
            )}
          >
            {stat.delta}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
