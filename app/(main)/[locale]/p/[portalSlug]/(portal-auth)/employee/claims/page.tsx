import { EmployeePortalClaimsPage } from "#features/hrm"

type RouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalClaimsRoute({
  params,
}: RouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalClaimsPage portalSlug={portalSlug} />
}
