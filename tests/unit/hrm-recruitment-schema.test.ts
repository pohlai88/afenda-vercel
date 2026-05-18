import { describe, expect, it } from "vitest"

import {
  advanceApplicationStageFormSchema,
  cancelJobRequisitionFormSchema,
  convertAcceptedOfferFormSchema,
  createCandidateApplicationFormSchema,
  createJobOfferFormSchema,
  createJobRequisitionFormSchema,
  decideRequisitionApprovalFormSchema,
  evaluateScreeningFormSchema,
  publishJobRequisitionFormSchema,
  recordAssessmentResultFormSchema,
  recordPreEmploymentCheckFormSchema,
  recordRecruitmentCommunicationFormSchema,
  requestRequisitionApprovalFormSchema,
  scheduleInterviewFormSchema,
  submitInterviewScorecardFormSchema,
  submitInterviewFeedbackFormSchema,
  updateJobOfferStatusFormSchema,
} from "../../lib/features/hrm/talent-management/recruitment-onboarding/schemas/recruitment.schema"

const ORG = "acme"
const UUID = "11111111-1111-4111-8111-111111111111"

describe("recruitment Zod schemas", () => {
  it("accepts minimal valid createJobRequisitionFormSchema payloads", () => {
    const ok = createJobRequisitionFormSchema.safeParse({
      orgSlug: ORG,
      title: "Staff Engineer",
      requisitionType: "replacement",
      departmentId: "",
      headcount: "2",
      budgetReference: "BUD-1",
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
        channel: "career_site",
      }).success
    ).toBe(true)
    expect(
      cancelJobRequisitionFormSchema.safeParse({
        orgSlug: ORG,
        requisitionId: UUID,
      }).success
    ).toBe(true)
  })

  it("accepts requisition approval request and decision forms", () => {
    expect(
      requestRequisitionApprovalFormSchema.safeParse({
        orgSlug: ORG,
        requisitionId: UUID,
        approverUserId: "",
      }).success
    ).toBe(true)
    expect(
      decideRequisitionApprovalFormSchema.safeParse({
        orgSlug: ORG,
        approvalId: UUID,
        decision: "approved",
        decisionNote: "",
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

    expect(
      submitInterviewScorecardFormSchema.safeParse({
        orgSlug: ORG,
        interviewId: UUID,
        recommendation: "yes",
        overallRating: "4",
        comments: "",
      }).success
    ).toBe(true)
  })

  it("accepts screening, assessment, communication, and check payloads", () => {
    expect(
      evaluateScreeningFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        outcome: "manual_review",
      }).success
    ).toBe(true)
    expect(
      recordAssessmentResultFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        assessmentType: "technical",
        status: "completed",
        score: "92.50",
      }).success
    ).toBe(true)
    expect(
      recordRecruitmentCommunicationFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        candidateId: "",
        communicationType: "interview_invitation",
      }).success
    ).toBe(true)
    expect(
      recordPreEmploymentCheckFormSchema.safeParse({
        orgSlug: ORG,
        applicationId: UUID,
        checkType: "right_to_work",
        status: "passed",
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
      updateJobOfferStatusFormSchema.safeParse({
        orgSlug: ORG,
        offerId: UUID,
        status: "declined",
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
