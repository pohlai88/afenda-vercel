import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { requireOrgSession } from "#lib/tenant"

import { listOrgChartNodes } from "../data/org-structure.queries.server"

import { OrgChartCanvas } from "./org-chart-canvas.client"

type OrgChartPanelProps = {
  readonly orgSlug: string
  readonly includeArchived: boolean
  readonly canMutate: boolean
}

export async function OrgChartPanel({
  orgSlug,
  includeArchived,
  canMutate,
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
          canMutate={canMutate}
          sourceNodes={nodes}
        />
      </CardContent>
    </Card>
  )
}
