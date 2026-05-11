import { PurchasePage } from "#features/purchase"

export default async function OrgDashboardPurchasePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/purchase">) {
  const { orgSlug } = await params
  return <PurchasePage orgSlug={orgSlug} />
}
