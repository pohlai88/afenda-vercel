import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildBenefitProvidersListSurfaceConfiguration } from "../data/benefit-list-surface.server"
import type { BenefitProviderRow } from "../data/benefit-provider.queries.server"

import { BenefitProviderCreateDialog } from "./benefit-provider-create-dialog"
import { BenefitProviderEditDialog } from "./benefit-provider-edit-dialog"
import type { BenefitProviderFormRow } from "./benefit-provider-form"

type BenefitProvidersSectionProps = {
  isAdmin: boolean
  providers: readonly BenefitProviderRow[]
}

function toFormRow(provider: BenefitProviderRow): BenefitProviderFormRow {
  return {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    countryCodes: provider.countryCodes,
    externalReference: provider.externalReference,
    isActive: provider.isActive,
  }
}

export async function BenefitProvidersSection({
  isAdmin,
  providers,
}: BenefitProvidersSectionProps) {
  const [tSection, t] = await Promise.all([
    getTranslations("Dashboard.Hrm.benefits"),
    getTranslations("Dashboard.Hrm.benefits.providersTable"),
  ])

  const listConfiguration = buildBenefitProvidersListSurfaceConfiguration(
    providers,
    {
      empty: isAdmin ? t("emptyAdmin") : t("emptyMember"),
      colCode: t("colCode"),
      colName: t("colName"),
      colCountries: t("colCountries"),
      colExternalRef: t("colExternalRef"),
      colStatus: t("colStatus"),
      statusActive: t("statusActive"),
      statusInactive: t("statusInactive"),
    }
  )

  const providerById = new Map(providers.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={tSection("tabProvidersTitle")}
      description={tSection("tabProvidersDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:benefits:providers"
      cardClassName="mt-0 border-solid border-border"
      headerSlot={
        isAdmin ? (
          <div className="mb-3 flex justify-end">
            <BenefitProviderCreateDialog />
          </div>
        ) : null
      }
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const provider = providerById.get(surfaceRow.id)
                if (!provider) return null
                return (
                  <BenefitProviderEditDialog provider={toFormRow(provider)} />
                )
              },
            }
          : undefined
      }
    />
  )
}
