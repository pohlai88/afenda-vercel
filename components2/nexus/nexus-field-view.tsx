import { GovernedComponentRenderer } from "#components2/metadata"
import { Card, CardHeader, CardTitle } from "#components2/ui/card"
import type { NexusListSurfaceBundle, NexusSnapshot } from "#features/nexus"
import {
  NEXUS_PRESSURE_SURFACE_KEY,
  NEXUS_PRIORITY_LANES_SURFACE_KEY,
  NEXUS_RESOLUTIONS_SURFACE_KEY,
} from "#features/nexus"

import { NexusOrientationBand } from "./nexus-orientation-band"
import { NexusTruthMap } from "./nexus-truth-map"

/**
 * Nexus Field — five sections in intentional reading order (orientation → pressure
 * → surfaces map → actionable lanes → recent closure). Reordering changes IA.
 */
export type NexusFieldViewProps = {
  snapshot: NexusSnapshot
  listSurfaces: NexusListSurfaceBundle
}

export function NexusFieldView({
  snapshot,
  listSurfaces,
}: NexusFieldViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <NexusOrientationBand
        org={snapshot.org}
        operator={snapshot.operator}
        readiness={snapshot.readiness}
      />

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Operational pressure</CardTitle>
        </CardHeader>
        <GovernedComponentRenderer
          surfaceKey={NEXUS_PRESSURE_SURFACE_KEY}
          component={{
            type: "governed:list-surface",
            serverType: "governed:list-surface",
            configuration: listSurfaces.pressure,
          }}
        />
      </Card>

      <NexusTruthMap surfaces={snapshot.surfaces} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Priority lanes</CardTitle>
          </CardHeader>
          <GovernedComponentRenderer
            surfaceKey={NEXUS_PRIORITY_LANES_SURFACE_KEY}
            component={{
              type: "governed:list-surface",
              serverType: "governed:list-surface",
              configuration: listSurfaces.priorityLanes,
            }}
          />
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Recent resolution</CardTitle>
          </CardHeader>
          <GovernedComponentRenderer
            surfaceKey={NEXUS_RESOLUTIONS_SURFACE_KEY}
            component={{
              type: "governed:list-surface",
              serverType: "governed:list-surface",
              configuration: listSurfaces.resolutions,
            }}
          />
        </Card>
      </div>
    </div>
  )
}
