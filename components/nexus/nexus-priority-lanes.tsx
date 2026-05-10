import { Link } from "#i18n/navigation"
import type { Route } from "next"

import { Card, CardHeader, CardTitle } from "#components/ui/card"

import type { PriorityLane } from "./nexus.types"

/**
 * Priority Lanes — Section D of the Nexus Field.
 *
 * Answers: "What needs action now?"
 * These are not random tasks — they are system-ranked operational lanes
 * (approvals, evidence gaps, vendor blockers, ...). Use opaque material — dense lists and actions.
 */
export type NexusPriorityLanesProps = {
  lanes: PriorityLane[]
}

export function NexusPriorityLanes({ lanes }: NexusPriorityLanesProps) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Priority lanes</CardTitle>
      </CardHeader>
      {lanes.length === 0 ? (
        <div className="px-surface-lg pb-surface-lg text-sm text-muted-foreground">
          No active lanes.
        </div>
      ) : (
        <ul className="flex flex-col">
          {lanes.map((lane) => (
            <li
              key={lane.id}
              className="flex items-center justify-between gap-3 border-b border-border px-surface-lg py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {lane.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lane.surface}
                </span>
              </div>
              <Link
                href={lane.href as Route}
                className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {lane.count} open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
