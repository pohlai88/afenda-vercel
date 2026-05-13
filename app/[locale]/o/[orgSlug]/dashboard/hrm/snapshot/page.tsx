import { HrmSnapshotPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmSnapshotPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/snapshot">) {
  const { orgSlug } = await params
  return <HrmSnapshotPage orgSlug={orgSlug} />
}
