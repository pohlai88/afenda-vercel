import { AttendancePage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


export default async function OrgAppsHrmAttendancePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/attendance">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "attendance",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Attendance"
        description="This HRM surface requires Attendance search access."
      />
    )
  }

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
