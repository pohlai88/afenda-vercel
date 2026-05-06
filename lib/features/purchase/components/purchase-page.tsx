import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { PURCHASE_ROUTE } from "#features/purchase/constants"

import { PurchaseActionForm } from "./purchase-action-form"

export async function PurchasePage() {
  return (
    <ModuleScaffold
      title="Purchase"
      eyebrow="Procurement"
      route={PURCHASE_ROUTE}
      workspaceTitle="Purchase workspace is ready"
      workspaceDescription="Set up purchase requests, approvals, and vendor flows in this module next."
    >
      <PurchaseActionForm />
    </ModuleScaffold>
  )
}
