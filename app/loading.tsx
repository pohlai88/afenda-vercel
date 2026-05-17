import { SegmentRouteSpinner } from "#components2/route-loading/segment-route-spinner"

/**
 * Root `loading.tsx` — keep aligned with `app/[locale]/loading.tsx` so the first
 * Suspense fallback under `app/layout` does not pull a second brand/skeleton tree.
 */
export default function Loading() {
  return <SegmentRouteSpinner />
}
