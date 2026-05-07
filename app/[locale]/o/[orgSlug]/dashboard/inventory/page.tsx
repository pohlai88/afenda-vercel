import { InventoryPage } from "#features/inventory"

export const dynamic = "force-dynamic"

export default async function OrgDashboardInventoryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  return <InventoryPage orgSlug={orgSlug} />
}
