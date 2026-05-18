import { HrmSegmentCapabilityRoutePage } from "#features/hrm"

export default async function OrgAppsHrmSegmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/[segment]">) {
  const { segment } = await params
  return <HrmSegmentCapabilityRoutePage segment={segment} />
}
