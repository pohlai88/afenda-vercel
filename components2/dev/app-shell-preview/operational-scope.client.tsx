"use client"

import { OperationalScopeRail } from "#components2/app-shell/operational-scope-rail.client"

import { SHELL_PREVIEW_OPERATIONAL_CONTEXT } from "../fixtures/operational-scope.fixture"

export function AppShellPreviewOperationalScope() {
  return (
    <OperationalScopeRail
      operationalContext={SHELL_PREVIEW_OPERATIONAL_CONTEXT}
    />
  )
}
