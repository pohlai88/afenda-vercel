import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { ACCOUNTING_ROUTE } from "#features/accounting/constants"

import { AccountingActionForm } from "./accounting-action-form"

export async function AccountingPage() {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Accounting"
        eyebrow="Finance"
        description={`ERP accounting module scaffold is ready at ${ACCOUNTING_ROUTE}.`}
      />
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Action stub</h3>
        <AccountingActionForm />
      </section>
      <Empty className="bg-card">
        <EmptyTitle>Accounting workspace is ready</EmptyTitle>
        <EmptyDescription>
          Add journals, posting rules, and reconciliation workflows in this
          module next.
        </EmptyDescription>
      </Empty>
    </div>
  )
}
