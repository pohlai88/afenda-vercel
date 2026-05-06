import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { INVENTORY_ROUTE } from "#features/inventory/constants"

import { InventoryActionForm } from "./inventory-action-form"

export async function InventoryPage() {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Inventory"
        eyebrow="Stock"
        description={`ERP inventory module scaffold is ready at ${INVENTORY_ROUTE}.`}
      />
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Action stub</h3>
        <InventoryActionForm />
      </section>
      <Empty className="bg-card">
        <EmptyTitle>Inventory workspace is ready</EmptyTitle>
        <EmptyDescription>
          Add stock moves, on-hand balances, and reservation workflows in this
          module next.
        </EmptyDescription>
      </Empty>
    </div>
  )
}
