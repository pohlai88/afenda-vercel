import { GovernedComponentSkeleton } from "./governed-component-skeleton"
import type { AfendaGovernedRendererId } from "./registry"

export type GovernedMetadataLoadingProps = {
  rendererId: AfendaGovernedRendererId
}

/**
 * Loading boundary helper for governed metadata surfaces.
 *
 * Maps a renderer id to the matching skeleton shape from
 * `GovernedComponentSkeleton`. Use in route `loading.tsx` files that
 * stream a governed page whose renderer id is known at build time.
 */
export function GovernedMetadataLoading({
  rendererId,
}: GovernedMetadataLoadingProps) {
  return <GovernedComponentSkeleton rendererId={rendererId} />
}
