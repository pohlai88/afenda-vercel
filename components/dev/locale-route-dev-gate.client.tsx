"use client"

import { usePathname } from "#i18n/navigation"
import { stripLeadingLocalePrefix } from "#lib/i18n/locales.shared"

import { DevSignInPanelGate } from "./dev-signin-panel-gate"

function isPortalLocalePath(pathname: string): boolean {
  const stripped = stripLeadingLocalePrefix(pathname)
  const internal = stripped?.pathnameWithoutLocale ?? pathname
  return internal === "/p" || internal.startsWith("/p/")
}

/**
 * Dev sign-in overlay for locale routes outside `/p/*`.
 * Portal routes mount {@link DevSignInPanelGate} inside {@link PortalShell} so
 * `RouteEnvelope` stays `surface: "portal"`.
 */
export function LocaleRouteDevGate() {
  const pathname = usePathname()
  if (isPortalLocalePath(pathname)) {
    return null
  }
  return <DevSignInPanelGate />
}
