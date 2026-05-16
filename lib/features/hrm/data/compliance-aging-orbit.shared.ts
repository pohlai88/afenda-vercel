import { organizationHrmPath } from "../constants"
import type { AgingWatchCandidate } from "./compliance-aging-watch.shared"

export function buildCriticalAgingOrbitSignal(input: {
  candidate: AgingWatchCandidate
  orgSlug: string | null
}) {
  return {
    title: `Compliance aging critical: ${input.candidate.packType}`,
    description: `${input.candidate.packType} evidence has been awaiting bureau acknowledgement for ${input.candidate.ageDays} days and crossed the critical aging threshold.`,
    signalClass: "escalation" as const,
    originatingSystem: "hrm.compliance.aging",
    pressure: {
      urgency: 5,
      impact: 4,
      severity: 5,
      confidence: 5,
      effort: 2,
      escalationLevel: 5,
      temporalProximity: 5,
      ownershipPressure: 4,
    },
    link: {
      module: "hrm",
      entityType: "compliance_evidence",
      entityId: input.candidate.evidenceId,
      displayLabel: `${input.candidate.packType} evidence`,
      href: input.orgSlug
        ? organizationHrmPath(input.orgSlug, "compliance")
        : null,
      causalityReason:
        "Compliance evidence crossed the critical aging threshold.",
    },
  }
}
