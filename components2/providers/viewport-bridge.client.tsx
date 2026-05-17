"use client"

import { useLayoutEffect } from "react"

import { ensureViewportSubscription } from "../stores/viewport.store"

/**
 * Keeps {@link useViewportStore} in sync with `matchMedia` for shell chrome.
 * Mount once inside {@link AppShellProviders} (alongside {@link AppShellThemeBridge}).
 */
export function AppShellViewportBridge() {
  useLayoutEffect(() => ensureViewportSubscription(), [])
  return null
}
