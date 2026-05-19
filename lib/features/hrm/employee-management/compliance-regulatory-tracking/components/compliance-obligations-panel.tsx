import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listComplianceObligationRegistryForOrg } from "../data/compliance-obligation.queries.server"
import type { ComplianceSurfaceCapabilities } from "../data/compliance-capabilities.shared"

import { ComplianceObligationsListSection } from "./compliance-obligations-list-section"
import { ComplianceObligationsRegisterSection } from "./compliance-obligations-register-section"

type ComplianceObligationsPanelProps = {
  readonly organizationId: string
  readonly orgSlug: string
  readonly capabilities: ComplianceSurfaceCapabilities
}

export async function ComplianceObligationsPanel({
  organizationId,
  orgSlug,
  capabilities,
}: ComplianceObligationsPanelProps) {
  const [t, obligations] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.obligations"),
    listComplianceObligationRegistryForOrg(organizationId),
  ])

  return (
    <Card size="sm" data-testid="hrm-compliance-obligations-panel">
      <CardHeader>
        <CardTitle className="text-base">{t("panelTitle")}</CardTitle>
        <CardDescription>{t("panelDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ComplianceObligationsRegisterSection
          orgSlug={orgSlug}
          canCreate={capabilities.canCreate}
        />
        <ComplianceObligationsListSection
          orgSlug={orgSlug}
          canUpdate={capabilities.canUpdate}
          rows={obligations}
        />
      </CardContent>
    </Card>
  )
}
