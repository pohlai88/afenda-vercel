"use client"

import { useEffect } from "react"

import { AppShellUtilityBarRight } from "#app-shell/client"
import { useUtilityBarStore } from "#components2/stores/utility-bar.store"

import {
  createShellPreviewMessengerTransport,
  SHELL_PREVIEW_MESSENGER_ORG_ID,
  SHELL_PREVIEW_ASK_DOCS_HREF,
  SHELL_PREVIEW_HREF,
} from "#features/playground/client"

export function AppShellPreviewUtilityBarRight() {
  useEffect(() => {
    useUtilityBarStore
      .getState()
      .ensureItemsVisibleForPreview(["messenger", "coordination"])
  }, [])

  return (
    <AppShellUtilityBarRight
      hrefs={{
        insight: SHELL_PREVIEW_HREF,
        help: SHELL_PREVIEW_ASK_DOCS_HREF,
      }}
      orgSlug="preview-org"
      workspaceBlobOrganizationId={SHELL_PREVIEW_MESSENGER_ORG_ID}
      messengerPreviewStub
      messengerTransport={createShellPreviewMessengerTransport()}
      account={{
        userEmail: "you@example.com",
        hrefs: {
          account: SHELL_PREVIEW_HREF,
          identity: SHELL_PREVIEW_HREF,
          security: SHELL_PREVIEW_HREF,
        },
        workspaceHomeHref: SHELL_PREVIEW_HREF,
        onSignOut: () => {},
      }}
    />
  )
}
