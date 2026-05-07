import { SegmentRouteSpinner } from "#components/segment-route-spinner"

/**
 * Shared `loading.tsx` for legacy `/dashboard` and org `/o/.../dashboard` segments:
 * one Suspense fallback implementation (see Next.js linking + dynamic segments).
 */
export default function DashboardLoading() {
  return <SegmentRouteSpinner />
}
