import { EmployeePortalAdvancesPage } from "#features/hrm"

type EmployeePortalAdvancesRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalAdvancesRoute({
  params,
}: EmployeePortalAdvancesRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalAdvancesPage portalSlug={portalSlug} />
}
