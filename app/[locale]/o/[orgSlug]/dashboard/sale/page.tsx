import { SalePage } from "#features/sale"

export default async function OrgDashboardSalePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/sale">) {
  const { orgSlug } = await params
  return <SalePage orgSlug={orgSlug} />
}
