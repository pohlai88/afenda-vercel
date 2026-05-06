import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { SALE_ROUTE } from "#features/sale/constants"

import { SaleActionForm } from "./sale-action-form"

export async function SalePage() {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Sale"
        eyebrow="Revenue"
        description={`ERP sales module scaffold is ready at ${SALE_ROUTE}.`}
      />
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Action stub</h3>
        <SaleActionForm />
      </section>
      <Empty className="bg-card">
        <EmptyTitle>Sales workspace is ready</EmptyTitle>
        <EmptyDescription>
          Configure quotations, invoices, and sales workflows in this module next.
        </EmptyDescription>
      </Empty>
    </div>
  )
}
