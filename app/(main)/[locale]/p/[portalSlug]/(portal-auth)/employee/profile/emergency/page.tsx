import { EmployeePortalProfileEmergencyPage } from "#features/hrm"

type EmployeePortalProfileEmergencyRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfileEmergencyRoute({
  params,
}: EmployeePortalProfileEmergencyRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfileEmergencyPage portalSlug={portalSlug} />
}
