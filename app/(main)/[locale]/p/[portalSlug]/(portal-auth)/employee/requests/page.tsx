import { EmployeePortalRequestsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalRequestsRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalRequestsRoute({
  params,
}: EmployeePortalRequestsRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalRequestsPage portalSlug={portalSlug} />
}
