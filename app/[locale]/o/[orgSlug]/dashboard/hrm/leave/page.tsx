import { LeavePage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmLeavePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/leave">) {
  const { orgSlug } = await params
  return <LeavePage orgSlug={orgSlug} />
}
