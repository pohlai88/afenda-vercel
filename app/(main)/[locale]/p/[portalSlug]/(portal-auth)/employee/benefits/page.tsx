import { EmployeePortalBenefitsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type RouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalBenefitsRoute({
  params,
}: RouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalBenefitsPage portalSlug={portalSlug} />
}
