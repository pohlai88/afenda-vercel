import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { ACCOUNTING_ROUTE } from "#features/accounting/constants"

import { AccountingActionForm } from "./accounting-action-form"

export async function AccountingPage() {
  return (
    <ModuleScaffold
      title="Accounting"
      eyebrow="Finance"
      route={ACCOUNTING_ROUTE}
      workspaceTitle="Accounting workspace is ready"
      workspaceDescription="Add journals, posting rules, and reconciliation workflows in this module next."
    >
      <AccountingActionForm />
    </ModuleScaffold>
  )
}
