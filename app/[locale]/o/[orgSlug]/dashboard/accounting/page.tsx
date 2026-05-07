import { AccountingPage } from "#features/accounting"

export const dynamic = "force-dynamic"

export default async function OrgDashboardAccountingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  return <AccountingPage orgSlug={orgSlug} />
}
