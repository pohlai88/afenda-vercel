import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listComplianceFilingsForOrg } from "../data/compliance-filing.queries.server"
import type { ComplianceSurfaceCapabilities } from "../data/compliance-capabilities.shared"

import { ComplianceFilingsListSection } from "./compliance-filings-list-section"

type ComplianceFilingsPanelProps = {
  readonly organizationId: string
  readonly orgSlug: string
  readonly capabilities: ComplianceSurfaceCapabilities
}

export async function ComplianceFilingsPanel({
  organizationId,
  orgSlug,
  capabilities,
}: ComplianceFilingsPanelProps) {
  const [t, filings] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.filings"),
    listComplianceFilingsForOrg(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("panelTitle")}</CardTitle>
        <CardDescription>{t("panelDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ComplianceFilingsListSection
          orgSlug={orgSlug}
          canUpdate={capabilities.canUpdate}
          rows={filings}
        />
      </CardContent>
    </Card>
  )
}
