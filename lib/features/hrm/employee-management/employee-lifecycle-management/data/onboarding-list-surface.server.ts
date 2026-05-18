import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type { OnboardingContractRow } from "./onboarding.queries.server"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function formatChecklist(value: unknown): string {
  if (!value || typeof value !== "object") return "—"
  const completedSteps = (value as { completedSteps?: unknown }).completedSteps
  if (!Array.isArray(completedSteps) || completedSteps.length === 0) {
    return "—"
  }
  return completedSteps.map(String).join(", ")
}

type OnboardingListCopy = {
  empty: string
  colEmployee: string
  colCompleted: string
  readOnlyUpdateReason: string
}

type OnboardingListContext = {
  canUpdate: boolean
}

export function buildOnboardingListSurfaceConfiguration(
  rows: readonly OnboardingContractRow[],
  copy: OnboardingListCopy,
  context: OnboardingListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "onboarding",
      function: "read",
    },
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-onboarding" },
      columnsId: "hrm-onboarding",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "completed", header: copy.colCompleted },
    ],
    rows: rows.map((row) => ({
      id: row.contractId,
      cells: {
        employee: row.legalName,
        completed: formatChecklist(row.onboardingChecklist),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        visible: true,
        allowed: context.canUpdate,
        disabledReason: copy.readOnlyUpdateReason,
        descriptor: {
          id: "hrm.onboarding.record_step",
          label: "Record step",
          intent: "default",
        },
      }),
    })),
  }
}
