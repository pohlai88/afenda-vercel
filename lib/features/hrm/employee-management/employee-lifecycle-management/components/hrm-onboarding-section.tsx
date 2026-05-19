import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOnboardingListSurfaceConfiguration } from "../data/onboarding-list-surface.server"
import { ONBOARDING_LIST_SURFACE_IDS } from "../data/onboarding-surface-metadata.shared"
import {
  type OnboardingContractRow,
  listActiveContractsForOnboardingDashboard,
} from "../data/onboarding.queries.server"

import { HrmOnboardingStepForm } from "./hrm-onboarding-step-form"

type HrmOnboardingSectionProps = {
  orgSlug: string
  organizationId: string
  canRead: boolean
  canUpdate: boolean
}

export async function HrmOnboardingSection({
  orgSlug,
  organizationId,
  canRead,
  canUpdate,
}: HrmOnboardingSectionProps) {
  const [t, rowsResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.onboarding"),
    canRead
      ? (async (): Promise<
          | { ok: true; rows: ReadonlyArray<OnboardingContractRow> }
          | { ok: false; error: unknown }
        > => {
          try {
            const rows =
              await listActiveContractsForOnboardingDashboard(organizationId)
            return { ok: true, rows }
          } catch (error) {
            return { ok: false, error }
          }
        })()
      : Promise.resolve({ ok: true as const, rows: [] }),
  ])

  const copy = {
    empty: t("emptyBody"),
    colEmployee: t("colEmployee"),
    colCompleted: t("colCompleted"),
    readOnlyUpdateReason: t("readOnlyUpdateReason"),
  }

  let listConfiguration = buildOnboardingListSurfaceConfiguration([], copy, {
    canUpdate,
  })
  let surfaceKey: string = ONBOARDING_LIST_SURFACE_IDS.contracts
  let loadError:
    | {
        variant: "error"
        title: string
      }
    | undefined

  if (!rowsResult.ok) {
    logUnexpectedServerError(
      "hrm-onboarding-section: query failed",
      rowsResult.error,
      { organizationId }
    )
    surfaceKey = ONBOARDING_LIST_SURFACE_IDS.contractsError
    loadError = {
      variant: "error",
      title: t("tableLoadFailed"),
    }
  } else {
    listConfiguration = buildOnboardingListSurfaceConfiguration(
      rowsResult.rows,
      copy,
      { canUpdate }
    )
  }

  const rows = rowsResult.ok ? rowsResult.rows : []
  const rowById = new Map(rows.map((row) => [row.contractId, row]))
  const allowed = canRead

  return (
    <GovernedPatternCListSection
      title={rows.length === 0 && allowed ? t("emptyTitle") : t("tableTitle")}
      description={
        rows.length === 0 && allowed ? t("emptyBody") : t("tableDescription")
      }
      listConfiguration={listConfiguration}
      surfaceKey={surfaceKey}
      parentAccessAllowed={allowed}
      loadError={loadError}
      forbidden={{
        variant: "forbidden",
        title: t("forbiddenTitle"),
        description: t("forbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("invalidConfigTitle"),
        description: t("invalidConfigDescription"),
      }}
      trailingColumn={{
        header: t("colRecord"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!row || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          const disabled = trailingAction.state === "disabled"
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <HrmOnboardingStepForm
                orgSlug={orgSlug}
                contractId={row.contractId}
                disabled={disabled}
                disabledReason={trailingAction.disabledReason}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
