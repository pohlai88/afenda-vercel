import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import { BENEFIT_LIST_SURFACE_IDS } from "./benefit-surface-metadata.shared"
import { isBenefitClaimStatus } from "./benefit-helpers.shared"
import type { BenefitClaimReferenceRow } from "./benefit-claim-reference.queries.server"
import type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
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
  colCoverage: string
  colState: string
  colEffective: string
  formatEmployee: (row: BenefitEnrollmentListRow) => string
  formatPlan: (row: BenefitEnrollmentListRow) => string
  formatCoverage: (row: BenefitEnrollmentListRow) => string
  formatState: (row: BenefitEnrollmentListRow) => string
  formatEffective: (row: BenefitEnrollmentListRow) => string
}

function enrollmentTrailingState(state: string): "ready" | "hidden" {
  if (state === "pending" || state === "active" || state === "suspended") {
    return "ready"
  }
  return "hidden"
}

export function buildBenefitEnrollmentsListSurfaceConfiguration(
  rows: readonly BenefitEnrollmentListRow[],
  copy: BenefitEnrollmentsListCopy,
  options: { showTrailing: boolean }
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
      { id: "coverage", header: copy.colCoverage },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "effective",
        header: copy.colEffective,
        cellKind: { kind: "date" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.enrollmentId,
      cells: {
        employee: copy.formatEmployee(row),
        plan: copy.formatPlan(row),
        coverage: copy.formatCoverage(row),
        state: copy.formatState(row),
        effective: copy.formatEffective(row),
      },
      trailingAction: options.showTrailing
        ? { state: enrollmentTrailingState(row.state) }
        : { state: "hidden" },
    })),
  }
}

type BenefitOpenEnrollmentListCopy = {
  empty: string
  colName: string
  colPeriod: string
  colPlans: string
  colStatus: string
  activeLabel: string
  closedLabel: string
  allPlansLabel: string
}

export function buildBenefitOpenEnrollmentListSurfaceConfiguration(
  rows: readonly BenefitOpenEnrollmentRow[],
  copy: BenefitOpenEnrollmentListCopy,
  options: { showTrailing: boolean }
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
      { id: "plans", header: copy.colPlans },
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
        plans:
          row.planIds.length > 0
            ? String(row.planIds.length)
            : copy.allPlansLabel,
        status: row.isActive ? copy.activeLabel : copy.closedLabel,
      },
      trailingAction:
        options.showTrailing && row.isActive
          ? { state: "ready" as const }
          : { state: "hidden" as const },
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

type BenefitLifeEventsListCopy = {
  empty: string
  colDate: string
  colEmployee: string
  colEvent: string
  colStatus: string
  eventTypeLabel: (eventType: string) => string
  verificationStatusLabel: (status: string) => string
  formatEventDate: (value: Date) => string
}

export function buildBenefitLifeEventsListSurfaceConfiguration(
  rows: readonly BenefitLifeEventRow[],
  copy: BenefitLifeEventsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BENEFIT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-life-events" },
      columnsId: BENEFIT_LIST_SURFACE_IDS.lifeEvents,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "date",
        header: copy.colDate,
        cellKind: { kind: "date" },
      },
      { id: "employee", header: copy.colEmployee },
      { id: "event", header: copy.colEvent },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        date: copy.formatEventDate(row.eventDate),
        employee: row.employeeLegalName,
        event: copy.eventTypeLabel(row.eventType),
        status: copy.verificationStatusLabel(row.verificationStatus),
      },
    })),
  }
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
