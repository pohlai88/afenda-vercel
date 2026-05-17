"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import {
  useAppShellStore,
  type ResolvedAppearance,
  type ThemePreference,
} from "#components2/stores"

function normalizePreference(raw: string | undefined): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return "system"
}

function normalizeResolved(raw: string | undefined): ResolvedAppearance {
  if (raw === "light") return "light"
  if (raw === "dark") return "dark"
  return null
}

/**
 * Subscribes to `next-themes` and mirrors `theme` / `resolvedTheme` into
 * {@link useAppShellStore} so shell code can read appearance without calling
 * `useTheme()` everywhere.
 *
 * Mount inside {@link AppShellProviders} — {@link AppShellRootThemeProvider}
 * stays in `app/layout.tsx` so every route shares one `next-themes` tree.
 */
export function AppShellThemeBridge() {
  const { theme, resolvedTheme } = useTheme()
  const applyNextTheme = useAppShellStore((s) => s.applyNextTheme)

  useEffect(() => {
    applyNextTheme({
      preference: normalizePreference(theme),
      resolved: normalizeResolved(resolvedTheme),
    })
  }, [theme, resolvedTheme, applyNextTheme])

  return null
}
