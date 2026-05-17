import { EmployeePortalProfilePersonalPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalProfilePersonalRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalProfilePersonalRoute({
  params,
}: EmployeePortalProfilePersonalRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalProfilePersonalPage portalSlug={portalSlug} />
}
