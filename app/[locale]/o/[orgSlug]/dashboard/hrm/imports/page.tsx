import { HrmImportsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmImportsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/imports">) {
  const { orgSlug } = await params
  return <HrmImportsPage orgSlug={orgSlug} />
}
