"use client"

/**
 * Canonical `next-themes` provider (includes Mod+Shift+L toggle helper).
 *
 * **Mount once** in `app/layout.tsx` so every route shares the same theme
 * context. `AppShellProviders` does not wrap a second provider — use
 * {@link AppShellThemeBridge} there to mirror state into {@link useAppShellStore}.
 */
export { ThemeProvider as AppShellRootThemeProvider } from "#components/theme-provider"
