import type { DocumentExpiryTier } from "./employee-management/documents-management/data/document-expiry-watch.shared"

/**
 * HR pressure rows for the Nexus snapshot — Phase 4.
 *
 * Returned by `listHrmHighPressureForNexus`. The Nexus side owns the
 * projection into `OperationalPressureItem` (see
 * `mapHrmPressureRowsToOperationalPressureItems` in
 * `lib/features/nexus/data/nexus-operational-pressure-map.shared.ts`).
 * Keeping the projection out of HRM avoids a cross-module cycle and
 * lets Nexus localize surface-label semantics in one place.
 *
 * The shape is intentionally narrower than `PlannerPressureRowForNexus`:
 * HR rows have no temporal-spine, no signal taxonomy, and no Orbit
 * lifecycle state — coercing them into the Planner shape would lie
 * about the data.
 */
export type HrmPressureRowForNexus =
  | {
      readonly kind: "claim_pending"
      readonly id: string
      readonly title: string
      readonly description: string | null
      readonly displayPriority: "critical" | "high" | "medium"
      readonly submittedAt: Date | null
      readonly evidenceCount: number
    }
  | {
      readonly kind: "leave_pending_approval"
      readonly id: string
      readonly title: string
      readonly description: string | null
      readonly displayPriority: "critical" | "high" | "medium"
      readonly requestedAt: Date | null
    }
  | {
      readonly kind: "document_expiring"
      readonly id: string
      readonly title: string
      readonly description: string | null
      readonly displayPriority: "critical" | "high" | "medium"
      readonly daysToExpiry: number
      readonly tier: DocumentExpiryTier
      readonly documentType: string
      readonly employeeId: string | null
      readonly employeeName: string | null
    }
  | {
      readonly kind: "compliance_failed"
      readonly id: string
      readonly title: string
      readonly description: string | null
      readonly displayPriority: "critical" | "high" | "medium"
      readonly packType: string
      readonly countryCode: string
    }

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function leavePriorityForAge(
  ageMs: number | null
): "critical" | "high" | "medium" {
  if (!ageMs) return "medium"
  const ageDays = Math.floor(ageMs / MS_PER_DAY)
  if (ageDays >= 7) return "critical"
  if (ageDays >= 3) return "high"
  return "medium"
}

export function claimPriorityForAge(
  ageMs: number | null
): "critical" | "high" | "medium" {
  if (!ageMs) return "medium"
  const ageDays = Math.floor(ageMs / MS_PER_DAY)
  if (ageDays >= 14) return "critical"
  if (ageDays >= 5) return "high"
  return "medium"
}

export function documentPriorityForTier(
  tier: DocumentExpiryTier
): "critical" | "high" | "medium" {
  if (tier === "critical_7d") return "critical"
  if (tier === "warning_14d") return "high"
  return "medium"
}

/**
 * Pure: orders pressure rows by display priority then trims to `limit`.
 * Critical → high → medium; ties are broken by insertion order so the
 * caller controls intra-priority ordering.
 */
export function mergeAndTrimPressureRows(
  rows: HrmPressureRowForNexus[],
  limit: number
): HrmPressureRowForNexus[] {
  const priorityRank: Record<
    HrmPressureRowForNexus["displayPriority"],
    number
  > = {
    critical: 0,
    high: 1,
    medium: 2,
  }
  return [...rows]
    .sort(
      (a, b) =>
        priorityRank[a.displayPriority] - priorityRank[b.displayPriority]
    )
    .slice(0, limit)
}
