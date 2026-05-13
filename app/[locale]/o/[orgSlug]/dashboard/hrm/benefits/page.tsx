import { BenefitsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmBenefitsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/benefits">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined

  return <BenefitsPage orgSlug={orgSlug} tabParam={tabParam} />
}
