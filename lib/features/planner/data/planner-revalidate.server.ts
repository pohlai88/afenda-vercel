import "server-only"

import { revalidatePath } from "next/cache"

import {
  type AppPath,
  toLocaleOrgDashboardRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"

import { ORBIT_PRIMARY_SURFACES } from "../constants"

function orbitOrgTail(surface: (typeof ORBIT_PRIMARY_SURFACES)[number]) {
  return surface === "queue" ? "/orbit" : `/orbit/${surface}`
}

function orbitAccountTail(
  surface: (typeof ORBIT_PRIMARY_SURFACES)[number]
): AppPath {
  return (
    surface === "queue" ? "/account/orbit" : `/account/orbit/${surface}`
  ) as AppPath
}

export function revalidateOrgOrbitRoutes(): void {
  for (const surface of ORBIT_PRIMARY_SURFACES) {
    revalidatePath(
      toLocaleOrgDashboardRevalidatePattern(orbitOrgTail(surface)),
      "page"
    )
  }
}

export function revalidateAccountOrbitRoutes(): void {
  for (const surface of ORBIT_PRIMARY_SURFACES) {
    revalidatePath(toLocaleRoutePattern(orbitAccountTail(surface)), "page")
  }
}

export function revalidateOrgOrbitAndNexus(): void {
  revalidateOrgOrbitRoutes()
  revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
}
