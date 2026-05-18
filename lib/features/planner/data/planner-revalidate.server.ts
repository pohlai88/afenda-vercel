import "server-only"

import { revalidatePath } from "next/cache"

import {
  toLocaleOrgAppsRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
} from "#lib/i18n/locales.shared"

import { ORBIT_PRIMARY_SURFACES } from "../constants"

function orbitOrgTail(surface: (typeof ORBIT_PRIMARY_SURFACES)[number]) {
  return surface === "queue" ? "/orbit" : `/orbit/${surface}`
}

export function revalidateOrgOrbitRoutes(): void {
  for (const surface of ORBIT_PRIMARY_SURFACES) {
    revalidatePath(
      toLocaleOrgAppsRevalidatePattern(orbitOrgTail(surface)),
      "page"
    )
  }
}

export function revalidateOrgOrbitAndNexus(): void {
  revalidateOrgOrbitRoutes()
  revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
}
