import { EmployeePortalProfilePage } from "#features/hrm"

type EmployeePortalProfileRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfileRoute({
  params,
}: EmployeePortalProfileRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfilePage portalSlug={portalSlug} />
}
