import { notFound } from "next/navigation"

import {
  HrmCapabilityPlaceholderPage,
  isAllowedHrmDashboardSubsegment,
} from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmSegmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/[segment]">) {
  const { segment } = await params
  if (!isAllowedHrmDashboardSubsegment(segment)) {
    notFound()
  }

  return <HrmCapabilityPlaceholderPage segment={segment} />
}
