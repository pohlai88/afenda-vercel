import { Link } from "#i18n/navigation"
import type { Route } from "next"

import type { OperationalPressureItem } from "./nexus.types"

/**
 * Single Operational Pressure row. Calm by default — the badge only lifts to
 * critical / emergency severity. No notification spam, no marketing energy.
 */
export type NexusPressureItemProps = {
  item: OperationalPressureItem
}

export function NexusPressureItem({ item }: NexusPressureItemProps) {
  return (
    <li className="flex flex-col gap-3 border-b border-border px-surface-lg py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2 text-xs">
          <SeverityBadge severity={item.severity} />
          <span className="text-muted-foreground">{item.surface}</span>
        </div>
        <div className="truncate text-sm font-medium text-foreground">
          {item.title}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {item.reason}
          {item.evidenceCount > 0
            ? ` · ${item.evidenceCount} evidence item${item.evidenceCount === 1 ? "" : "s"}`
            : ""}
        </div>
      </div>
      <Link
        href={item.primaryAction.command as Route}
        className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {item.primaryAction.label}
      </Link>
    </li>
  )
}

const SEVERITY_TONE: Record<OperationalPressureItem["severity"], string> = {
  emergency: "bg-destructive text-destructive-foreground",
  critical: "bg-destructive/10 text-destructive",
  attention: "bg-secondary text-secondary-foreground",
  ambient: "bg-muted text-muted-foreground",
}

const SEVERITY_LABEL: Record<OperationalPressureItem["severity"], string> = {
  emergency: "Emergency",
  critical: "Critical",
  attention: "Attention",
  ambient: "Ambient",
}

function SeverityBadge({
  severity,
}: {
  severity: OperationalPressureItem["severity"]
}) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${SEVERITY_TONE[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  )
}
