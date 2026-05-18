import "server-only"

import { revalidatePath } from "next/cache"

import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

/** Invalidate flexible-work layout and employee detail pages after FWA mutations. */
export function revalidateFwaSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/flexible-work"),
    "layout"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}
