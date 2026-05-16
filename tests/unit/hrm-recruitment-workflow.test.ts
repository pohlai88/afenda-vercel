import { describe, expect, it } from "vitest"

import {
  INTERVIEW_OUTCOME_TO_EVENT,
  canTransitionApplicationStage,
  canTransitionOfferStatus,
  canTransitionRequisitionStatus,
} from "../../lib/features/hrm/data/recruitment-workflow.shared"
import type {
  HrmApplicationStage,
  HrmInterviewOutcome,
  HrmJobOfferStatus,
  HrmJobRequisitionStatus,
} from "../../lib/features/hrm/schemas/recruitment.schema"

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
    expect(canTransitionRequisitionStatus("draft", "cancelled")).toBe(true)
  })

  it("rejects illegal transitions", () => {
    expect(canTransitionRequisitionStatus("draft", "filled")).toBe(false)
    expect(canTransitionRequisitionStatus("cancelled", "open")).toBe(false)
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
      "approved",
      "sent",
      "accepted",
      "rejected",
      "withdrawn",
    ]
    for (const s of statuses) {
      expect(canTransitionOfferStatus(s, s)).toBe(true)
    }
  })

  it("allows draft → approved", () => {
    expect(canTransitionOfferStatus("draft", "approved")).toBe(true)
  })

  it("rejects illegal offer moves", () => {
    expect(canTransitionOfferStatus("draft", "accepted")).toBe(false)
    expect(canTransitionOfferStatus("accepted", "sent")).toBe(false)
  })
})
