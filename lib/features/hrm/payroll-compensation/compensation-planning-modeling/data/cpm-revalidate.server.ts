import "server-only"

import { revalidatePath } from "next/cache"

import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

export function revalidateCompensationPlanningSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/compensation-planning"),
    "layout"
  )
}
