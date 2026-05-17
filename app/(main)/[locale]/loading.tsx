import { SegmentRouteSpinner } from "#components2/route-loading/segment-route-spinner"

/**
 * Immediate feedback while any direct child segment under `[locale]` suspends
 * (RSC + next-intl provider boundary).
 */
export default function LocaleLoading() {
  return <SegmentRouteSpinner />
}
