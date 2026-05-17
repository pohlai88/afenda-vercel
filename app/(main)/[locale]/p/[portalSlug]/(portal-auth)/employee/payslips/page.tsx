import { EmployeePortalPayslipsPage } from "#features/hrm"


type EmployeePortalPayslipsRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalPayslipsRoute({
  params,
}: EmployeePortalPayslipsRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalPayslipsPage portalSlug={portalSlug} />
}
