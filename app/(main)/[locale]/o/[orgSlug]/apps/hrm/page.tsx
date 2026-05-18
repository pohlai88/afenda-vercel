import { HrmOverviewRoutePage } from "#features/hrm"

export default async function OrgAppsHrmPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm">) {
  const { orgSlug } = await params
  return <HrmOverviewRoutePage orgSlug={orgSlug} />
}
