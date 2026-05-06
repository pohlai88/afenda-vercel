import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { SALE_ROUTE } from "#features/sale/constants"

import { SaleActionForm } from "./sale-action-form"

export async function SalePage() {
  return (
    <ModuleScaffold
      title="Sale"
      eyebrow="Revenue"
      route={SALE_ROUTE}
      workspaceTitle="Sales workspace is ready"
      workspaceDescription="Configure quotations, invoices, and sales workflows in this module next."
    >
      <SaleActionForm />
    </ModuleScaffold>
  )
}
