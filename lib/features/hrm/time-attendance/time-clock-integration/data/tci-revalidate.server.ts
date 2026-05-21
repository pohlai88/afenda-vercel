import "server-only"

import { revalidatePath } from "next/cache"

import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

export function revalidateTimeClockSurfaces() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/time-clock"), "layout")
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/attendance"), "layout")
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}
