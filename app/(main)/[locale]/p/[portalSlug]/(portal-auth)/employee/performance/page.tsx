import { EmployeePortalPerformancePage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalPerformanceRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalPerformanceRoute({
  params,
}: EmployeePortalPerformanceRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalPerformancePage portalSlug={portalSlug} />
}
