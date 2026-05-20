import "server-only"

import { revalidatePath } from "next/cache"

import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

/** Invalidate geolocation surfaces after capture / exception / config mutations. */
export function revalidateGeolocationSurfaces() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/geolocation"), "layout")
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/attendance"), "layout")
}
