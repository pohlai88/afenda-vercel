import { EmployeePortalLeavePage } from "#features/hrm"


type EmployeePortalLeaveRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalLeaveRoute({
  params,
}: EmployeePortalLeaveRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalLeavePage portalSlug={portalSlug} />
}
