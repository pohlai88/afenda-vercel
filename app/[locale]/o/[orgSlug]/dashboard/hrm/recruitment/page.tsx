import { RecruitmentPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmRecruitmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/recruitment">) {
  const { orgSlug } = await params
  return <RecruitmentPage orgSlug={orgSlug} />
}
