import { SegmentRouteSpinner } from "#components/segment-route-spinner"

/**
 * Shared `loading.tsx` for org `/o/{slug}/dashboard` segments — one Suspense fallback
 * implementation (see Next.js linking + dynamic segments).
 */
export default function DashboardLoading() {
  return <SegmentRouteSpinner />
}
