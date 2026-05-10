import { ModuleScaffold } from "#components/module-scaffold"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { InventoryActionForm } from "./inventory-action-form"

export async function InventoryPage({ orgSlug }: { orgSlug: string }) {
  return (
    <ModuleScaffold
      title="Inventory"
      eyebrow="Stock"
      route={organizationDashboardPath(orgSlug, "inventory")}
      workspaceTitle="Inventory workspace is ready"
      workspaceDescription="Add stock moves, on-hand balances, and reservation workflows in this module next."
    >
      <InventoryActionForm />
    </ModuleScaffold>
  )
}
