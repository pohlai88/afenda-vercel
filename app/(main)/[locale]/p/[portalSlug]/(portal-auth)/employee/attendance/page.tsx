import { EmployeePortalAttendancePage } from "#features/hrm"

type RouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalAttendanceRoute({
  params,
}: RouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalAttendancePage portalSlug={portalSlug} />
}
