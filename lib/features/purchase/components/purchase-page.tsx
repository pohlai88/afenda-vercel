import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { PURCHASE_ROUTE } from "#features/purchase/constants"

import { PurchaseActionForm } from "./purchase-action-form"

export async function PurchasePage() {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Purchase"
        eyebrow="Procurement"
        description={`ERP purchase module scaffold is ready at ${PURCHASE_ROUTE}.`}
      />
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Action stub</h3>
        <PurchaseActionForm />
      </section>
      <Empty className="bg-card">
        <EmptyTitle>Purchase workspace is ready</EmptyTitle>
        <EmptyDescription>
          Set up purchase requests, approvals, and vendor flows in this module next.
        </EmptyDescription>
      </Empty>
    </div>
  )
}
