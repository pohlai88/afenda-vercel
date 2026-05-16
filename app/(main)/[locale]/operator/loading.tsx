import { SegmentRouteSpinner } from "#components/segment-route-spinner"

/**
 * Immediate feedback while admin child routes resolve (step-up + RSC).
 */
export default function AdminLoading() {
  return <SegmentRouteSpinner />
}
