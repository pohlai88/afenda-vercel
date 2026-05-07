import type { ReactNode } from "react"
import type { Metadata } from "next"

import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
  openGraph: { title: `Dashboard | ${SITE_NAME}` },
}

/**
 * Legacy `/dashboard` URLs redirect in `[[...segments]]/page.tsx` to `/o/{slug}/dashboard/...`.
 */
export default function LegacyDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
