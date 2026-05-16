import { describe, expect, it } from "vitest"

import {
  advanceApplicationStageFormSchema,
  cancelJobRequisitionFormSchema,
  convertAcceptedOfferFormSchema,
  createCandidateApplicationFormSchema,
  createJobOfferFormSchema,
  createJobRequisitionFormSchema,
  publishJobRequisitionFormSchema,
  scheduleInterviewFormSchema,
  submitInterviewFeedbackFormSchema,
  updateJobOfferStatusFormSchema,
} from "../../lib/features/hrm/schemas/recruitment.schema"

const ORG = "acme"
const UUID = "11111111-1111-4111-8111-111111111111"

describe("recruitment Zod schemas", () => {
  it("accepts minimal valid createJobRequisitionFormSchema payloads", () => {
    const ok = createJobRequisitionFormSchema.safeParse({
      orgSlug: ORG,
      title: "Staff Engineer",
      departmentId: "",
      headcount: "2",
    })
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.data.title).toBe("Staff Engineer")
      expect(ok.data.headcount).toBe(2)
    }
  })

  it("rejects empty title on createJobRequisitionFormSchema", () => {
    const bad = createJobRequisitionFormSchema.safeParse({
      orgSlug: ORG,
      title: "",
    })
    expect(bad.success).toBe(false)
  })

  it("accepts publish / cancel requisition forms with UUID", () => {
    expect(
      publishJobRequisitionFormSchema.safeParse({
        orgSlug: ORG,
        requisitionId: UUID,
      }).success
    ).toBe(true)
    expect(
      cancelJobRequisitionFormSchema.safeParse({
        orgSlug: ORG,
        requisitionId: UUID,
      }).success
    ).toBe(true)
  })

  it("accepts candidate application and stage advance payloads", () => {
    expect(
      createCandidateApplicationFormSchema.safeParse({
        orgSlug: ORG,
        requisitionId: UUID,
        legalName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "",
        source: "",
      }).success
    ).toBe(true)

    expect(
      advanceApplicationStageFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        stage: "screening",
      }).success
    ).toBe(true)
  })

  it("accepts interview schedule + feedback payloads", () => {
    expect(
      scheduleInterviewFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        interviewerUserId: "22222222-2222-4222-8222-222222222222",
        scheduledAt: "2026-05-01T10:00:00.000Z",
      }).success
    ).toBe(true)

    expect(
      submitInterviewFeedbackFormSchema.safeParse({
        orgSlug: ORG,
        interviewId: UUID,
        outcome: "recommended",
        feedback: "",
      }).success
    ).toBe(true)
  })

  it("validates offer compensation amount pattern", () => {
    const good = createJobOfferFormSchema.safeParse({
      orgSlug: ORG,
      applicationId: UUID,
      compensationAmount: "1234.50",
      compensationCurrency: "myr",
      proposedStartDate: "",
      expiresAt: "",
      notes: "",
    })
    expect(good.success).toBe(true)
    if (good.success) {
      expect(good.data.compensationCurrency).toBe("MYR")
    }

    const bad = createJobOfferFormSchema.safeParse({
      orgSlug: ORG,
      applicationId: UUID,
      compensationAmount: "12.345",
    })
    expect(bad.success).toBe(false)
  })

  it("accepts update offer status and convert-offer forms", () => {
    expect(
      updateJobOfferStatusFormSchema.safeParse({
        orgSlug: ORG,
        offerId: UUID,
        status: "sent",
      }).success
    ).toBe(true)

    expect(
      convertAcceptedOfferFormSchema.safeParse({
        orgSlug: ORG,
        offerId: UUID,
        employeeNumber: "E-1001",
      }).success
    ).toBe(true)
  })
})
