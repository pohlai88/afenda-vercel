import { NexusSurfaceCard } from "./nexus-surface-card"
import type { NexusSurfaceState } from "./nexus.types"

/**
 * Truth Map — Section C of the Nexus Field.
 *
 * Answers: "Where should I move next?"
 * Renders the operating-domain surfaces with state + pressure + freshness.
 * Not module cards — these are operational surfaces (per Nexus spec).
 */
export type NexusTruthMapProps = {
  surfaces: NexusSurfaceState[]
}

export function NexusTruthMap({ surfaces }: NexusTruthMapProps) {
  return (
    <section
      aria-labelledby="nexus-truth-map-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="nexus-truth-map-heading"
        className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Truth map
      </h2>
      {surfaces.length === 0 ? (
        <p className="text-sm text-muted-foreground">No surfaces registered.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {surfaces.map((surface) => (
            <NexusSurfaceCard key={surface.id} surface={surface} />
          ))}
        </div>
      )}
    </section>
  )
}
