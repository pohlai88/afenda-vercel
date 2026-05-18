import type { useTranslations } from "next-intl"

import type { HrmApplicationStage } from "../schemas/recruitment.schema"

type RecruitmentT = ReturnType<
  typeof useTranslations<"Dashboard.Hrm.recruitment">
>

export function resolveRecruitmentStageLabel(
  t: RecruitmentT,
  stage: HrmApplicationStage
): string {
  switch (stage) {
    case "applied":
      return t("stages.applied")
    case "screening":
      return t("stages.screening")
    case "shortlisted":
      return t("stages.shortlisted")
    case "interview":
      return t("stages.interview")
    case "assessment":
      return t("stages.assessment")
    case "offer":
      return t("stages.offer")
    case "hired":
      return t("stages.hired")
    case "rejected":
      return t("stages.rejected")
    case "withdrawn":
      return t("stages.withdrawn")
    case "archived":
      return t("stages.archived")
  }
}

export function resolveRecruitmentMoveToStageLabel(
  t: RecruitmentT,
  stage: HrmApplicationStage
): string {
  switch (stage) {
    case "screening":
      return t("moveToStages.screening")
    case "shortlisted":
      return t("moveToStages.shortlisted")
    case "interview":
      return t("moveToStages.interview")
    case "assessment":
      return t("moveToStages.assessment")
    case "offer":
      return t("moveToStages.offer")
    case "hired":
      return t("moveToStages.hired")
    case "rejected":
      return t("moveToStages.rejected")
    case "withdrawn":
      return t("moveToStages.withdrawn")
    case "archived":
      return t("moveToStages.archived")
    case "applied":
      return t("stages.applied")
  }
}
