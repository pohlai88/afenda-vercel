import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildSignatureRequestListSurfaceConfiguration } from "../data/signature-request-list-surface.server"
import type { SignatureRequestListRow } from "../data/signature-request.queries.server"

type SignaturesListSectionProps = {
  orgSlug: string
  rows: readonly SignatureRequestListRow[]
}

export async function SignaturesListSection({
  orgSlug,
  rows,
}: SignaturesListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.signatures"),
    getFormatter(),
  ])

  const listConfiguration = buildSignatureRequestListSurfaceConfiguration(
    rows,
    {
      orgSlug,
      empty: t("empty"),
      colKind: t("listTitle"),
      colSubject: "Subject",
      colStatus: "Status",
      colSent: "Sent",
      kindLabelFor: (kind) => t("requestLabel", { kind }),
      formatSentAt: (date) =>
        format.dateTime(date, { dateStyle: "medium" }),
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="tools:signatures:requests"
      resolveConfiguredPermission={false}
    />
  )
}
