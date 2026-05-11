import { WorkforcePage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmEmployeesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/employees">) {
  const { orgSlug } = await params
  return <WorkforcePage orgSlug={orgSlug} />
}
