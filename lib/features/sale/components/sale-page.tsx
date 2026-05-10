import { ModuleScaffold } from "#components/module-scaffold"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { SaleActionForm } from "./sale-action-form"

export async function SalePage({ orgSlug }: { orgSlug: string }) {
  return (
    <ModuleScaffold
      title="Sale"
      eyebrow="Revenue"
      route={organizationDashboardPath(orgSlug, "sale")}
      workspaceTitle="Sales workspace is ready"
      workspaceDescription="Configure quotations, invoices, and sales workflows in this module next."
    >
      <SaleActionForm />
    </ModuleScaffold>
  )
}
