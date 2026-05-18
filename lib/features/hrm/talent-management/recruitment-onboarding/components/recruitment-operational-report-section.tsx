import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildRecruitmentReportListSurfaceConfiguration } from "../data/recruitment-report-list-surface.server"
import type { RecruitmentOperationalReportRow } from "../data/recruitment.queries.server"

type RecruitmentOperationalReportSectionProps = {
  rows: readonly RecruitmentOperationalReportRow[]
}

export async function RecruitmentOperationalReportSection({
  rows,
}: RecruitmentOperationalReportSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")
  const areaLabel = (row: RecruitmentOperationalReportRow): string => {
    switch (row.id) {
      case "requisition-approvals":
        return t("operationalReportAreas.requisitionApprovals")
      case "job-postings":
        return t("operationalReportAreas.jobPostings")
      case "screening":
        return t("operationalReportAreas.screening")
      case "assessments":
        return t("operationalReportAreas.assessments")
      case "scorecards":
        return t("operationalReportAreas.scorecards")
      case "communications":
        return t("operationalReportAreas.communications")
      case "pre-employment-checks":
        return t("operationalReportAreas.preEmploymentChecks")
      default:
        return row.area
    }
  }
  const statusLabel = (row: RecruitmentOperationalReportRow): string => {
    switch (row.status) {
      case "Pending":
        return t("operationalReportStates.pending")
      case "Live":
        return t("operationalReportStates.live")
      case "Configured":
        return t("operationalReportStates.configured")
      case "Tracked":
        return t("operationalReportStates.tracked")
      case "Submitted":
        return t("operationalReportStates.submitted")
      case "Recorded":
        return t("operationalReportStates.recorded")
      default:
        return row.status
    }
  }

  const listConfiguration = buildRecruitmentReportListSurfaceConfiguration(
    rows,
    {
      empty: t("operationalReportEmpty"),
      colArea: t("operationalReportArea"),
      colCount: t("operationalReportCount"),
      colStatus: t("operationalReportStatus"),
      areaLabel,
      statusLabel,
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("operationalReportTitle")}
      description={t("operationalReportDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:operational-report"
    />
  )
}
