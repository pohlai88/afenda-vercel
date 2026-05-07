import { SegmentRouteSpinner } from "#components/segment-route-spinner"

/**
 * Immediate feedback while account child routes resolve (dynamic segment + RSC).
 */
export default function AccountLoading() {
  return <SegmentRouteSpinner />
}
