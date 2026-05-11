import { EmployeeDetailPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmEmployeeDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/employees/[employeeId]">) {
  const { orgSlug, employeeId } = await params
  return <EmployeeDetailPage orgSlug={orgSlug} employeeId={employeeId} />
}
