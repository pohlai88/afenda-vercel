"use client"

import { AppShellPolicyDisc } from "#app-shell/client"
import { OperationalScopeAdminConfigContent } from "#features/operational-scope/client"

import {
  SHELL_PREVIEW_ACTIVE_SCOPES,
  SHELL_PREVIEW_ORG_ID,
  SHELL_PREVIEW_ORG_POLICIES,
  SHELL_PREVIEW_SCOPE_CATALOG,
} from "#features/playground/client"

export function AppShellPreviewPolicyDisc({
  className,
}: {
  className?: string
} = {}) {
  return (
    <AppShellPolicyDisc
      ariaLabel="Operational scope policy"
      tooltip="Scope policy"
      className={className}
      dropdownContent={
        <OperationalScopeAdminConfigContent
          registeredScopes={SHELL_PREVIEW_SCOPE_CATALOG}
          orgPolicies={SHELL_PREVIEW_ORG_POLICIES}
          organizationId={SHELL_PREVIEW_ORG_ID}
          activeScopes={SHELL_PREVIEW_ACTIVE_SCOPES}
        />
      }
    />
  )
}
