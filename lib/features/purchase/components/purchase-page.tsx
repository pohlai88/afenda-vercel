import { ModuleScaffold } from "#components/dashboard/module-scaffold"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { PurchaseActionForm } from "./purchase-action-form"

export async function PurchasePage({ orgSlug }: { orgSlug: string }) {
  return (
    <ModuleScaffold
      title="Purchase"
      eyebrow="Procurement"
      route={organizationDashboardPath(orgSlug, "purchase")}
      workspaceTitle="Purchase workspace is ready"
      workspaceDescription="Set up purchase requests, approvals, and vendor flows in this module next."
    >
      <PurchaseActionForm />
    </ModuleScaffold>
  )
}
