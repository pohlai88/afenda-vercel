import { getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { buildGovernedToolsWorkbenchHeader } from "../../_module-governance/tools-governed-page-header.server"
import { listSignatureRequestsForOrganization } from "../data/signature-request.queries.server"

import { SignaturesListSection } from "./signatures-list-section"

type SignaturesPageProps = {
  orgSlug: string
}

export async function SignaturesPage({ orgSlug }: SignaturesPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, rows, header] = await Promise.all([
    getTranslations("Dashboard.Hrm.signatures"),
    listSignatureRequestsForOrganization(organizationId),
    buildGovernedToolsWorkbenchHeader(orgSlug, "Dashboard.Hrm.signatures", {
      eyebrow: "eyebrow",
      title: "pageTitle",
      description: "pageDescription",
    }),
  ])

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("listDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignaturesListSection orgSlug={orgSlug} rows={rows} />
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}
