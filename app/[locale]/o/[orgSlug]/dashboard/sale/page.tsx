import { SalePage } from "#features/sale"

export const dynamic = "force-dynamic"

export default async function OrgDashboardSalePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  return <SalePage orgSlug={orgSlug} />
}
