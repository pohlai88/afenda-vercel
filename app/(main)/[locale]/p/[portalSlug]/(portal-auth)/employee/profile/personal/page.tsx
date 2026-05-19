import { EmployeePortalProfilePersonalPage } from "#features/hrm"

type EmployeePortalProfilePersonalRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfilePersonalRoute({
  params,
}: EmployeePortalProfilePersonalRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfilePersonalPage portalSlug={portalSlug} />
}
