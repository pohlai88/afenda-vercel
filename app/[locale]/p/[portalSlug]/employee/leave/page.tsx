import { EmployeePortalLeavePage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalLeaveRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalLeaveRoute({
  params,
}: EmployeePortalLeaveRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalLeavePage portalSlug={portalSlug} />
}
