import { EmployeePortalOffboardingPage } from "#features/hrm"

type EmployeePortalOffboardingRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalOffboardingRoute({
  params,
}: EmployeePortalOffboardingRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalOffboardingPage portalSlug={portalSlug} />
}
