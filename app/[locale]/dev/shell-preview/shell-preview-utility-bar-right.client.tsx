"use client"

import { useEffect } from "react"
import type { Route } from "next"

import { AppShellUtilityBarRight } from "#components2/app-shell/client"
import { useUtilityBarStore } from "#components2/stores/utility-bar.store"

import {
  createShellPreviewMessengerTransport,
  SHELL_PREVIEW_MESSENGER_ORG_ID,
} from "./shell-preview-messenger-mocks.client"

// Dev preview only — locale-internal hrefs for `#i18n/navigation` `Link` (next-intl
// adds `/{locale}`; never pass `toLocalePath` / `helpDocsPath` here or you get `/en/en/...`).
// Double assertion bypasses typed-routes strictness since the locale segment is dynamic.
const PREVIEW_HREF = "/dev/shell-preview" as unknown as Route
const HELP_DOCS_HREF = "/help-docs" as unknown as Route

/**
 * Client bridge: passes serializable `account` props (including `onSignOut` no-op)
 * into {@link AppShellUtilityBarRight} because the shell preview page is an RSC.
 *
 * Help uses the same locale-internal path contract as production utility bar links:
 * `Link` from `#i18n/navigation` prefixes the active locale automatically.
 */
export function ShellPreviewUtilityBarRight() {
  useEffect(() => {
    useUtilityBarStore
      .getState()
      .ensureItemsVisibleForPreview(["messenger", "coordination"])
  }, [])

  return (
    <AppShellUtilityBarRight
      hrefs={{
        insight: PREVIEW_HREF,
        help: HELP_DOCS_HREF,
      }}
      orgSlug="preview-org"
      workspaceBlobOrganizationId={SHELL_PREVIEW_MESSENGER_ORG_ID}
      messengerPreviewStub
      messengerTransport={createShellPreviewMessengerTransport()}
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
