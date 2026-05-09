"use client"

import { useCallback } from "react"

import { useRouter } from "#i18n/navigation"

import {
  buildTailFocusHref,
  type OneThingTailPreserveSearchParams,
} from "../../data/onething-page-view.shared"

/**
 * History-stack discipline for the OneThing two-pane layout.
 *
 * J/K keyboard navigation, list-row clicks, and the resolve hand-off all
 * mutate `?focus=` on the same route — `router.replace` keeps the browser
 * "back" gesture meaningful (it should escape OneThing entirely, not unwind
 * 30 focused-item steps).
 *
 * Only the dashboard sidebar entry into OneThing pushes a new history
 * entry; everything inside the surface replaces.
 */
export function useFocusNavigation(
  pathname: string,
  preserve: OneThingTailPreserveSearchParams | undefined
) {
  const router = useRouter()

  const focus = useCallback(
    (id: string) => {
      const href = buildTailFocusHref(pathname, id, preserve)
      router.replace(href, { scroll: false })
    },
    [pathname, preserve, router]
  )

  const clear = useCallback(() => {
    const sp = new URLSearchParams()
    if (preserve) {
      for (const [key, raw] of Object.entries(preserve)) {
        if (key === "focus") continue
        if (raw === undefined) continue
        const values = Array.isArray(raw) ? raw : [raw]
        for (const v of values) {
          if (v !== "") sp.append(key, v)
        }
      }
    }
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, preserve, router])

  return { focus, clear }
}
