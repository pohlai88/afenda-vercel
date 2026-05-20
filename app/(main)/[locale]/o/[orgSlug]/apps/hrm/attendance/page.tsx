import { AttendancePage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
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
    const t = await getTranslations("Dashboard.Hrm.attendance")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
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
