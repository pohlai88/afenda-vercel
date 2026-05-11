import { InventoryPage } from "#features/inventory"

export default async function OrgDashboardInventoryPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/inventory">) {
  const { orgSlug } = await params
  return <InventoryPage orgSlug={orgSlug} />
}
