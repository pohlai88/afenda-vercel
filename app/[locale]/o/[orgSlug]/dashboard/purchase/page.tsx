import { PurchasePage } from "#features/purchase"

export const dynamic = "force-dynamic"

export default async function OrgDashboardPurchasePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  return <PurchasePage orgSlug={orgSlug} />
}
