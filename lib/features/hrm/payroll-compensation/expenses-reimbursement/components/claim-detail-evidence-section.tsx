import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildClaimEvidenceListSurfaceConfiguration } from "../data/claim-evidence-list-surface.server"
import type { ClaimEvidenceRow } from "../data/claim.queries.server"

type ClaimDetailEvidenceSectionProps = {
  evidence: readonly ClaimEvidenceRow[]
  emptyWhenRequired: boolean
}

export async function ClaimDetailEvidenceSection({
  evidence,
  emptyWhenRequired,
}: ClaimDetailEvidenceSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    getFormatter(),
  ])

  const listConfiguration = buildClaimEvidenceListSurfaceConfiguration(
    evidence,
    {
      empty: emptyWhenRequired
        ? t("detailEvidenceRequiredEmpty")
        : t("detailEvidenceEmpty"),
      colDocument: t("detailEvidenceDocument"),
      colType: t("detailEvidenceType"),
      colUploaded: t("detailEvidenceUploaded"),
      colSize: t("detailEvidenceSize"),
      formatUploadedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
      formatSize: (bytes) => format.number(bytes),
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:claims:detail-evidence"
      resolveConfiguredPermission={false}
    />
  )
}
