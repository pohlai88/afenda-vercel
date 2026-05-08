import { PurchasePage } from "#features/purchase"

export const dynamic = "force-dynamic"

export default async function OrgDashboardPurchasePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/purchase">) {
  const { orgSlug } = await params
  return <PurchasePage orgSlug={orgSlug} />
}
