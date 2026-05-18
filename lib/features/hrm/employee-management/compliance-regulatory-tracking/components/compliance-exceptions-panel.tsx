import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { listComplianceExceptionsForOrg } from "../data/compliance-exception.queries.server"
import type { ComplianceSurfaceCapabilities } from "../data/compliance-capabilities.shared"

import { ComplianceExceptionsListSection } from "./compliance-exceptions-list-section"

type ComplianceExceptionsPanelProps = {
  orgSlug: string
  capabilities: ComplianceSurfaceCapabilities
}

export async function ComplianceExceptionsPanel({
  orgSlug,
  capabilities,
}: ComplianceExceptionsPanelProps) {
  const { organizationId } = await requireOrgSession()
  const [t, rows] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.exceptions"),
    listComplianceExceptionsForOrg(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ComplianceExceptionsListSection
          orgSlug={orgSlug}
          canUpdate={capabilities.canUpdate}
          rows={rows}
        />
      </CardContent>
    </Card>
  )
}
