import { describe, expect, it } from "vitest"

import { buildCriticalAgingOrbitSignal } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-aging-orbit.shared.ts"

describe("Compliance aging Orbit signal descriptor", () => {
  it("builds a critical escalation payload with compliance linkage", () => {
    expect(
      buildCriticalAgingOrbitSignal({
        candidate: {
          evidenceId: "evidence-critical",
          organizationId: "org-1",
          periodId: "period-1",
          packType: "pcb_2",
          countryCode: "MY",
          rulePackVersion: "my.payroll.2024-08.v1",
          submittedSinceUpdatedAt: new Date("2026-04-11T00:00:00.000Z"),
          ageDays: 31,
        },
        orgSlug: "acme",
      })
    ).toEqual({
      title: "Compliance aging critical: pcb_2",
      description:
        "pcb_2 evidence has been awaiting bureau acknowledgement for 31 days and crossed the critical aging threshold.",
      signalClass: "escalation",
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
        entityId: "evidence-critical",
        displayLabel: "pcb_2 evidence",
        href: "/o/acme/dashboard/hrm/compliance",
        causalityReason:
          "Compliance evidence crossed the critical aging threshold.",
      },
    })
  })
})
