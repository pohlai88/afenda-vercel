import { EmployeePortalProfileEmergencyPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalProfileEmergencyRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfileEmergencyRoute({
  params,
}: EmployeePortalProfileEmergencyRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfileEmergencyPage portalSlug={portalSlug} />
}
