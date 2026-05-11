import { AccountingPage } from "#features/accounting"

export default async function OrgDashboardAccountingPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/accounting">) {
  const { orgSlug } = await params
  return <AccountingPage orgSlug={orgSlug} />
}
