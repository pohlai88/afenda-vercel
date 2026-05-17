import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import type { OrgStructureSurfaceCapabilities } from "../data/org-structure-capabilities.shared"
import { listOrgChartNodes } from "../data/org-structure.queries.server"

import { OrgChartCanvas } from "./org-chart-canvas.client"

type OrgChartPanelProps = {
  readonly orgSlug: string
  readonly includeArchived: boolean
  readonly capabilities: OrgStructureSurfaceCapabilities
}

export async function OrgChartPanel({
  orgSlug,
  includeArchived,
  capabilities,
}: OrgChartPanelProps) {
  const { organizationId } = await requireOrgSession()
  const [nodes, t] = await Promise.all([
    listOrgChartNodes(organizationId, { includeArchived }),
    getTranslations("Dashboard.Hrm.organization.chart"),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OrgChartCanvas
          orgSlug={orgSlug}
          capabilities={capabilities}
          sourceNodes={nodes}
        />
      </CardContent>
    </Card>
  )
}
