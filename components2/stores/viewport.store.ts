"use client"

import { create } from "zustand"

export const VIEWPORT_MOBILE_BREAKPOINT_PX = 768

const QUERY = `(max-width: ${VIEWPORT_MOBILE_BREAKPOINT_PX - 1}px)`

export type ViewportStore = {
  isMobile: boolean
}

export const useViewportStore = create<ViewportStore>()(() => ({
  isMobile: false,
}))

let teardown: (() => void) | null = null

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(QUERY).matches
}

/**
 * Subscribes to the mobile viewport query and mirrors matches into
 * {@link useViewportStore}. Idempotent — safe to call from multiple mounts.
 */
export function ensureViewportSubscription(): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }
  if (teardown) {
    return teardown
  }

  const update = () => {
    useViewportStore.setState({ isMobile: readIsMobile() })
  }
  update()

  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", update)
  teardown = () => {
    mql.removeEventListener("change", update)
    teardown = null
  }
  return teardown
}

export const selectViewportIsMobile = (state: ViewportStore) => state.isMobile
