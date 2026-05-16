import { EmployeePortalProfileBankingPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalProfileBankingRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfileBankingRoute({
  params,
}: EmployeePortalProfileBankingRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfileBankingPage portalSlug={portalSlug} />
}
