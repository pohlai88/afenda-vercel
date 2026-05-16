import { cn } from "#lib/utils"

import {
  parseStatCardConfiguration,
  type StatCardTone,
} from "#features/governed-surface/schemas/stat-card.schema"

const DELTA_TONE_CLASS: Record<StatCardTone, string> = {
  positive: "text-success",
  attention: "text-warning-foreground",
  default: "text-muted-foreground",
  critical: "text-destructive",
}

export type StatCardRendererProps = {
  configuration: unknown
}

/**
 * governed:stat-card — grid of KPI tiles (display-only).
 */
export function StatCardRenderer({ configuration }: StatCardRendererProps) {
  const parsed = parseStatCardConfiguration(configuration)
  if (!parsed.success) {
    return null
  }

  const { stats } = parsed.data

  return (
    <section aria-label="Statistics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <StatTile key={`${index}-${stat.label}`} stat={stat} />
        ))}
      </div>
    </section>
  )
}

function StatTile({
  stat,
}: {
  stat: { label: string; value: string; delta: string; tone: StatCardTone }
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-xs">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {stat.label}
      </span>
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        {stat.value}
      </span>
      <span className={cn("text-xs font-medium", DELTA_TONE_CLASS[stat.tone])}>
        {stat.delta}
      </span>
    </div>
  )
}
