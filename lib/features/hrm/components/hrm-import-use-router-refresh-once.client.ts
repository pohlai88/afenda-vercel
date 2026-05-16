"use client"

import { useEffect, useRef } from "react"

import { useRouter } from "#i18n/navigation"

/** After a successful Server Action, refresh RSC payload once without looping on stable `true`. */
export function useHrmImportRouterRefreshOnce(when: boolean | undefined): void {
  const router = useRouter()
  const didRefresh = useRef(false)

  useEffect(() => {
    if (!when || didRefresh.current) return
    didRefresh.current = true
    void router.refresh()
  }, [when, router])
}
