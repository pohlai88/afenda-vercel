import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  buildCompensationBudgetPoolsListSurfaceConfiguration,
  buildCompensationCyclesListSurfaceConfiguration,
  buildCompensationParticipantsListSurfaceConfiguration,
} from "../data/cpm-list-surface.server"
import { compensationCycleTypeLabel } from "../data/cpm-display.shared"
import type {
  CompensationBudgetPoolRow,
  CompensationCycleRow,
  CompensationParticipantRow,
} from "../data/cpm.queries.server"
import { CpmCreateBudgetPoolDialog } from "./cpm-create-budget-pool-dialog"
import { CpmCreateCycleDialog } from "./cpm-create-cycle-dialog"
import { CpmSyncParticipantsButton } from "./cpm-sync-participants-button"

export async function CompensationCyclesSection({
  cycles,
  canManage,
}: {
  cycles: readonly CompensationCycleRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.compensationPlanning")

  if (cycles.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("noCyclesTitle")}</CardTitle>
          <CardDescription>{t("noCyclesBody")}</CardDescription>
        </CardHeader>
        {canManage ? (
          <CardContent>
            <CpmCreateCycleDialog />
          </CardContent>
        ) : null}
      </Card>
    )
  }

  return (
    <GovernedPatternCListSection
      title={t("cyclesTitle")}
      description={t("cyclesDescription")}
      surfaceKey="hrm:compensation-planning:cycles"
      listConfiguration={buildCompensationCyclesListSurfaceConfiguration(
        cycles,
        {
          empty: t("cyclesEmpty"),
          colCode: t("colCycleCode"),
          colName: t("colCycleName"),
          colType: t("colCycleType"),
          colEffective: t("colEffectiveDate"),
          colState: t("colCycleState"),
          cycleTypeLabel: (cycleType) =>
            compensationCycleTypeLabel(cycleType, (key) =>
              t(`cycleType.${key}` as "cycleType.annual_review")
            ),
          stateLabel: (state) => {
            const known = ["draft", "open", "closed"] as const
            if ((known as readonly string[]).includes(state)) {
              return t(`cycleState.${state as (typeof known)[number]}`)
            }
            return state
          },
        }
      )}
      headerSlot={canManage ? <CpmCreateCycleDialog /> : undefined}
    />
  )
}

export async function CompensationBudgetPoolsSection({
  cycleId,
  pools,
  canManage,
}: {
  cycleId: string | null
  pools: readonly CompensationBudgetPoolRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.compensationPlanning")

  if (!cycleId) {
    return null
  }

  return (
    <GovernedPatternCListSection
      title={t("budgetPoolsTitle")}
      description={t("budgetPoolsDescription")}
      surfaceKey="hrm:compensation-planning:budget-pools"
      listConfiguration={buildCompensationBudgetPoolsListSurfaceConfiguration(
        pools,
        {
          empty: t("budgetPoolsEmpty"),
          colScope: t("colBudgetScope"),
          colAllocated: t("colBudgetAllocated"),
          colUsed: t("colBudgetUsed"),
          colRemaining: t("colBudgetRemaining"),
        }
      )}
      headerSlot={
        canManage ? <CpmCreateBudgetPoolDialog cycleId={cycleId} /> : undefined
      }
    />
  )
}

export async function CompensationParticipantsSection({
  cycleId,
  participants,
  canManage,
}: {
  cycleId: string | null
  participants: readonly CompensationParticipantRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.compensationPlanning")

  if (!cycleId) {
    return null
  }

  return (
    <GovernedPatternCListSection
      title={t("participantsTitle")}
      description={t("participantsDescription")}
      surfaceKey="hrm:compensation-planning:participants"
      listConfiguration={buildCompensationParticipantsListSurfaceConfiguration(
        participants,
        {
          empty: t("participantsEmpty"),
          colEmployee: t("colParticipantEmployee"),
          colSalary: t("colParticipantSalary"),
          colBand: t("colParticipantBand"),
          colEligibility: t("colParticipantEligibility"),
        }
      )}
      headerSlot={
        canManage ? <CpmSyncParticipantsButton cycleId={cycleId} /> : undefined
      }
    />
  )
}
