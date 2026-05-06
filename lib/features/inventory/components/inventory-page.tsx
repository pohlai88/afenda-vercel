import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { INVENTORY_ROUTE } from "#features/inventory/constants"

import { InventoryActionForm } from "./inventory-action-form"

export async function InventoryPage() {
  return (
    <ModuleScaffold
      title="Inventory"
      eyebrow="Stock"
      route={INVENTORY_ROUTE}
      workspaceTitle="Inventory workspace is ready"
      workspaceDescription="Add stock moves, on-hand balances, and reservation workflows in this module next."
    >
      <InventoryActionForm />
    </ModuleScaffold>
  )
}
