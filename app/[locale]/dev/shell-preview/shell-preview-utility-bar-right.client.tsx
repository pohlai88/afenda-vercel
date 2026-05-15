"use client"

import type { Route } from "next"

import { AppShellUtilityBarRight } from "#components2/app-shell/client"

/** Locale-internal preview surface — every link stays on this page. */
const PREVIEW_HREF = "/dev/shell-preview" satisfies Route

/**
 * Client bridge: passes serializable `account` props (including `onSignOut` no-op)
 * into {@link AppShellUtilityBarRight} because the shell preview page is an RSC.
 */
export function ShellPreviewUtilityBarRight() {
  return (
    <AppShellUtilityBarRight
      hrefs={{
        insight: PREVIEW_HREF,
        help: PREVIEW_HREF,
        settings: PREVIEW_HREF,
      }}
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
