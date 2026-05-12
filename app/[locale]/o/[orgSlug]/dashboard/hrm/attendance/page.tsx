import { AttendancePage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmAttendancePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/attendance">) {
  const { orgSlug } = await params
  const sp = await searchParams

  // Coerce only string-shaped search params; arrays / undefined fall back
  // to the page composer's defaults (today + no employee selected).
  const employeeIdParam =
    typeof sp.employeeId === "string" ? sp.employeeId : undefined
  const dateParam = typeof sp.date === "string" ? sp.date : undefined

  return (
    <AttendancePage
      orgSlug={orgSlug}
      employeeIdParam={employeeIdParam}
      dateParam={dateParam}
    />
  )
}
