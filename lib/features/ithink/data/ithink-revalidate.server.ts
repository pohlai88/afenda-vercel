import "server-only"

import { revalidatePath } from "next/cache"

import { ORG_DASHBOARD_ITHINK } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

export function revalidateOrgIThinkDashboard(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_ITHINK),
    "page"
  )
}
