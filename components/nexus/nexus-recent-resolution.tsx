import { Card, CardHeader, CardTitle } from "#components/ui/card"

import { NexusResolutionStrip } from "./nexus-resolution-strip"
import type { ResolutionEvent } from "./nexus.types"

/**
 * Recent Resolution — Section E of the Nexus Field.
 *
 * Purpose: build trust that the system is alive. Shows resolved events with
 * evidence, actor, time, consequence. Material: opaque, with optional cognition
 * accent for Lynx-assisted resolutions.
 */
export type NexusRecentResolutionProps = {
  events: ResolutionEvent[]
}

export function NexusRecentResolution({ events }: NexusRecentResolutionProps) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Recent resolution</CardTitle>
      </CardHeader>
      {events.length === 0 ? (
        <div className="px-surface-lg pb-surface-lg text-sm text-muted-foreground">
          No resolutions yet.
        </div>
      ) : (
        <ul className="flex flex-col">
          {events.map((event) => (
            <NexusResolutionStrip key={event.id} event={event} />
          ))}
        </ul>
      )}
    </Card>
  )
}
