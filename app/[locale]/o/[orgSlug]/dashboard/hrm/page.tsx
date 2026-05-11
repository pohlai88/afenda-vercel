import { HrmOverviewPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { orgSlug } = await params
  return <HrmOverviewPage orgSlug={orgSlug} />
}
