import { describe, expect, it } from "vitest"

import {
  INTERVIEW_OUTCOME_TO_EVENT,
  canPublishRequisition,
  canTransitionApplicationStage,
  canTransitionOfferStatus,
  canTransitionRequisitionStatus,
  evaluateScreeningAnswers,
  preEmploymentChecksReadyForHire,
  summarizeInterviewScorecards,
} from "../../lib/features/hrm/talent-management/recruitment-onboarding/data/recruitment-workflow.shared.ts"
import type {
  HrmApplicationStage,
  HrmInterviewOutcome,
  HrmJobOfferStatus,
  HrmJobRequisitionStatus,
} from "../../lib/features/hrm/talent-management/recruitment-onboarding/schemas/recruitment.schema"

describe("INTERVIEW_OUTCOME_TO_EVENT", () => {
  it("maps every canonical interview outcome", () => {
    const outcomes: HrmInterviewOutcome[] = [
      "recommended",
      "not_recommended",
      "needs_follow_up",
      "cancelled",
    ]
    for (const o of outcomes) {
      expect(INTERVIEW_OUTCOME_TO_EVENT[o]).toMatch(/^interview\./)
    }
  })
})

describe("canTransitionRequisitionStatus", () => {
  it("allows identity transitions", () => {
    const statuses: HrmJobRequisitionStatus[] = [
      "draft",
      "pending_approval",
      "approved",
      "open",
      "filled",
      "cancelled",
    ]
    for (const s of statuses) {
      expect(canTransitionRequisitionStatus(s, s)).toBe(true)
    }
  })

  it("allows draft → open and draft → cancelled", () => {
    expect(canTransitionRequisitionStatus("draft", "open")).toBe(true)
    expect(canTransitionRequisitionStatus("draft", "pending_approval")).toBe(
      true
    )
    expect(canTransitionRequisitionStatus("pending_approval", "approved")).toBe(
      true
    )
    expect(canTransitionRequisitionStatus("draft", "cancelled")).toBe(true)
  })

  it("rejects illegal transitions", () => {
    expect(canTransitionRequisitionStatus("draft", "filled")).toBe(false)
    expect(canTransitionRequisitionStatus("cancelled", "open")).toBe(false)
  })
})

describe("canPublishRequisition", () => {
  it("blocks posting while approval is pending", () => {
    expect(
      canPublishRequisition({ status: "approved", approvalState: "pending" })
    ).toBe(false)
  })

  it("allows posting approved or approval-free drafts", () => {
    expect(
      canPublishRequisition({ status: "approved", approvalState: "approved" })
    ).toBe(true)
    expect(
      canPublishRequisition({ status: "draft", approvalState: "not_required" })
    ).toBe(true)
  })
})

describe("canTransitionApplicationStage", () => {
  it("allows identity transitions for every stage", () => {
    const stages: HrmApplicationStage[] = [
      "applied",
      "screening",
      "interview",
      "offer",
      "hired",
      "rejected",
    ]
    for (const s of stages) {
      expect(canTransitionApplicationStage(s, s)).toBe(true)
    }
  })

  it("allows applied → screening and screening → interview", () => {
    expect(canTransitionApplicationStage("applied", "screening")).toBe(true)
    expect(canTransitionApplicationStage("screening", "interview")).toBe(true)
  })

  it("rejects backwards / illegal moves", () => {
    expect(canTransitionApplicationStage("screening", "applied")).toBe(false)
    expect(canTransitionApplicationStage("hired", "offer")).toBe(false)
    expect(canTransitionApplicationStage("rejected", "screening")).toBe(false)
  })
})

describe("canTransitionOfferStatus", () => {
  it("allows identity for every offer status", () => {
    const statuses: HrmJobOfferStatus[] = [
      "draft",
      "pending_approval",
      "approved",
      "sent",
      "accepted",
      "declined",
      "withdrawn",
      "expired",
    ]
    for (const s of statuses) {
      expect(canTransitionOfferStatus(s, s)).toBe(true)
    }
  })

  it("allows draft → approved", () => {
    expect(canTransitionOfferStatus("draft", "pending_approval")).toBe(true)
    expect(canTransitionOfferStatus("pending_approval", "approved")).toBe(true)
  })

  it("rejects illegal offer moves", () => {
    expect(canTransitionOfferStatus("draft", "accepted")).toBe(false)
    expect(canTransitionOfferStatus("accepted", "sent")).toBe(false)
  })
})

describe("evaluateScreeningAnswers", () => {
  it("fails knockout questions when expected answers do not match", () => {
    expect(
      evaluateScreeningAnswers(
        [{ id: "q1", isKnockout: true, expectedAnswer: "yes" }],
        [{ questionId: "q1", answer: "no" }]
      )
    ).toEqual({
      outcome: "failed",
      failedKnockoutQuestionIds: ["q1"],
    })
  })
})

describe("summarizeInterviewScorecards", () => {
  it("aggregates panel recommendation and average rating", () => {
    const summary = summarizeInterviewScorecards([
      { recommendation: "yes", overallRating: 4 },
      { recommendation: "strong_yes", overallRating: 5 },
    ])
    expect(summary.recommendation).toBe("strong_yes")
    expect(summary.averageRating).toBe(4.5)
    expect(summary.scorecardCount).toBe(2)
  })
})

describe("preEmploymentChecksReadyForHire", () => {
  it("requires all recorded checks to pass or be waived", () => {
    expect(preEmploymentChecksReadyForHire(["passed", "waived"])).toBe(true)
    expect(preEmploymentChecksReadyForHire(["passed", "pending"])).toBe(false)
  })
})
