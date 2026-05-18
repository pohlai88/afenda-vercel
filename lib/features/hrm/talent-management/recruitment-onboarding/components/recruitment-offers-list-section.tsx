import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildRecruitmentOffersListSurfaceConfiguration } from "../data/recruitment-offers-list-surface.server"
import type { JobOfferRow } from "../data/recruitment.queries.server"

import { RecruitmentOfferTrailing } from "./recruitment-offer-trailing.client"

type RecruitmentOffersListSectionProps = {
  orgSlug: string
  offers: readonly JobOfferRow[]
}

function formatCompensation(row: JobOfferRow): string {
  return `${row.compensationAmount ?? "0"} ${row.compensationCurrency}`
}

function dateOnlyLabel(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "Not set"
}

export async function RecruitmentOffersListSection({
  orgSlug,
  offers,
}: RecruitmentOffersListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")
  const offerById = new Map(offers.map((row) => [row.id, row]))

  const listConfiguration = buildRecruitmentOffersListSurfaceConfiguration(
    offers,
    {
      empty: t("offersEmpty"),
      colCandidate: t("fieldCandidateName"),
      colRole: t("fieldRequisition"),
      colCompensation: t("fieldAmount"),
      colStatus: "Status",
      formatCompensation: (row) =>
        `${formatCompensation(row)} · ${dateOnlyLabel(row.proposedStartDate)}`,
      statusLabel: (status) => t("offerStatus", { status }),
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("offersTitle")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:offers"
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const offer = offerById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!offer || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <RecruitmentOfferTrailing
                orgSlug={orgSlug}
                offer={offer}
                labels={{
                  approveOffer: t("approveOffer"),
                  sendOffer: t("sendOffer"),
                  acceptOffer: t("acceptOffer"),
                  rejectOffer: t("rejectOffer"),
                  withdrawOffer: t("withdrawOffer"),
                  convertHire: t("convertHire"),
                  fieldEmployeeNumber: t("fieldEmployeeNumber"),
                  converted: t("converted"),
                }}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
