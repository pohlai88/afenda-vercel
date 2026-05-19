"use client"

import { OperationalScopeRail } from "#features/operational-scope/client"

import { SHELL_PREVIEW_OPERATIONAL_CONTEXT } from "#features/dev/client"

export function AppShellPreviewOperationalScope() {
  return (
    <OperationalScopeRail
      operationalContext={SHELL_PREVIEW_OPERATIONAL_CONTEXT}
    />
  )
}
