import { EmployeePortalPerformanceGoalPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalPerformanceGoalRouteProps = {
  params: Promise<{ portalSlug: string; goalId: string }>
}

export default async function EmployeePortalPerformanceGoalRoute({
  params,
}: EmployeePortalPerformanceGoalRouteProps) {
  const { portalSlug, goalId } = await params
  return (
    <EmployeePortalPerformanceGoalPage
      portalSlug={portalSlug}
      goalId={goalId}
    />
  )
}
