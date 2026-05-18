import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import { BENEFIT_LIST_SURFACE_IDS } from "./benefit-surface-metadata.shared"
import { isBenefitClaimStatus } from "./benefit-helpers.shared"
import type { BenefitClaimReferenceRow } from "./benefit-claim-reference.queries.server"
import type {
  BenefitEnrollmentListRow,
  BenefitOpenEnrollmentRow,
  BenefitPlanRow,
} from "./benefit-model.shared"
import type { BenefitProviderRow } from "./benefit-provider.queries.server"

const BENEFIT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "benefit" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function formatPlanDate(value: Date | null): string {
  if (!value) return "—"
  return value.toISOString().slice(0, 10)
}

type BenefitPlansListCopy = {
  empty: string
  colCode: string
  colName: string
  colKind: string
  colEffective: string
  colStatus: string
  statusActive: string
  statusInactive: string
}

export function buildBenefitPlansListSurfaceConfiguration(
  plans: readonly BenefitPlanRow[],
  copy: BenefitPlansListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-plans" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.plans,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "kind", header: copy.colKind },
      {
        id: "effective",
        header: copy.colEffective,
        cellKind: { kind: "date" },
      },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: plans.map((plan) => ({
      id: plan.id,
      cells: {
        code: plan.code,
        name: plan.name,
        kind: plan.benefitKind.replaceAll("_", " "),
        effective: formatPlanDate(plan.effectiveFrom),
        status: plan.isActive ? copy.statusActive : copy.statusInactive,
      },
    })),
  }
}

type BenefitEnrollmentsListCopy = {
  empty: string
  colEmployee: string
  colPlan: string
  colState: string
  colCoverage: string
}

export function buildBenefitEnrollmentsListSurfaceConfiguration(
  rows: readonly BenefitEnrollmentListRow[],
  copy: BenefitEnrollmentsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-enrollments" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.enrollments,
      rowKey: "enrollmentId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "plan", header: copy.colPlan },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "coverage", header: copy.colCoverage },
    ],
    rows: rows.map((row) => ({
      id: row.enrollmentId,
      cells: {
        employee: row.employeeLegalName,
        plan: row.benefitName,
        state: row.state,
        coverage: row.coverageLevel ?? "—",
      },
    })),
  }
}

type BenefitOpenEnrollmentListCopy = {
  empty: string
  colName: string
  colPeriod: string
  colStatus: string
  activeLabel: string
  closedLabel: string
}

export function buildBenefitOpenEnrollmentListSurfaceConfiguration(
  rows: readonly BenefitOpenEnrollmentRow[],
  copy: BenefitOpenEnrollmentListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-open-enrollment" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.openEnrollment,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "period", header: copy.colPeriod },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        name: row.name,
        period: `${formatPlanDate(row.startsOn)} — ${formatPlanDate(row.endsOn)}`,
        status: row.isActive ? copy.activeLabel : copy.closedLabel,
      },
    })),
  }
}

type BenefitProvidersListCopy = {
  empty: string
  colCode: string
  colName: string
  colCountries: string
  colExternalRef: string
  colStatus: string
  statusActive: string
  statusInactive: string
}

export function buildBenefitProvidersListSurfaceConfiguration(
  providers: readonly BenefitProviderRow[],
  copy: BenefitProvidersListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-providers" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.providers,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "countries", header: copy.colCountries },
      { id: "externalRef", header: copy.colExternalRef },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: providers.map((provider) => ({
      id: provider.id,
      cells: {
        code: provider.code,
        name: provider.name,
        countries:
          provider.countryCodes.length > 0
            ? provider.countryCodes.join(", ")
            : "—",
        externalRef: provider.externalReference ?? "—",
        status: provider.isActive ? copy.statusActive : copy.statusInactive,
      },
    })),
  }
}

type BenefitClaimReferencesListCopy = {
  empty: string
  colExternalId: string
  colEnrollment: string
  colStatus: string
  colAmount: string
  colPaymentRef: string
  claimStatusLabel: (status: string) => string
  enrollmentLabel: (enrollmentId: string) => string
}

export function buildBenefitClaimReferencesListSurfaceConfiguration(
  rows: readonly BenefitClaimReferenceRow[],
  copy: BenefitClaimReferencesListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-claim-references" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.claimReferences,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "externalId", header: copy.colExternalId },
      { id: "enrollment", header: copy.colEnrollment },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "amount", header: copy.colAmount },
      { id: "paymentRef", header: copy.colPaymentRef },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        externalId: row.externalClaimId,
        enrollment: copy.enrollmentLabel(row.enrollmentId),
        status: isBenefitClaimStatus(row.claimStatus)
          ? copy.claimStatusLabel(row.claimStatus)
          : row.claimStatus,
        amount: row.claimedAmount
          ? `${row.currency} ${row.claimedAmount}`
          : "—",
        paymentRef: row.paymentReference ?? "—",
      },
    })),
  }
}
