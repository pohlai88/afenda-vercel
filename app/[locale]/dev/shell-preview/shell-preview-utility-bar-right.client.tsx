"use client"

import type { Route } from "next"
import { useLocale } from "next-intl"

import { AppShellUtilityBarRight } from "#components2/app-shell/client"
import { helpDocsPath } from "#lib/help-docs-path.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

// Dev preview only — locale-internal href; double assertion bypasses typed-routes
// strictness since the locale segment is dynamic (/{locale}/dev/shell-preview).
const PREVIEW_HREF = "/dev/shell-preview" as unknown as Route

/**
 * Client bridge: passes serializable `account` props (including `onSignOut` no-op)
 * into {@link AppShellUtilityBarRight} because the shell preview page is an RSC.
 *
 * `useLocale()` resolves the active locale so `hrefs.help` is always locale-prefixed
 * without requiring the RSC parent to pass props across the server→client boundary.
 */
export function ShellPreviewUtilityBarRight() {
  const locale = ensureAppLocale(useLocale())

  return (
    <AppShellUtilityBarRight
      hrefs={{
        insight: PREVIEW_HREF,
        help: helpDocsPath(locale) as Route,
      }}
      orgSlug="preview-org"
      account={{
        userEmail: "you@example.com",
        hrefs: {
          account: PREVIEW_HREF,
          identity: PREVIEW_HREF,
          security: PREVIEW_HREF,
        },
        workspaceHomeHref: PREVIEW_HREF,
        onSignOut: () => {},
      }}
    />
  )
}
