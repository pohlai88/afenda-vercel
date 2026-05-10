import { NexusOperationalPressure } from "./nexus-operational-pressure"
import { NexusOrientationBand } from "./nexus-orientation-band"
import { NexusPriorityLanes } from "./nexus-priority-lanes"
import { NexusRecentResolution } from "./nexus-recent-resolution"
import { NexusTruthMap } from "./nexus-truth-map"
import type { NexusSnapshot } from "./nexus.types"

/**
 * Nexus Field — five sections in intentional reading order (orientation → pressure
 * → surfaces map → actionable lanes → recent closure). Reordering changes IA.
 */
export type NexusFieldProps = {
  snapshot: NexusSnapshot
}

export function NexusField({ snapshot }: NexusFieldProps) {
  return (
    <div className="flex flex-col gap-6">
      <NexusOrientationBand
        org={snapshot.org}
        operator={snapshot.operator}
        readiness={snapshot.readiness}
      />
      <NexusOperationalPressure items={snapshot.pressure} />
      <NexusTruthMap surfaces={snapshot.surfaces} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NexusPriorityLanes lanes={snapshot.priorityLanes} />
        <NexusRecentResolution events={snapshot.recentResolutions} />
      </div>
    </div>
  )
}
