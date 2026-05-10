import "server-only"

import { revalidatePath } from "next/cache"

import { ORG_DASHBOARD_ITHINK } from "#lib/dashboard-module-paths"
import {
  toLocaleOrgDashboardRevalidatePattern,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"

/** Invalidates all locale/org-slug builds of the iThink dashboard surface. */
export function revalidateOrgOneThingDashboard(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_ITHINK),
    "page"
  )
}

/** Invalidates all locale builds of the personal OneThing account surface. */
export function revalidatePersonalOneThingSurface(): void {
  revalidatePath(toLocaleRoutePattern("/account/onething"), "page")
}
