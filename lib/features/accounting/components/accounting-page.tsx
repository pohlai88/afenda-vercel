import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { AccountingActionForm } from "./accounting-action-form"

export async function AccountingPage({ orgSlug }: { orgSlug: string }) {
  return (
    <ModuleScaffold
      title="Accounting"
      eyebrow="Finance"
      route={organizationDashboardPath(orgSlug, "accounting")}
      workspaceTitle="Accounting workspace is ready"
      workspaceDescription="Add journals, posting rules, and reconciliation workflows in this module next."
    >
      <AccountingActionForm />
    </ModuleScaffold>
  )
}
