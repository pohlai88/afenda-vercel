CREATE TABLE "accounting_journal_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"sourceModule" text NOT NULL,
	"sourceObject" text NOT NULL,
	"sourceId" text NOT NULL,
	"reference" text NOT NULL,
	"currency" text NOT NULL,
	"sourceHash" text NOT NULL,
	"closeSnapshotHash" text NOT NULL,
	"totalDebits" numeric(15, 2) DEFAULT '0' NOT NULL,
	"totalCredits" numeric(15, 2) DEFAULT '0' NOT NULL,
	"netBalance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"journalLines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"postedByUserId" text,
	"postedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ask_docs_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"user_id" text,
	"session_id" text,
	"locale" text NOT NULL,
	"page_path" text NOT NULL,
	"rating" integer NOT NULL,
	"message" text,
	"source" text DEFAULT 'ask-docs' NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ask_docs_feedback_rating_chk" CHECK ("ask_docs_feedback"."rating" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e_invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"templateCode" text NOT NULL,
	"series" text NOT NULL,
	"invoiceNumber" text NOT NULL,
	"issueDate" date NOT NULL,
	"buyerName" text NOT NULL,
	"buyerTaxCode" text,
	"currency" text DEFAULT 'VND' NOT NULL,
	"totalAmountVnd" numeric(18, 0) NOT NULL,
	"vatRateBps" integer DEFAULT 0 NOT NULL,
	"xmlPayload" text NOT NULL,
	"providerReference" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "e_invoice_transmission" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"eInvoiceId" text NOT NULL,
	"channel" text DEFAULT 'mock' NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"requestXml" text,
	"responseXml" text,
	"errorCode" text,
	"errorMessage" text,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"lastAttemptAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_role" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_role_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"roleId" text NOT NULL,
	"userId" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assignedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"roleId" text NOT NULL,
	"module" text NOT NULL,
	"object" text NOT NULL,
	"function" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"grantedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_application" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"candidateId" text NOT NULL,
	"requisitionId" text NOT NULL,
	"stage" text DEFAULT 'applied' NOT NULL,
	"screeningOutcome" text,
	"screeningSnapshot" jsonb,
	"convertedEmployeeId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subjectKind" text NOT NULL,
	"subjectId" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"requestedByUserId" text NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"currentApproverUserId" text,
	"decisionByUserId" text,
	"decisionAt" timestamp,
	"decisionNote" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_attendance_day" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"attendanceDate" date NOT NULL,
	"firstClockInAt" timestamp,
	"lastClockOutAt" timestamp,
	"scheduledMinutes" integer DEFAULT 0 NOT NULL,
	"workedMinutes" integer DEFAULT 0 NOT NULL,
	"breakMinutes" integer DEFAULT 0 NOT NULL,
	"lateMinutes" integer DEFAULT 0 NOT NULL,
	"earlyOutMinutes" integer DEFAULT 0 NOT NULL,
	"overtimeMinutes" integer DEFAULT 0 NOT NULL,
	"absenceCode" text,
	"state" text DEFAULT 'open' NOT NULL,
	"lockedByPayrollPeriodId" text,
	"derivedFromEventChecksum" text,
	"calculationSnapshot" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_attendance_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eventType" text NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"source" text NOT NULL,
	"sourceRef" text,
	"correctionOfEventId" text,
	"correctionReason" text,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"deviceId" text,
	"importBatchId" text,
	"rawPayloadHash" text,
	"metadata" jsonb,
	"checkInIp" text,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"benefitKind" text DEFAULT 'other' NOT NULL,
	"benefitType" text,
	"benefitCategory" text,
	"providerId" text,
	"scopeCountryCodes" jsonb,
	"scopeLegalEntityCodes" jsonb,
	"planYear" integer,
	"carrierName" text,
	"providerName" text,
	"policyReference" text,
	"eligibilityRules" jsonb,
	"rateTableVersion" text,
	"rateTable" jsonb,
	"employerContributionType" text DEFAULT 'none' NOT NULL,
	"employerContributionValue" numeric(15, 4),
	"employeeContributionType" text DEFAULT 'none' NOT NULL,
	"employeeContributionValue" numeric(15, 4),
	"coverageLevels" jsonb,
	"waitingPeriodDays" integer DEFAULT 0 NOT NULL,
	"maxAnnualAmount" numeric(15, 2),
	"effectiveFrom" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_claim_reference" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"enrollmentId" text NOT NULL,
	"providerId" text,
	"externalClaimId" text NOT NULL,
	"claimStatus" text DEFAULT 'submitted' NOT NULL,
	"claimedAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"paymentReference" text,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"benefitId" text NOT NULL,
	"employeeId" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"coverageLevel" text,
	"effectiveFrom" timestamp,
	"effectiveTo" timestamp,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligibilityOverrideApprovedByUserId" text,
	"eligibilityOverrideReason" text,
	"employerContributionAmount" numeric(15, 2),
	"employeeContributionAmount" numeric(15, 2),
	"waivedReason" text,
	"enrolledAt" timestamp DEFAULT now() NOT NULL,
	"terminatedAt" timestamp,
	"terminationReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_enrollment_dependent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"enrollmentId" text NOT NULL,
	"employeeId" text NOT NULL,
	"dependentId" text NOT NULL,
	"effectiveFrom" timestamp NOT NULL,
	"effectiveTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_life_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eventType" text NOT NULL,
	"eventDate" timestamp NOT NULL,
	"notes" text,
	"verificationStatus" text DEFAULT 'pending' NOT NULL,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"verificationNote" text,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_open_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"startsOn" timestamp NOT NULL,
	"endsOn" timestamp NOT NULL,
	"planIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"countryCodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"externalReference" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_boarding_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"employeeId" text NOT NULL,
	"contractId" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"templateId" text,
	"sourceTemplateCode" text,
	"sourceTemplateVersion" integer DEFAULT 1 NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"cancelledAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_boarding_task" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"instanceId" text NOT NULL,
	"templateTaskId" text,
	"taskKey" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ownerRole" text,
	"ownerUserId" text,
	"dueAt" date,
	"required" boolean DEFAULT true NOT NULL,
	"category" text DEFAULT 'hr' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"blockedReason" text,
	"blockedAt" timestamp,
	"blockedByUserId" text,
	"completedAt" timestamp,
	"completedByUserId" text,
	"waivedAt" timestamp,
	"waivedByUserId" text,
	"waiverReason" text,
	"evidenceDocumentId" text,
	"evidenceNote" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_boarding_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"versionNumber" integer DEFAULT 1 NOT NULL,
	"appliesTo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_boarding_template_task" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"templateId" text NOT NULL,
	"taskKey" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ownerRole" text,
	"ownerUserId" text,
	"dueOffsetDays" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"category" text DEFAULT 'hr' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"payoutId" text NOT NULL,
	"adjustmentType" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"approvalReference" text,
	"adjustedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"cycleId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eligibilityState" text DEFAULT 'eligible' NOT NULL,
	"eligibilitySnapshot" jsonb,
	"assignedByUserId" text,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_clawback" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"payoutId" text NOT NULL,
	"clawbackType" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"recoveryState" text DEFAULT 'recorded' NOT NULL,
	"recoveryReference" text,
	"recordedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"cutoffDate" date,
	"approvalDate" date,
	"payoutDate" date NOT NULL,
	"payrollPeriodId" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"calculationSnapshot" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_payout" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"cycleId" text NOT NULL,
	"assignmentId" text,
	"employeeId" text NOT NULL,
	"payoutNumber" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"targetAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"achievementPercent" numeric(9, 4) DEFAULT '0' NOT NULL,
	"calculatedAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"adjustedAmount" numeric(15, 2),
	"approvedAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"calculationSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validationFlags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prorationFactor" numeric(9, 6) DEFAULT '1' NOT NULL,
	"multiplierSnapshot" jsonb,
	"accountingAllocation" jsonb,
	"currentApprovalId" text,
	"payrollPeriodId" text,
	"paidByPayrollLineId" text,
	"paidAt" timestamp,
	"lockedAt" timestamp,
	"lockedByUserId" text,
	"rejectionReason" text,
	"returnedReason" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planType" text NOT NULL,
	"payoutFormulaType" text NOT NULL,
	"payoutFormulaConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eligibilityRules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"targetType" text DEFAULT 'individual' NOT NULL,
	"capAmount" numeric(15, 2),
	"floorAmount" numeric(15, 2),
	"guaranteedAmount" numeric(15, 2),
	"defaultCurrency" text DEFAULT 'MYR' NOT NULL,
	"defaultPayrollLineCode" text DEFAULT 'BONUS_INCENTIVE' NOT NULL,
	"accountingAllocation" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_target" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"assignmentId" text,
	"employeeId" text,
	"targetScope" text NOT NULL,
	"targetMetric" text NOT NULL,
	"targetValue" numeric(18, 4) DEFAULT '0' NOT NULL,
	"actualValue" numeric(18, 4),
	"achievementPercent" numeric(9, 4),
	"weight" numeric(9, 4) DEFAULT '1',
	"sourceReference" text,
	"enteredByUserId" text,
	"enteredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_candidate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"legalName" text NOT NULL,
	"email" text,
	"phone" text,
	"resumeUrl" text,
	"parsedResume" jsonb,
	"parsedResumeAt" timestamp,
	"source" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"claimNumber" text,
	"employeeId" text NOT NULL,
	"claimTypeId" text NOT NULL,
	"claimDate" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"description" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"submittedAt" timestamp,
	"submittedByUserId" text,
	"currentApprovalId" text,
	"decidedByUserId" text,
	"decidedAt" timestamp,
	"rejectedReason" text,
	"paidByPayrollLineId" text,
	"paidAt" timestamp,
	"cancelledAt" timestamp,
	"cancelledReason" text,
	"policyVersion" text,
	"policySnapshot" jsonb,
	"payoutMethod" text DEFAULT 'payroll' NOT NULL,
	"financeAccountCode" text,
	"costCenterCode" text,
	"projectCode" text,
	"taxTreatment" text DEFAULT 'non_taxable_reimbursement' NOT NULL,
	"expenseFundId" text,
	"reimbursementMode" text,
	"requestedAmount" numeric(15, 2),
	"approvedAmount" numeric(15, 2),
	"rejectedAmount" numeric(15, 2),
	"offsetAmount" numeric(15, 2),
	"claimCurrency" text,
	"reimbursementCurrency" text,
	"fxRate" numeric(18, 8),
	"fxRateAsOf" timestamp,
	"fxRateSource" text,
	"fxSnapshot" jsonb,
	"eligibilitySnapshot" jsonb,
	"validationFlags" jsonb,
	"requiresExceptionApproval" boolean DEFAULT false NOT NULL,
	"exceptionApprovedByUserId" text,
	"exceptionApprovedAt" timestamp,
	"exceptionReason" text,
	"duplicateReviewStatus" text,
	"returnedReason" text,
	"paymentReference" text,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"audit7w1h" jsonb,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_claim_duplicate_signal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"claimId" text NOT NULL,
	"signalKind" text NOT NULL,
	"matchedClaimId" text,
	"score" numeric(8, 4) NOT NULL,
	"signalPayload" jsonb,
	"reviewDecision" text DEFAULT 'pending' NOT NULL,
	"overrideReason" text,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_claim_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"claimId" text NOT NULL,
	"documentId" text NOT NULL,
	"evidenceType" text DEFAULT 'receipt' NOT NULL,
	"notes" text,
	"uploadedByUserId" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_claim_type" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"defaultPayrollLineCode" text DEFAULT 'ALLOWANCE_CLAIM' NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"perClaimLimit" numeric(15, 2),
	"periodLimit" numeric(15, 2),
	"annualLimit" numeric(15, 2),
	"evidenceRequiredAboveAmount" numeric(15, 2),
	"requiresEvidence" boolean DEFAULT true NOT NULL,
	"defaultPayoutMethod" text DEFAULT 'payroll' NOT NULL,
	"defaultFinanceAccountCode" text,
	"defaultCostCenterCode" text,
	"defaultTaxTreatment" text DEFAULT 'non_taxable_reimbursement' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compensation_component" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"taxTreatment" text DEFAULT 'taxable' NOT NULL,
	"statutoryBaseTreatment" text DEFAULT 'included' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_compliance_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text,
	"countryCode" text NOT NULL,
	"packType" text NOT NULL,
	"inputHash" text NOT NULL,
	"outputHash" text NOT NULL,
	"payloadDocumentId" text,
	"rulePackVersion" text NOT NULL,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"generatedByUserId" text,
	"generatedByRunId" text,
	"submissionState" text DEFAULT 'draft' NOT NULL,
	"submissionDeliveryId" text,
	"externalReference" text,
	"acknowledgedAt" timestamp,
	"acknowledgedByUserId" text,
	"acknowledgementSource" text,
	"authorityPayloadHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compliance_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text,
	"complianceArea" text NOT NULL,
	"itemType" text NOT NULL,
	"sourceReferenceId" text,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"correctiveActionOwnerUserId" text,
	"correctiveActionDueDate" date,
	"correctiveActionDescription" text,
	"correctiveActionProgressNote" text,
	"correctiveActionEvidenceDocumentId" text,
	"correctiveActionUpdatedAt" timestamp,
	"isAutoGenerated" boolean DEFAULT false NOT NULL,
	"resolutionNote" text,
	"resolvedEvidenceDocumentId" text,
	"resolvedAt" timestamp,
	"resolvedByUserId" text,
	"waivedAt" timestamp,
	"waivedByUserId" text,
	"waiverReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compliance_filing" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"title" text NOT NULL,
	"filingCategory" text NOT NULL,
	"countryCode" text,
	"legalEntityCode" text,
	"legalEntityName" text,
	"workLocationCode" text,
	"employmentType" text,
	"workerCategory" text,
	"filingAuthority" text,
	"referenceCode" text,
	"dueDate" date NOT NULL,
	"coveragePeriod" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedAt" timestamp,
	"submittedByUserId" text,
	"confirmedAt" timestamp,
	"confirmationReference" text,
	"evidenceDocumentId" text,
	"waivedAt" timestamp,
	"waivedByUserId" text,
	"waiverReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compliance_obligation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"complianceArea" text NOT NULL,
	"requirementKind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"countryCode" text,
	"legalEntityCode" text,
	"departmentId" text,
	"workLocationCode" text,
	"employmentType" text,
	"workerCategory" text,
	"policyId" text,
	"policyVersion" text,
	"acknowledgementDeadline" date,
	"dueDate" date,
	"alertLeadDays" integer DEFAULT 7 NOT NULL,
	"sourceReferenceId" text,
	"metadata" jsonb,
	"effectiveFrom" date,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_contract_compensation_line" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contractId" text NOT NULL,
	"componentId" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_country_rule_pack" (
	"id" text PRIMARY KEY NOT NULL,
	"countryCode" text NOT NULL,
	"version" text NOT NULL,
	"effectiveFrom" text NOT NULL,
	"effectiveTo" text,
	"manifest" jsonb NOT NULL,
	"publishedByUserId" text,
	"publishedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_department" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"orgUnitType" text DEFAULT 'department' NOT NULL,
	"orgUnitStatus" text DEFAULT 'active' NOT NULL,
	"parentDepartmentId" text,
	"headEmployeeId" text,
	"costCenterCode" text,
	"workLocationCode" text,
	"effectiveFrom" date,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_dependent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"legalName" text NOT NULL,
	"relationship" text NOT NULL,
	"dateOfBirth" date,
	"taxDependent" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"documentSetId" text,
	"previousDocumentId" text,
	"employeeId" text,
	"legalEntityId" text,
	"documentType" text NOT NULL,
	"documentGroup" text,
	"subjectKind" text,
	"subjectId" text,
	"title" text NOT NULL,
	"blobUrl" text NOT NULL,
	"payloadHash" text NOT NULL,
	"mimeType" text NOT NULL,
	"sizeBytes" integer NOT NULL,
	"classification" text DEFAULT 'internal' NOT NULL,
	"retentionPolicyCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"signedByUserId" text,
	"signedAt" timestamp,
	"replacedByDocumentId" text,
	"uploadedByUserId" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"verificationStatus" text DEFAULT 'pending' NOT NULL,
	"documentLifecycleStatus" text DEFAULT 'active' NOT NULL,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"rejectionReason" text,
	"versionNumber" integer,
	"isLatestVersion" boolean DEFAULT true NOT NULL,
	"isMandatory" boolean DEFAULT false NOT NULL,
	"retentionUntil" date,
	"archivedAt" timestamp,
	"archivedByUserId" text,
	"deletedAt" timestamp,
	"deletedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_document_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"documentType" text NOT NULL,
	"documentGroup" text NOT NULL,
	"legalEntityId" text,
	"employmentType" text,
	"isMandatory" boolean DEFAULT true NOT NULL,
	"allowEmployeeSubmission" boolean DEFAULT false NOT NULL,
	"allowEmployeeAccess" boolean DEFAULT false NOT NULL,
	"requiresExpiryDate" boolean DEFAULT false NOT NULL,
	"retentionPolicyCode" text,
	"status" text DEFAULT 'active' NOT NULL,
	"effectiveFrom" date,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_document_retention_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"documentGroup" text,
	"documentType" text,
	"retentionPeriodDays" integer NOT NULL,
	"archiveAfterSeparation" boolean DEFAULT true NOT NULL,
	"deleteAfterRetention" boolean DEFAULT false NOT NULL,
	"anonymizeAfterRetention" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeNumber" text NOT NULL,
	"legalName" text NOT NULL,
	"preferredName" text,
	"dateOfBirth" date,
	"gender" text,
	"nationality" text,
	"idDocumentType" text,
	"idDocumentNumber" text,
	"email" text,
	"phone" text,
	"address" jsonb,
	"countryCode" text,
	"workStateCode" text,
	"linkedUserId" text,
	"employmentStatus" text DEFAULT 'active' NOT NULL,
	"employmentStartDate" date,
	"probationEndDate" date,
	"confirmationDate" date,
	"currentDepartmentId" text,
	"currentPositionId" text,
	"currentJobGradeId" text,
	"managerEmployeeId" text,
	"dottedLineManagerId" text,
	"currentEmploymentContractId" text,
	"employmentType" text,
	"hrOwnerEmployeeId" text,
	"workerCategory" text,
	"employeeLevel" text,
	"suspendedAt" timestamp,
	"suspensionReason" text,
	"suspensionApprovalReference" text,
	"resignationDate" date,
	"lastWorkingDate" date,
	"retirementDate" date,
	"audit7w1h" jsonb,
	"archivedAt" timestamp,
	"archivedByUserId" text,
	"archivedReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"scenarioId" text,
	"scenarioVersion" integer,
	"simulationSeed" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"departmentId" text,
	"positionId" text,
	"jobGradeId" text,
	"managerEmployeeId" text,
	"costCenterCode" text,
	"workLocationCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"status" text DEFAULT 'active' NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_change_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"fieldName" text NOT NULL,
	"oldValue" jsonb,
	"newValue" jsonb,
	"changedByUserId" text NOT NULL,
	"changedAt" timestamp DEFAULT now() NOT NULL,
	"effectiveDate" date,
	"reason" text,
	"approvalReference" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_contact_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"workEmail" text,
	"workPhone" text,
	"personalEmail" text,
	"personalPhone" text,
	"address" jsonb,
	"mailingAddress" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_emergency_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"legalName" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"alternatePhone" text,
	"email" text,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_identity_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"documentType" text NOT NULL,
	"documentNumber" text NOT NULL,
	"issuingCountry" text NOT NULL,
	"issuedAt" date,
	"expiresAt" date,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"verificationStatus" text DEFAULT 'unverified' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_personal_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"dateOfBirth" date,
	"gender" text,
	"nationality" text,
	"maritalStatus" text,
	"languagePreference" text,
	"primaryIdentityDocumentId" text,
	"profilePhotoBlobUrl" text,
	"profilePhotoUpdatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_reporting_relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"managerEmployeeId" text NOT NULL,
	"relationshipType" text NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"status" text DEFAULT 'active' NOT NULL,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_skill" (
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"skillId" text NOT NULL,
	"proficiency" integer NOT NULL,
	"validityFrom" date NOT NULL,
	"validityTo" date,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_employee_skill_employeeId_skillId_pk" PRIMARY KEY("employeeId","skillId"),
	CONSTRAINT "hrm_employee_skill_proficiency_range" CHECK ("hrm_employee_skill"."proficiency" >= 1 AND "hrm_employee_skill"."proficiency" <= 5)
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_work_authorization" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"countryCode" text NOT NULL,
	"authorizationType" text NOT NULL,
	"documentNumber" text,
	"issuedAt" date,
	"expiresAt" date,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employment_contract" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"versionNumber" integer NOT NULL,
	"contractType" text NOT NULL,
	"state" text NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"probationEndDate" date,
	"confirmationDate" date,
	"terminationDate" date,
	"terminationReason" text,
	"terminationNoticeDays" integer,
	"onboardingChecklist" jsonb,
	"positionId" text,
	"departmentId" text,
	"jobGradeId" text,
	"workingPatternId" text,
	"baseSalaryAmount" numeric(15, 2),
	"baseSalaryCurrency" text DEFAULT 'MYR' NOT NULL,
	"payFrequency" text DEFAULT 'monthly' NOT NULL,
	"normalWorkingHoursPerWeek" numeric(5, 2),
	"signedDocumentId" text,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"predictions" jsonb,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"scenarioId" text,
	"scenarioVersion" integer,
	"simulationSeed" text,
	"annexSlots" jsonb
);
--> statement-breakpoint
CREATE TABLE "hrm_ess_document_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedByUserId" text NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"reviewNote" text,
	"fulfilledDocumentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_ess_profile_update_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"section" text NOT NULL,
	"requestedChanges" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedByUserId" text NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"reviewNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_expense_fund" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"fundKind" text DEFAULT 'petty_cash' NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"custodianEmployeeId" text,
	"floatLimit" numeric(15, 2),
	"currentBalance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"defaultCostCenterCode" text,
	"defaultFinanceAccountCode" text,
	"defaultProjectCode" text,
	"defaultTaxTreatment" text DEFAULT 'non_taxable_reimbursement' NOT NULL,
	"eligibilityRules" jsonb,
	"policyRules" jsonb,
	"policyVersion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_flexible_work_arrangement_type" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"arrangementKind" text NOT NULL,
	"description" text,
	"requiresRemoteLocation" boolean DEFAULT false NOT NULL,
	"requiresSupportingDocument" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_flexible_work_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"arrangementTypeId" text NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"startDate" date NOT NULL,
	"endDate" date,
	"reviewDate" date,
	"remoteLocation" text,
	"evidenceDocumentId" text,
	"expectedWeeklyMinutes" integer,
	"initiatedBy" text DEFAULT 'employee' NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"currentApprovalId" text,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"rejectedReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_flexible_work_schedule_pattern" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"workMode" text NOT NULL,
	"coreStart" text,
	"coreEnd" text,
	"flexibleStart" text,
	"flexibleEnd" text,
	"expectedMinutes" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_import_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"importType" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rowCount" integer DEFAULT 0 NOT NULL,
	"errorJson" jsonb,
	"rollbackJson" jsonb,
	"createdByUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_interview" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"interviewerUserId" text NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"feedback" jsonb,
	"outcome" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_interview_scorecard" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"interviewId" text NOT NULL,
	"applicationId" text NOT NULL,
	"interviewerUserId" text NOT NULL,
	"competencyRatings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overallRating" integer,
	"recommendation" text NOT NULL,
	"comments" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_job_grade" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"minSalaryAmount" numeric(15, 2),
	"maxSalaryAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"benefitTierCode" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_job_offer" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currentApprovalId" text,
	"compensationAmount" numeric(15, 2),
	"compensationCurrency" text DEFAULT 'MYR' NOT NULL,
	"proposedStartDate" date,
	"expiresAt" timestamp,
	"notes" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_job_posting" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requisitionId" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"externalReference" text,
	"publishedAt" timestamp,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_job_requisition" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"title" text NOT NULL,
	"departmentId" text,
	"positionId" text,
	"requisitionType" text DEFAULT 'new_headcount' NOT NULL,
	"legalEntityId" text,
	"jobGradeId" text,
	"workLocationCode" text,
	"employmentType" text,
	"hiringManagerUserId" text,
	"budgetReference" text,
	"headcount" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approvalState" text DEFAULT 'not_required' NOT NULL,
	"currentApprovalId" text,
	"approverUserId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_goal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"ownerEmployeeId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"percentComplete" integer DEFAULT 0 NOT NULL,
	"dueDate" date NOT NULL,
	"completionDate" date,
	"alignsWithGoalId" text,
	"sharedWithEmployeeIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text NOT NULL,
	"updatedByUserId" text,
	CONSTRAINT "hrm_kpi_goal_status_chk" CHECK ("hrm_kpi_goal"."status" IN ('in_progress', 'completed', 'closed')),
	CONSTRAINT "hrm_kpi_goal_percent_chk" CHECK ("hrm_kpi_goal"."percentComplete" >= 0 AND "hrm_kpi_goal"."percentComplete" <= 100)
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_goal_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"goalId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"commentText" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_goal_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"goalId" text NOT NULL,
	"title" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"startValue" numeric(18, 6),
	"endValue" numeric(18, 6),
	"currentValue" numeric(18, 6),
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_metric" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text DEFAULT 'count' NOT NULL,
	"valueType" text DEFAULT 'decimal' NOT NULL,
	"direction" text DEFAULT 'higher_is_better' NOT NULL,
	"aggregation" text DEFAULT 'sum' NOT NULL,
	"defaultWeight" numeric(9, 4) DEFAULT '1.0000' NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"archivedAt" timestamp,
	"archivedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_period" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"activatedAt" timestamp,
	"activatedByUserId" text,
	"lockedAt" timestamp,
	"lockedByUserId" text,
	"closedAt" timestamp,
	"closedByUserId" text,
	"evidenceSnapshot" jsonb,
	"evidenceHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_score" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"employeeId" text NOT NULL,
	"metricId" text,
	"metricCode" text NOT NULL,
	"targetValue" text,
	"achievedValue" text,
	"targetNumeric" numeric(18, 6),
	"achievedNumeric" numeric(18, 6),
	"varianceNumeric" numeric(18, 6),
	"scorePercent" numeric(9, 4),
	"weight" numeric(9, 4),
	"weightedScore" numeric(18, 6),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_leave_balance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"leaveTypeId" text NOT NULL,
	"entitlementYear" integer NOT NULL,
	"daysEntitled" numeric(6, 2) DEFAULT '0' NOT NULL,
	"daysTaken" numeric(6, 2) DEFAULT '0' NOT NULL,
	"daysPending" numeric(6, 2) DEFAULT '0' NOT NULL,
	"openingDays" numeric(6, 2) DEFAULT '0' NOT NULL,
	"adjustedDays" numeric(6, 2) DEFAULT '0' NOT NULL,
	"carriedForwardDays" numeric(6, 2) DEFAULT '0' NOT NULL,
	"lastRecomputedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_leave_entitlement" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"leaveTypeId" text NOT NULL,
	"leavePolicyId" text,
	"entitlementYear" integer NOT NULL,
	"daysGranted" numeric(6, 2) NOT NULL,
	"daysProrated" numeric(6, 2) NOT NULL,
	"yearsOfServiceAtGrant" numeric(5, 2),
	"prorataNumerator" integer DEFAULT 12 NOT NULL,
	"prorataDenominator" integer DEFAULT 12 NOT NULL,
	"basis" text NOT NULL,
	"engineVersion" text NOT NULL,
	"engineInputSnapshot" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_leave_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"leaveTypeId" text NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"isActive" boolean DEFAULT true NOT NULL,
	"overrideTier1Days" integer,
	"overrideTier2Days" integer,
	"overrideTier3Days" integer,
	"overrideFixedDays" integer,
	"overrideMaxCarryForward" integer,
	"notes" text,
	"policyVersion" text DEFAULT 'custom' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_leave_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"leaveTypeId" text NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"durationDays" numeric(5, 2) NOT NULL,
	"halfDay" text DEFAULT 'none' NOT NULL,
	"reason" text,
	"evidenceDocumentId" text,
	"state" text DEFAULT 'submitted' NOT NULL,
	"currentApprovalId" text,
	"currentApprovalRunId" text,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"rejectedReason" text,
	"policyVersion" text,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_leave_type" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"accrualMethod" text DEFAULT 'annual_grant' NOT NULL,
	"paid" boolean DEFAULT true NOT NULL,
	"genderRestriction" text,
	"tier1Days" integer,
	"tier1MaxYears" integer,
	"tier2Days" integer,
	"tier2MaxYears" integer,
	"tier3Days" integer,
	"fixedDaysPerYear" integer,
	"maxCarryForwardDays" integer DEFAULT 0 NOT NULL,
	"carryForwardExpiryMonths" integer,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_lifecycle_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"kind" text NOT NULL,
	"previousStatus" text,
	"newStatus" text,
	"effectiveDate" date,
	"reason" text,
	"approvalReference" text,
	"metadata" jsonb,
	"iamAuditEventId" text,
	"actorUserId" text,
	"isEffectiveDated" boolean DEFAULT false NOT NULL,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_lifecycle_transition" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"transitionKind" text NOT NULL,
	"fromStatus" text,
	"toStatus" text,
	"effectiveDate" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"approvalReference" text,
	"lifecycleEventId" text,
	"iamAuditEventId" text,
	"actorUserId" text,
	"actorSessionId" text,
	"appliedAt" timestamp,
	"cancelledAt" timestamp,
	"rejectedAt" timestamp,
	"failureReason" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_offboarding_approval_step" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"offboardingInstanceId" text NOT NULL,
	"stepKey" text NOT NULL,
	"approverRole" text NOT NULL,
	"approverUserId" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewNote" text,
	"reviewedAt" timestamp,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_offboarding_clearance_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"offboardingInstanceId" text NOT NULL,
	"employeeId" text NOT NULL,
	"category" text NOT NULL,
	"itemKey" text NOT NULL,
	"title" text NOT NULL,
	"ownerRole" text NOT NULL,
	"ownerUserId" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"dueAt" date,
	"completedAt" timestamp,
	"completedByUserId" text,
	"evidenceDocumentId" text,
	"evidenceNote" text,
	"blockedReason" text,
	"referenceType" text,
	"referenceId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_offboarding_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"terminationDate" date NOT NULL,
	"exitType" text,
	"exitReason" text,
	"effectiveSeparationDate" date,
	"noticeStartDate" date,
	"noticeEndDate" date,
	"requiredNoticeDays" integer,
	"noticeWaived" boolean DEFAULT false NOT NULL,
	"shortNotice" boolean DEFAULT false NOT NULL,
	"lastWorkingDate" date,
	"boardingInstanceId" text,
	"settlementReadinessStatus" text DEFAULT 'pending_clearance' NOT NULL,
	"settlementBlockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"finalSettlementReference" text,
	"rehireEligibility" text,
	"rehireEligibilityNote" text,
	"exitInterviewScheduledAt" timestamp,
	"exitInterviewCompletedAt" timestamp,
	"exitInterviewNote" text,
	"exitInterviewFeedbackSummary" text,
	"exitInterviewWouldRehire" boolean,
	"replacementRequestReference" text,
	"closureNote" text,
	"completedAt" timestamp,
	"checklist" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_org_structure_change_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text NOT NULL,
	"fieldName" text NOT NULL,
	"oldValue" jsonb,
	"newValue" jsonb,
	"changedByUserId" text NOT NULL,
	"changedAt" timestamp DEFAULT now() NOT NULL,
	"effectiveDate" date,
	"reason" text,
	"approvalReference" text
);
--> statement-breakpoint
CREATE TABLE "hrm_org_unit_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"orgUnitId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"orgUnitType" text DEFAULT 'department' NOT NULL,
	"parentOrgUnitId" text,
	"managerEmployeeId" text,
	"costCenterCode" text,
	"workLocationCode" text,
	"status" text DEFAULT 'active' NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_pay_component_country_treatment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"countryCode" text NOT NULL,
	"componentCode" text NOT NULL,
	"taxable" boolean NOT NULL,
	"contributable" boolean NOT NULL,
	"pensionable" boolean NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_pay_component_country_treatment_country_chk" CHECK ("hrm_pay_component_country_treatment"."countryCode" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"employeeId" text NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"approvalId" text,
	"retroReferencePeriodId" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_exchange_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"fromCurrency" text NOT NULL,
	"toCurrency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"effectiveDate" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_group" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"countryCode" text DEFAULT 'MY' NOT NULL,
	"paySchedule" text DEFAULT 'monthly' NOT NULL,
	"payCurrency" text DEFAULT 'MYR' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_legal_entity_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"legalEntityCode" text NOT NULL,
	"countryCode" text NOT NULL,
	"registrationNumber" text,
	"defaultPayrollCurrency" text NOT NULL,
	"payrollCountryCode" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_payroll_legal_entity_config_country_chk" CHECK ("hrm_payroll_legal_entity_config"."countryCode" ~ '^[A-Z]{2}$' AND "hrm_payroll_legal_entity_config"."payrollCountryCode" ~ '^[A-Z]{2}$'),
	CONSTRAINT "hrm_payroll_legal_entity_config_currency_chk" CHECK ("hrm_payroll_legal_entity_config"."defaultPayrollCurrency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_line" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"runId" text NOT NULL,
	"lineKind" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"rulePackProvenance" jsonb,
	"metadata" jsonb,
	"claimId" text,
	"salaryAdvanceId" text,
	"salaryAdvanceInstallmentId" text,
	"bonusPayoutId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"batchId" text NOT NULL,
	"employeeId" text NOT NULL,
	"netAmount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_payment_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"reference" text NOT NULL,
	"state" text DEFAULT 'generated' NOT NULL,
	"documentId" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_period" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"cutoffDate" date,
	"paymentDate" date NOT NULL,
	"payrollGroupCode" text,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"lockedByUserId" text,
	"lockedAt" timestamp,
	"finalizedRunId" text,
	"rulePackVersion" text,
	"postedByUserId" text,
	"postedAt" timestamp,
	"postedJournalBatchId" text,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"countryCode" text DEFAULT 'MY' NOT NULL,
	"taxResidencyCountry" text,
	"taxIdentifierType" text,
	"taxIdentifierNumber" text,
	"epfNumber" text,
	"socsoNumber" text,
	"eisEligible" boolean DEFAULT true NOT NULL,
	"pcbCategory" text,
	"hrdfApplicable" boolean DEFAULT false NOT NULL,
	"bankCode" text,
	"bankAccountTokenized" text,
	"bankAccountHolderName" text,
	"paySchedule" text DEFAULT 'monthly' NOT NULL,
	"payCurrency" text DEFAULT 'MYR' NOT NULL,
	"payrollGroupCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"statutoryProfileExtras" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"scenarioId" text,
	"scenarioVersion" integer,
	"simulationSeed" text
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"employeeId" text NOT NULL,
	"contractId" text,
	"profileId" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"grossPay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"netPay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"employerCost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"inputDigest" text,
	"computedAt" timestamp,
	"computedByUserId" text,
	"overriddenFromBureau" boolean DEFAULT false NOT NULL,
	"bureauReference" text,
	"validationIssues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"compensationSnapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_policy_acknowledgement" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"policyId" text NOT NULL,
	"policyVersion" text NOT NULL,
	"policyTitle" text,
	"acknowledgementMethod" text DEFAULT 'employee_portal' NOT NULL,
	"acknowledgementSource" text DEFAULT 'employee_self_service' NOT NULL,
	"acknowledgedByUserId" text,
	"actorSessionId" text,
	"acknowledgedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_position" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"departmentId" text NOT NULL,
	"defaultGradeId" text,
	"positionOwnerEmployeeId" text,
	"reportsToPositionId" text,
	"employmentType" text DEFAULT 'permanent' NOT NULL,
	"headcountBudget" integer,
	"positionStatus" text DEFAULT 'active' NOT NULL,
	"costCenterCode" text,
	"workLocationCode" text,
	"effectiveFrom" date,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_position_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"positionId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"orgUnitId" text NOT NULL,
	"positionOwnerEmployeeId" text,
	"reportsToPositionId" text,
	"defaultGradeId" text,
	"employmentType" text DEFAULT 'permanent' NOT NULL,
	"headcountBudget" integer,
	"positionStatus" text DEFAULT 'active' NOT NULL,
	"costCenterCode" text,
	"workLocationCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_pre_employment_check" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"checkType" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"providerReference" text,
	"result" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_recruitment_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"assessmentType" text NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"score" numeric(9, 2),
	"result" text,
	"providerReference" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_recruitment_communication" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text,
	"candidateId" text,
	"communicationType" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"recipient" text,
	"status" text DEFAULT 'recorded' NOT NULL,
	"providerReference" text,
	"sentAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_recruitment_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subjectKind" text NOT NULL,
	"subjectId" text NOT NULL,
	"eventType" text NOT NULL,
	"fromState" text,
	"toState" text,
	"actorUserId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_review" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"employeeId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"state" text DEFAULT 'manager_pending' NOT NULL,
	"rating" text,
	"notes" text,
	"selfRating" text,
	"selfNotes" text,
	"selfSubmittedAt" timestamp,
	"managerRating" text,
	"managerNotes" text,
	"managerSubmittedAt" timestamp,
	"hrRating" text,
	"hrNotes" text,
	"hrSubmittedAt" timestamp,
	"ratingScale" text DEFAULT 'text' NOT NULL,
	"competencyScoresJson" jsonb,
	"closedAt" timestamp,
	"closedByUserId" text,
	"cancelledAt" timestamp,
	"cancelledByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_review_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"reviewPipeline" text DEFAULT 'single' NOT NULL,
	"activatedAt" timestamp,
	"activatedByUserId" text,
	"closedAt" timestamp,
	"closedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_advance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"requestedByUserId" text NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"decidedByUserId" text,
	"decidedAt" timestamp,
	"decisionNote" text,
	"repaidAt" timestamp,
	"repaidByPayrollLineId" text,
	"installmentCount" integer,
	"firstPeriodEndIso" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_advance_installment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"advanceId" text NOT NULL,
	"sequence" integer NOT NULL,
	"dueAfterPeriodEndIso" date NOT NULL,
	"plannedAmount" numeric(15, 2) NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"deductedByPayrollLineId" text,
	"deductedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_analysis_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"benchmarkId" text NOT NULL,
	"mappingId" text,
	"analysisVersion" text NOT NULL,
	"compensationScope" text DEFAULT 'base_salary' NOT NULL,
	"thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currencyConversionReference" text,
	"recommendationHandoffState" text DEFAULT 'none' NOT NULL,
	"recommendationHandoffAt" timestamp,
	"generatedByUserId" text,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_audit_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"action" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text NOT NULL,
	"actorUserId" text,
	"snapshotVersion" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"benchmarkId" text NOT NULL,
	"internalJobId" text NOT NULL,
	"internalJobTitle" text NOT NULL,
	"internalJobFamily" text NOT NULL,
	"internalGrade" text NOT NULL,
	"legalEntityCode" text,
	"countryCode" text NOT NULL,
	"location" text,
	"employmentCategory" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"sourceVersion" text NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_row" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"surveyId" text NOT NULL,
	"benchmarkVersion" text NOT NULL,
	"jobFamily" text NOT NULL,
	"benchmarkJobCode" text NOT NULL,
	"benchmarkJobTitle" text NOT NULL,
	"benchmarkLevel" text NOT NULL,
	"industry" text,
	"countryCode" text NOT NULL,
	"location" text,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"minimum" numeric(15, 2),
	"midpoint" numeric(15, 2),
	"median" numeric(15, 2),
	"average" numeric(15, 2),
	"maximum" numeric(15, 2),
	"p25" numeric(15, 2),
	"p50" numeric(15, 2),
	"p75" numeric(15, 2),
	"p90" numeric(15, 2),
	"sampleSize" integer,
	"effectiveDate" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_survey" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"surveyYear" integer NOT NULL,
	"surveyName" text,
	"industry" text,
	"companySizeSegment" text,
	"revenueSegment" text,
	"countryCode" text NOT NULL,
	"location" text,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"effectiveDate" date NOT NULL,
	"sourceVersion" text NOT NULL,
	"confidenceLevel" numeric(5, 4),
	"uploadedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_screening_question" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requisitionId" text NOT NULL,
	"prompt" text NOT NULL,
	"questionType" text DEFAULT 'text' NOT NULL,
	"isKnockout" boolean DEFAULT false NOT NULL,
	"expectedAnswer" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_screening_response" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"questionId" text NOT NULL,
	"answer" text,
	"passed" boolean,
	"evaluatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"shiftTemplateId" text NOT NULL,
	"attendanceDate" date NOT NULL,
	"scheduledStartAt" timestamp NOT NULL,
	"scheduledEndAt" timestamp NOT NULL,
	"templateCode" text NOT NULL,
	"templateName" text NOT NULL,
	"unpaidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"paidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"lateGraceMinutes" integer DEFAULT 0 NOT NULL,
	"earlyOutGraceMinutes" integer DEFAULT 0 NOT NULL,
	"overtimeGraceMinutes" integer DEFAULT 0 NOT NULL,
	"maxContinuousClockMinutes" integer DEFAULT 960 NOT NULL,
	"holidayBehavior" text DEFAULT 'scheduled' NOT NULL,
	"policySnapshot" jsonb NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_assignment_window_order_chk" CHECK ("hrm_shift_assignment"."scheduledEndAt" > "hrm_shift_assignment"."scheduledStartAt"),
	CONSTRAINT "hrm_shift_assignment_nonnegative_minutes_chk" CHECK ("hrm_shift_assignment"."unpaidBreakMinutes" >= 0 AND "hrm_shift_assignment"."paidBreakMinutes" >= 0 AND "hrm_shift_assignment"."lateGraceMinutes" >= 0 AND "hrm_shift_assignment"."earlyOutGraceMinutes" >= 0 AND "hrm_shift_assignment"."overtimeGraceMinutes" >= 0),
	CONSTRAINT "hrm_shift_assignment_positive_max_duration_chk" CHECK ("hrm_shift_assignment"."maxContinuousClockMinutes" > 0),
	CONSTRAINT "hrm_shift_assignment_holiday_behavior_chk" CHECK ("hrm_shift_assignment"."holidayBehavior" IN ('scheduled', 'skip', 'paid_holiday'))
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"defaultStartTime" text NOT NULL,
	"defaultEndTime" text NOT NULL,
	"unpaidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"paidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"lateGraceMinutes" integer DEFAULT 0 NOT NULL,
	"earlyOutGraceMinutes" integer DEFAULT 0 NOT NULL,
	"overtimeGraceMinutes" integer DEFAULT 0 NOT NULL,
	"maxContinuousClockMinutes" integer DEFAULT 960 NOT NULL,
	"holidayBehavior" text DEFAULT 'scheduled' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_template_code_format_chk" CHECK ("hrm_shift_template"."code" ~ '^[A-Z0-9_]{1,24}$'),
	CONSTRAINT "hrm_shift_template_start_time_format_chk" CHECK ("hrm_shift_template"."defaultStartTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "hrm_shift_template_end_time_format_chk" CHECK ("hrm_shift_template"."defaultEndTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "hrm_shift_template_nonnegative_minutes_chk" CHECK ("hrm_shift_template"."unpaidBreakMinutes" >= 0 AND "hrm_shift_template"."paidBreakMinutes" >= 0 AND "hrm_shift_template"."lateGraceMinutes" >= 0 AND "hrm_shift_template"."earlyOutGraceMinutes" >= 0 AND "hrm_shift_template"."overtimeGraceMinutes" >= 0),
	CONSTRAINT "hrm_shift_template_positive_max_duration_chk" CHECK ("hrm_shift_template"."maxContinuousClockMinutes" > 0),
	CONSTRAINT "hrm_shift_template_holiday_behavior_chk" CHECK ("hrm_shift_template"."holidayBehavior" IN ('scheduled', 'skip', 'paid_holiday'))
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"partyId" text,
	"type" text NOT NULL,
	"actorType" text NOT NULL,
	"actorUserId" text,
	"actorEmail" text,
	"actorName" text,
	"userAgent" text,
	"ipAddress" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dataHash" text NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_party" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"signerOrder" integer NOT NULL,
	"signerEmployeeId" text,
	"signerEmail" text NOT NULL,
	"signerName" text NOT NULL,
	"role" text DEFAULT 'signer' NOT NULL,
	"token" text NOT NULL,
	"readStatus" text DEFAULT 'not_opened' NOT NULL,
	"sendStatus" text DEFAULT 'not_sent' NOT NULL,
	"signingStatus" text DEFAULT 'not_signed' NOT NULL,
	"expiresAt" timestamp,
	"sentAt" timestamp,
	"firstOpenedAt" timestamp,
	"signedAt" timestamp,
	"lastReminderSentAt" timestamp,
	"nextReminderAt" timestamp,
	"rejectionReason" text,
	"signedProofEventId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_request" (
	"id" text PRIMARY KEY NOT NULL,
	"publicSlug" text NOT NULL,
	"organizationId" text NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"signingOrder" text DEFAULT 'parallel' NOT NULL,
	"documentId" text NOT NULL,
	"signedEnvelopeDocumentId" text,
	"derivedStatus" text DEFAULT 'draft' NOT NULL,
	"mode" text DEFAULT 'in_app' NOT NULL,
	"providerEndpointId" text,
	"externalReference" text,
	"declarationTextHash" text NOT NULL,
	"expirationPeriodDays" integer,
	"sentAt" timestamp,
	"lastEventAt" timestamp,
	"voidedAt" timestamp,
	"voidReason" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_skill" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"categoryId" text,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_skill_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_time_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"reportKind" text NOT NULL,
	"workDate" date,
	"overtimeMinutes" integer,
	"tripStartDate" date,
	"tripEndDate" date,
	"destination" text,
	"reason" text,
	"state" text DEFAULT 'submitted' NOT NULL,
	"currentApprovalId" text,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"rejectedReason" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_training_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"sessionId" text,
	"employeeId" text NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"dueAt" timestamp,
	"required" boolean DEFAULT true NOT NULL,
	"state" text DEFAULT 'assigned' NOT NULL,
	"attendance" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"sourceKind" text DEFAULT 'manual' NOT NULL,
	"sourceReference" text,
	"createdByUserId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_assignment_state_chk" CHECK ("hrm_training_assignment"."state" IN ('assigned', 'completed', 'waived', 'cancelled', 'overdue')),
	CONSTRAINT "hrm_training_assignment_attendance_chk" CHECK ("hrm_training_assignment"."attendance" IS NULL OR "hrm_training_assignment"."attendance" IN ('present', 'absent', 'excused')),
	CONSTRAINT "hrm_training_assignment_priority_chk" CHECK ("hrm_training_assignment"."priority" IN ('low', 'normal', 'high', 'statutory')),
	CONSTRAINT "hrm_training_assignment_source_kind_chk" CHECK ("hrm_training_assignment"."sourceKind" IN ('manual', 'onboarding', 'recertification', 'compliance_cycle', 'session_roster'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"archivedAt" timestamp,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_training_course" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"categoryId" text,
	"deliveryMode" text DEFAULT 'classroom' NOT NULL,
	"defaultDurationHours" numeric(9, 2),
	"defaultCreditUnits" numeric(9, 2),
	"statutoryFlag" boolean DEFAULT false NOT NULL,
	"statutoryAuthorityCode" text,
	"recertificationIntervalMonths" integer,
	"defaultRequired" boolean DEFAULT true NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"grantsSkillId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_course_delivery_mode_chk" CHECK ("hrm_training_course"."deliveryMode" IN ('classroom', 'online', 'external', 'self_paced', 'virtual')),
	CONSTRAINT "hrm_training_course_state_chk" CHECK ("hrm_training_course"."state" IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"action" text NOT NULL,
	"recordId" text,
	"assignmentId" text,
	"sessionId" text,
	"employeeId" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"actorUserId" text,
	CONSTRAINT "hrm_training_event_action_chk" CHECK ("hrm_training_event"."action" IN ('assigned', 'completed', 'verified', 'waived', 'expired', 'reassigned', 'cancelled', 'session_closed'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_prerequisite" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"prerequisiteCourseId" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_training_record" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"assignmentId" text,
	"sessionId" text,
	"courseId" text NOT NULL,
	"employeeId" text NOT NULL,
	"completedAt" date NOT NULL,
	"expiresAt" date,
	"instructor" text,
	"hoursCompleted" numeric(9, 2),
	"creditUnits" numeric(9, 2),
	"costAmount" numeric(15, 2),
	"costCurrency" text DEFAULT 'MYR' NOT NULL,
	"certificateDocumentId" text,
	"verificationState" text DEFAULT 'self_attested' NOT NULL,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"feedbackRating" integer,
	"feedbackText" text,
	"notes" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_record_verification_state_chk" CHECK ("hrm_training_record"."verificationState" IN ('self_attested', 'hr_verified', 'external_verified')),
	CONSTRAINT "hrm_training_record_feedback_rating_chk" CHECK ("hrm_training_record"."feedbackRating" IS NULL OR ("hrm_training_record"."feedbackRating" >= 1 AND "hrm_training_record"."feedbackRating" <= 5))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"scheduledStartAt" timestamp NOT NULL,
	"scheduledEndAt" timestamp NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"meetingUrl" text,
	"trainerName" text,
	"trainerEmail" text,
	"vendorOrgId" text,
	"capacity" integer,
	"state" text DEFAULT 'scheduled' NOT NULL,
	"closedAt" timestamp,
	"closedByUserId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_session_end_after_start_chk" CHECK ("scheduledEndAt" > "scheduledStartAt"),
	CONSTRAINT "hrm_training_session_state_chk" CHECK ("hrm_training_session"."state" IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "iam_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"actorUserId" text,
	"actorSessionId" text,
	"organizationId" text,
	"resourceType" text,
	"resourceId" text,
	"path" text,
	"ipAddress" text,
	"userAgent" text,
	"metadata" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"scenarioId" text,
	"scenarioVersion" integer,
	"simulationSeed" text,
	"auditActorMode" text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"adapter" text NOT NULL,
	"state" text NOT NULL,
	"totalRows" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"inputDigest" text NOT NULL,
	"createdByUserId" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "import_job_failure" (
	"id" text PRIMARY KEY NOT NULL,
	"jobId" text NOT NULL,
	"rowId" text,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"field" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job_row" (
	"id" text PRIMARY KEY NOT NULL,
	"jobId" text NOT NULL,
	"rowIndex" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"state" text NOT NULL,
	"resourceType" text,
	"resourceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"documentId" text,
	"chunkIndex" integer,
	"tokenCount" integer,
	"embeddingModelVersion" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"sourceId" text NOT NULL,
	"externalId" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"inputDigest" text NOT NULL,
	"tokenCount" integer DEFAULT 0 NOT NULL,
	"embeddingModelVersion" text,
	"lastEmbeddedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_case" (
	"id" text PRIMARY KEY NOT NULL,
	"evalSetId" text NOT NULL,
	"question" text NOT NULL,
	"expectedEvidenceIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expectedAnswerSubstring" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"evalSetId" text NOT NULL,
	"topK" integer NOT NULL,
	"retrievalMode" text NOT NULL,
	"totalCases" integer DEFAULT 0 NOT NULL,
	"recallAtK" numeric(5, 4) NOT NULL,
	"meanReciprocalRank" numeric(5, 4) NOT NULL,
	"evidenceOverlap" numeric(5, 4) NOT NULL,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"createdByUserId" text,
	"judgeModel" text,
	"judgeScore" numeric(5, 4),
	"judgeMetadata" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_set" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_org_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"cipherText" text NOT NULL,
	"cipherIv" text NOT NULL,
	"cipherTag" text NOT NULL,
	"keyVersion" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastRotatedAt" timestamp,
	"lastUsedAt" timestamp,
	"metadata" jsonb,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_org_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"retrievalHybridEnabled" boolean DEFAULT false NOT NULL,
	"retrievalRerankEnabled" boolean DEFAULT false NOT NULL,
	"enforceZdr" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_source" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lynx_demo_unicorn" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"company" text NOT NULL,
	"valuation" numeric(10, 2) NOT NULL,
	"dateJoined" date,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"industry" text NOT NULL,
	"selectInvestors" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_message" (
	"id" text PRIMARY KEY NOT NULL,
	"roomId" text NOT NULL,
	"organizationId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"editedAt" timestamp,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"ablyMessageSerial" text
);
--> statement-breakpoint
CREATE TABLE "messenger_room" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"createdByUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messenger_room_kind_chk" CHECK ("messenger_room"."kind" IN ('direct', 'group'))
);
--> statement-breakpoint
CREATE TABLE "messenger_room_member" (
	"id" text PRIMARY KEY NOT NULL,
	"roomId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastReadAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "org_bot_link" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"platform" text NOT NULL,
	"externalWorkspaceId" text,
	"externalRepository" text,
	"externalInstallationId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"displayName" text,
	"lastTestedAt" timestamp,
	"lastTestStatus" text,
	"lastTestError" text
);
--> statement-breakpoint
CREATE TABLE "org_capability_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"capabilityId" text NOT NULL,
	"state" text NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"updatedBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_coordination_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"contextId" text NOT NULL,
	"organizationId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"kind" text DEFAULT 'comment' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_coordination_context" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"subject" text,
	"linkedEntityType" text,
	"linkedEntityId" text,
	"linkedEntityLabel" text,
	"linkedEntityPath" text,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_coordination_operator" (
	"id" text PRIMARY KEY NOT NULL,
	"contextId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastReadAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "org_domain_signal_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"signalKey" text NOT NULL,
	"payload" jsonb NOT NULL,
	"actorUserId" text NOT NULL,
	"actorSessionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_event_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"endpointId" text NOT NULL,
	"eventType" text NOT NULL,
	"payloadHash" text NOT NULL,
	"signatureVersion" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"httpStatus" integer,
	"errorMessage" text,
	"durationMs" integer,
	"nextAttemptAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "org_event_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"signingKeyEncoded" text NOT NULL,
	"events" jsonb NOT NULL,
	"signatureVersion" text DEFAULT 'v1' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_feedback_event" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"organizationId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"message" text NOT NULL,
	"path" text,
	"userAgent" text,
	"metadata" text,
	"state" text DEFAULT 'new' NOT NULL,
	"acknowledgedByUserId" text,
	"acknowledgedAt" timestamp,
	"resolvedByUserId" text,
	"resolvedAt" timestamp,
	"resolutionNote" text
);
--> statement-breakpoint
CREATE TABLE "org_notification_notice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"createdByUserId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"targetUserId" text,
	"linkedEntityType" text,
	"linkedEntityId" text,
	"linkedEntityLabel" text,
	"linkedPath" text,
	"publishedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"closedAt" timestamp,
	"closedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_notification_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"noticeId" text NOT NULL,
	"userId" text NOT NULL,
	"readAt" timestamp,
	"acknowledgedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_operational_scope_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"scopeType" text NOT NULL,
	"policy" text NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"updatedByUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_portal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"slug" text NOT NULL,
	"audience" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"displayName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "organization_portal_access" (
	"id" text PRIMARY KEY NOT NULL,
	"portalId" text NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"audience" text NOT NULL,
	"subjectId" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "planner_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text,
	"signalId" text,
	"activityType" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"authorUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"role" text NOT NULL,
	"subjectUserId" text,
	"subjectLabel" text,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"url" text NOT NULL,
	"contentSha256" text NOT NULL,
	"mimeType" text NOT NULL,
	"sizeBytes" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"sourceSignalId" text,
	"title" text NOT NULL,
	"description" text,
	"lifecycle" text DEFAULT 'triaged' NOT NULL,
	"urgency" integer DEFAULT 2 NOT NULL,
	"impact" integer DEFAULT 2 NOT NULL,
	"severity" integer DEFAULT 2 NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"effort" integer DEFAULT 2 NOT NULL,
	"escalationLevel" integer DEFAULT 1 NOT NULL,
	"temporalProximity" integer DEFAULT 1 NOT NULL,
	"ownershipPressure" integer DEFAULT 1 NOT NULL,
	"scheduleStartAt" timestamp,
	"dueAt" timestamp,
	"endAt" timestamp,
	"blockedAt" timestamp,
	"verifiedAt" timestamp,
	"resolvedAt" timestamp,
	"cancelledAt" timestamp,
	"deprecatedAt" timestamp,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"audit7w1h" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"auditOrigin" text DEFAULT 'production' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_link" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"itemId" text,
	"signalId" text,
	"module" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"displayLabel" text NOT NULL,
	"href" text,
	"causalityReason" text,
	"temporalContext" jsonb,
	"auditContext" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_pressure_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"summary" jsonb,
	"snapshotAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_ranking_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text,
	"signalId" text,
	"displayPriority" text NOT NULL,
	"pressureScore" integer NOT NULL,
	"dimensions" jsonb,
	"snapshotAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_recurrence" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"rrule" text NOT NULL,
	"timeZone" text,
	"nextRunAt" timestamp,
	"lastRunAt" timestamp,
	"pausedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_relation" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"relatedItemId" text,
	"relatedSignalId" text,
	"relationType" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"remindAt" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"snoozedUntil" timestamp,
	"deliveredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"scheduledStartAt" timestamp,
	"scheduledEndAt" timestamp,
	"snoozedUntil" timestamp,
	"timeZone" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"itemId" text,
	"status" text DEFAULT 'active' NOT NULL,
	"summary" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"pausedAt" timestamp,
	"durationMinutes" integer,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_signal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"title" text NOT NULL,
	"description" text,
	"signalClass" text DEFAULT 'manual_capture' NOT NULL,
	"lifecycle" text DEFAULT 'detected' NOT NULL,
	"originatingSystem" text,
	"correlationKey" text,
	"correlationGroup" text,
	"urgency" integer DEFAULT 2 NOT NULL,
	"impact" integer DEFAULT 2 NOT NULL,
	"severity" integer DEFAULT 2 NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"effort" integer DEFAULT 2 NOT NULL,
	"escalationLevel" integer DEFAULT 1 NOT NULL,
	"temporalProximity" integer DEFAULT 1 NOT NULL,
	"ownershipPressure" integer DEFAULT 1 NOT NULL,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"audit7w1h" jsonb,
	"detectedAt" timestamp DEFAULT now() NOT NULL,
	"promotedAt" timestamp,
	"expiresAt" timestamp,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"auditOrigin" text DEFAULT 'production' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_view" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"surface" text NOT NULL,
	"filterState" jsonb,
	"sortMode" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rail_pinned_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"workbenchId" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"icon" text,
	"lane" text DEFAULT 'pinned' NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rail_recent_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"workbenchId" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"icon" text,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rail_saved_view" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"workbenchId" text NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"icon" text,
	"rank" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_authority" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"appointedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_capability_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"capabilityId" text NOT NULL,
	"state" text NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_operational_scope" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"scopeType" text NOT NULL,
	"selectedId" text,
	"selectedLabel" text,
	"selectedSlug" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "e_invoice_transmission" ADD CONSTRAINT "e_invoice_transmission_eInvoiceId_e_invoice_id_fk" FOREIGN KEY ("eInvoiceId") REFERENCES "public"."e_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_role_member" ADD CONSTRAINT "erp_role_member_roleId_erp_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."erp_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_role_permission" ADD CONSTRAINT "erp_role_permission_roleId_erp_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."erp_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_application" ADD CONSTRAINT "hrm_application_candidateId_hrm_candidate_id_fk" FOREIGN KEY ("candidateId") REFERENCES "public"."hrm_candidate"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_application" ADD CONSTRAINT "hrm_application_requisitionId_hrm_job_requisition_id_fk" FOREIGN KEY ("requisitionId") REFERENCES "public"."hrm_job_requisition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_application" ADD CONSTRAINT "hrm_application_convertedEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("convertedEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_attendance_day" ADD CONSTRAINT "hrm_attendance_day_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_attendance_event" ADD CONSTRAINT "hrm_attendance_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_claim_reference" ADD CONSTRAINT "hrm_benefit_claim_reference_enrollmentId_hrm_benefit_enrollment_id_fk" FOREIGN KEY ("enrollmentId") REFERENCES "public"."hrm_benefit_enrollment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_claim_reference" ADD CONSTRAINT "hrm_benefit_claim_reference_providerId_hrm_benefit_provider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."hrm_benefit_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD CONSTRAINT "hrm_benefit_enrollment_benefitId_hrm_benefit_id_fk" FOREIGN KEY ("benefitId") REFERENCES "public"."hrm_benefit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD CONSTRAINT "hrm_benefit_enrollment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_enrollmentId_hrm_benefit_enrollment_id_fk" FOREIGN KEY ("enrollmentId") REFERENCES "public"."hrm_benefit_enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_dependentId_hrm_dependent_id_fk" FOREIGN KEY ("dependentId") REFERENCES "public"."hrm_dependent"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_life_event" ADD CONSTRAINT "hrm_benefit_life_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_instance" ADD CONSTRAINT "hrm_boarding_instance_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_instance" ADD CONSTRAINT "hrm_boarding_instance_contractId_hrm_employment_contract_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrm_employment_contract"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_instance" ADD CONSTRAINT "hrm_boarding_instance_templateId_hrm_boarding_template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."hrm_boarding_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_task" ADD CONSTRAINT "hrm_boarding_task_instanceId_hrm_boarding_instance_id_fk" FOREIGN KEY ("instanceId") REFERENCES "public"."hrm_boarding_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_task" ADD CONSTRAINT "hrm_boarding_task_templateTaskId_hrm_boarding_template_task_id_fk" FOREIGN KEY ("templateTaskId") REFERENCES "public"."hrm_boarding_template_task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_task" ADD CONSTRAINT "hrm_boarding_task_evidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("evidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_boarding_template_task" ADD CONSTRAINT "hrm_boarding_template_task_templateId_hrm_boarding_template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."hrm_boarding_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_adjustment" ADD CONSTRAINT "hrm_bonus_adjustment_payoutId_hrm_bonus_payout_id_fk" FOREIGN KEY ("payoutId") REFERENCES "public"."hrm_bonus_payout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_clawback" ADD CONSTRAINT "hrm_bonus_clawback_payoutId_hrm_bonus_payout_id_fk" FOREIGN KEY ("payoutId") REFERENCES "public"."hrm_bonus_payout"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_cycle" ADD CONSTRAINT "hrm_bonus_cycle_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_cycle" ADD CONSTRAINT "hrm_bonus_cycle_payrollPeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_assignmentId_hrm_bonus_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_bonus_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_payrollPeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_assignmentId_hrm_bonus_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_bonus_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD CONSTRAINT "hrm_claim_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD CONSTRAINT "hrm_claim_claimTypeId_hrm_claim_type_id_fk" FOREIGN KEY ("claimTypeId") REFERENCES "public"."hrm_claim_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD CONSTRAINT "hrm_claim_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim_duplicate_signal" ADD CONSTRAINT "hrm_claim_duplicate_signal_claimId_hrm_claim_id_fk" FOREIGN KEY ("claimId") REFERENCES "public"."hrm_claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim_duplicate_signal" ADD CONSTRAINT "hrm_claim_duplicate_signal_matchedClaimId_hrm_claim_id_fk" FOREIGN KEY ("matchedClaimId") REFERENCES "public"."hrm_claim"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim_evidence" ADD CONSTRAINT "hrm_claim_evidence_claimId_hrm_claim_id_fk" FOREIGN KEY ("claimId") REFERENCES "public"."hrm_claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_claim_evidence" ADD CONSTRAINT "hrm_claim_evidence_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_evidence" ADD CONSTRAINT "hrm_compliance_evidence_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_evidence" ADD CONSTRAINT "hrm_compliance_evidence_payloadDocumentId_hrm_document_id_fk" FOREIGN KEY ("payloadDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD CONSTRAINT "hrm_compliance_exception_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD CONSTRAINT "hrm_compliance_exception_correctiveActionEvidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("correctiveActionEvidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD CONSTRAINT "hrm_compliance_exception_resolvedEvidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("resolvedEvidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD CONSTRAINT "hrm_compliance_filing_evidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("evidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_obligation" ADD CONSTRAINT "hrm_compliance_obligation_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_contract_compensation_line" ADD CONSTRAINT "hrm_contract_compensation_line_contractId_hrm_employment_contract_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrm_employment_contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_contract_compensation_line" ADD CONSTRAINT "hrm_contract_compensation_line_componentId_hrm_compensation_component_id_fk" FOREIGN KEY ("componentId") REFERENCES "public"."hrm_compensation_component"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_department" ADD CONSTRAINT "hrm_department_parentDepartmentId_hrm_department_id_fk" FOREIGN KEY ("parentDepartmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_dependent" ADD CONSTRAINT "hrm_dependent_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_replacedByDocumentId_hrm_document_id_fk" FOREIGN KEY ("replacedByDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_previousDocumentId_hrm_document_id_fk" FOREIGN KEY ("previousDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentDepartmentId_hrm_department_id_fk" FOREIGN KEY ("currentDepartmentId") REFERENCES "public"."hrm_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentPositionId_hrm_position_id_fk" FOREIGN KEY ("currentPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentJobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("currentJobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_dottedLineManagerId_hrm_employee_id_fk" FOREIGN KEY ("dottedLineManagerId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment" ADD CONSTRAINT "hrm_employee_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment" ADD CONSTRAINT "hrm_employee_assignment_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment" ADD CONSTRAINT "hrm_employee_assignment_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment" ADD CONSTRAINT "hrm_employee_assignment_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment" ADD CONSTRAINT "hrm_employee_assignment_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_change_history" ADD CONSTRAINT "hrm_employee_change_history_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_contact_profile" ADD CONSTRAINT "hrm_employee_contact_profile_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_emergency_contact" ADD CONSTRAINT "hrm_employee_emergency_contact_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_identity_document" ADD CONSTRAINT "hrm_employee_identity_document_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_personal_profile" ADD CONSTRAINT "hrm_employee_personal_profile_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_reporting_relationship" ADD CONSTRAINT "hrm_employee_reporting_relationship_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_reporting_relationship" ADD CONSTRAINT "hrm_employee_reporting_relationship_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_skill" ADD CONSTRAINT "hrm_employee_skill_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_skill" ADD CONSTRAINT "hrm_employee_skill_skillId_hrm_skill_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."hrm_skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_work_authorization" ADD CONSTRAINT "hrm_employee_work_authorization_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_signedDocumentId_hrm_document_id_fk" FOREIGN KEY ("signedDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_ess_document_request" ADD CONSTRAINT "hrm_ess_document_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_ess_document_request" ADD CONSTRAINT "hrm_ess_document_request_fulfilledDocumentId_hrm_document_id_fk" FOREIGN KEY ("fulfilledDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_ess_profile_update_request" ADD CONSTRAINT "hrm_ess_profile_update_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_expense_fund" ADD CONSTRAINT "hrm_expense_fund_custodianEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("custodianEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_arrangementTypeId_hrm_flexible_work_arrangement_type_id_fk" FOREIGN KEY ("arrangementTypeId") REFERENCES "public"."hrm_flexible_work_arrangement_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_schedule_pattern" ADD CONSTRAINT "hrm_flexible_work_schedule_pattern_requestId_hrm_flexible_work_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_flexible_work_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_interview" ADD CONSTRAINT "hrm_interview_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_interview_scorecard" ADD CONSTRAINT "hrm_interview_scorecard_interviewId_hrm_interview_id_fk" FOREIGN KEY ("interviewId") REFERENCES "public"."hrm_interview"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_interview_scorecard" ADD CONSTRAINT "hrm_interview_scorecard_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_offer" ADD CONSTRAINT "hrm_job_offer_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_offer" ADD CONSTRAINT "hrm_job_offer_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_posting" ADD CONSTRAINT "hrm_job_posting_requisitionId_hrm_job_requisition_id_fk" FOREIGN KEY ("requisitionId") REFERENCES "public"."hrm_job_requisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_goal" ADD CONSTRAINT "hrm_kpi_goal_ownerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("ownerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_goal" ADD CONSTRAINT "hrm_kpi_goal_alignsWithGoalId_hrm_kpi_goal_id_fk" FOREIGN KEY ("alignsWithGoalId") REFERENCES "public"."hrm_kpi_goal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_goal_comment" ADD CONSTRAINT "hrm_kpi_goal_comment_goalId_hrm_kpi_goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."hrm_kpi_goal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_goal_milestone" ADD CONSTRAINT "hrm_kpi_goal_milestone_goalId_hrm_kpi_goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."hrm_kpi_goal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_score" ADD CONSTRAINT "hrm_kpi_score_periodId_hrm_kpi_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_kpi_period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_score" ADD CONSTRAINT "hrm_kpi_score_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_kpi_score" ADD CONSTRAINT "hrm_kpi_score_metricId_hrm_kpi_metric_id_fk" FOREIGN KEY ("metricId") REFERENCES "public"."hrm_kpi_metric"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_balance" ADD CONSTRAINT "hrm_leave_balance_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_balance" ADD CONSTRAINT "hrm_leave_balance_leaveTypeId_hrm_leave_type_id_fk" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."hrm_leave_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_entitlement" ADD CONSTRAINT "hrm_leave_entitlement_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_entitlement" ADD CONSTRAINT "hrm_leave_entitlement_leaveTypeId_hrm_leave_type_id_fk" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."hrm_leave_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_entitlement" ADD CONSTRAINT "hrm_leave_entitlement_leavePolicyId_hrm_leave_policy_id_fk" FOREIGN KEY ("leavePolicyId") REFERENCES "public"."hrm_leave_policy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_policy" ADD CONSTRAINT "hrm_leave_policy_leaveTypeId_hrm_leave_type_id_fk" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."hrm_leave_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_request" ADD CONSTRAINT "hrm_leave_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_request" ADD CONSTRAINT "hrm_leave_request_leaveTypeId_hrm_leave_type_id_fk" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."hrm_leave_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_leave_request" ADD CONSTRAINT "hrm_leave_request_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_lifecycle_event" ADD CONSTRAINT "hrm_lifecycle_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_lifecycle_transition" ADD CONSTRAINT "hrm_lifecycle_transition_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_lifecycle_transition" ADD CONSTRAINT "hrm_lifecycle_transition_lifecycleEventId_hrm_lifecycle_event_id_fk" FOREIGN KEY ("lifecycleEventId") REFERENCES "public"."hrm_lifecycle_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_approval_step" ADD CONSTRAINT "hrm_offboarding_approval_step_offboardingInstanceId_hrm_offboarding_instance_id_fk" FOREIGN KEY ("offboardingInstanceId") REFERENCES "public"."hrm_offboarding_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_offboardingInstanceId_hrm_offboarding_instance_id_fk" FOREIGN KEY ("offboardingInstanceId") REFERENCES "public"."hrm_offboarding_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_evidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("evidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD CONSTRAINT "hrm_offboarding_instance_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD CONSTRAINT "hrm_offboarding_instance_boardingInstanceId_hrm_boarding_instance_id_fk" FOREIGN KEY ("boardingInstanceId") REFERENCES "public"."hrm_boarding_instance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_orgUnitId_hrm_department_id_fk" FOREIGN KEY ("orgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_parentOrgUnitId_hrm_department_id_fk" FOREIGN KEY ("parentOrgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_approvalId_hrm_approval_id_fk" FOREIGN KEY ("approvalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_retroReferencePeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("retroReferencePeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_runId_hrm_payroll_run_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."hrm_payroll_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_salaryAdvanceId_hrm_salary_advance_id_fk" FOREIGN KEY ("salaryAdvanceId") REFERENCES "public"."hrm_salary_advance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_salaryAdvanceInstallmentId_hrm_salary_advance_installment_id_fk" FOREIGN KEY ("salaryAdvanceInstallmentId") REFERENCES "public"."hrm_salary_advance_installment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment" ADD CONSTRAINT "hrm_payroll_payment_batchId_hrm_payroll_payment_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."hrm_payroll_payment_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment" ADD CONSTRAINT "hrm_payroll_payment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment_batch" ADD CONSTRAINT "hrm_payroll_payment_batch_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment_batch" ADD CONSTRAINT "hrm_payroll_payment_batch_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_profile" ADD CONSTRAINT "hrm_payroll_profile_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_contractId_hrm_employment_contract_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrm_employment_contract"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_profileId_hrm_payroll_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."hrm_payroll_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD CONSTRAINT "hrm_policy_acknowledgement_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_defaultGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("defaultGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_reportsToPositionId_hrm_position_id_fk" FOREIGN KEY ("reportsToPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_orgUnitId_hrm_department_id_fk" FOREIGN KEY ("orgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_positionOwnerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("positionOwnerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_reportsToPositionId_hrm_position_id_fk" FOREIGN KEY ("reportsToPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_defaultGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("defaultGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_pre_employment_check" ADD CONSTRAINT "hrm_pre_employment_check_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_assessment" ADD CONSTRAINT "hrm_recruitment_assessment_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_communication" ADD CONSTRAINT "hrm_recruitment_communication_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_communication" ADD CONSTRAINT "hrm_recruitment_communication_candidateId_hrm_candidate_id_fk" FOREIGN KEY ("candidateId") REFERENCES "public"."hrm_candidate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_review" ADD CONSTRAINT "hrm_review_cycleId_hrm_review_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_review_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_review" ADD CONSTRAINT "hrm_review_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_advance" ADD CONSTRAINT "hrm_salary_advance_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_advance_installment" ADD CONSTRAINT "hrm_salary_advance_installment_advanceId_hrm_salary_advance_id_fk" FOREIGN KEY ("advanceId") REFERENCES "public"."hrm_salary_advance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_benchmarkId_hrm_salary_benchmark_row_id_fk" FOREIGN KEY ("benchmarkId") REFERENCES "public"."hrm_salary_benchmark_row"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_mappingId_hrm_salary_benchmark_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."hrm_salary_benchmark_mapping"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_mapping" ADD CONSTRAINT "hrm_salary_benchmark_mapping_benchmarkId_hrm_salary_benchmark_row_id_fk" FOREIGN KEY ("benchmarkId") REFERENCES "public"."hrm_salary_benchmark_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_row" ADD CONSTRAINT "hrm_salary_benchmark_row_surveyId_hrm_salary_benchmark_survey_id_fk" FOREIGN KEY ("surveyId") REFERENCES "public"."hrm_salary_benchmark_survey"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_question" ADD CONSTRAINT "hrm_screening_question_requisitionId_hrm_job_requisition_id_fk" FOREIGN KEY ("requisitionId") REFERENCES "public"."hrm_job_requisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_response" ADD CONSTRAINT "hrm_screening_response_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_response" ADD CONSTRAINT "hrm_screening_response_questionId_hrm_screening_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."hrm_screening_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_assignment" ADD CONSTRAINT "hrm_shift_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_assignment" ADD CONSTRAINT "hrm_shift_assignment_shiftTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("shiftTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_event" ADD CONSTRAINT "hrm_signature_event_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_signerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("signerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_signedEnvelopeDocumentId_hrm_document_id_fk" FOREIGN KEY ("signedEnvelopeDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_providerEndpointId_org_event_endpoint_id_fk" FOREIGN KEY ("providerEndpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_skill" ADD CONSTRAINT "hrm_skill_categoryId_hrm_skill_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."hrm_skill_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_report" ADD CONSTRAINT "hrm_time_report_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_report" ADD CONSTRAINT "hrm_time_report_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_course" ADD CONSTRAINT "hrm_training_course_categoryId_hrm_training_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."hrm_training_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_recordId_hrm_training_record_id_fk" FOREIGN KEY ("recordId") REFERENCES "public"."hrm_training_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_assignmentId_hrm_training_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_training_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_prerequisite" ADD CONSTRAINT "hrm_training_prerequisite_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_prerequisite" ADD CONSTRAINT "hrm_training_prerequisite_prerequisiteCourseId_hrm_training_course_id_fk" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_assignmentId_hrm_training_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_training_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_certificateDocumentId_hrm_document_id_fk" FOREIGN KEY ("certificateDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_session" ADD CONSTRAINT "hrm_training_session_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_rowId_import_job_row_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."import_job_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_row" ADD CONSTRAINT "import_job_row_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_documentId_knowledge_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."knowledge_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_sourceId_knowledge_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."knowledge_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_eval_case" ADD CONSTRAINT "knowledge_eval_case_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_eval_run" ADD CONSTRAINT "knowledge_eval_run_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_message" ADD CONSTRAINT "messenger_message_roomId_messenger_room_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."messenger_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_room_member" ADD CONSTRAINT "messenger_room_member_roomId_messenger_room_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."messenger_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_coordination_activity" ADD CONSTRAINT "org_coordination_activity_contextId_org_coordination_context_id_fk" FOREIGN KEY ("contextId") REFERENCES "public"."org_coordination_context"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_coordination_operator" ADD CONSTRAINT "org_coordination_operator_contextId_org_coordination_context_id_fk" FOREIGN KEY ("contextId") REFERENCES "public"."org_coordination_context"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_event_delivery" ADD CONSTRAINT "org_event_delivery_endpointId_org_event_endpoint_id_fk" FOREIGN KEY ("endpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_notification_receipt" ADD CONSTRAINT "org_notification_receipt_noticeId_org_notification_notice_id_fk" FOREIGN KEY ("noticeId") REFERENCES "public"."org_notification_notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_portal_access" ADD CONSTRAINT "organization_portal_access_portalId_organization_portal_id_fk" FOREIGN KEY ("portalId") REFERENCES "public"."organization_portal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_activity" ADD CONSTRAINT "planner_activity_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_activity" ADD CONSTRAINT "planner_activity_signalId_planner_signal_id_fk" FOREIGN KEY ("signalId") REFERENCES "public"."planner_signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_assignment" ADD CONSTRAINT "planner_assignment_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_attachment" ADD CONSTRAINT "planner_attachment_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_comment" ADD CONSTRAINT "planner_comment_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_item" ADD CONSTRAINT "planner_item_sourceSignalId_planner_signal_id_fk" FOREIGN KEY ("sourceSignalId") REFERENCES "public"."planner_signal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_link" ADD CONSTRAINT "planner_link_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_link" ADD CONSTRAINT "planner_link_signalId_planner_signal_id_fk" FOREIGN KEY ("signalId") REFERENCES "public"."planner_signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_ranking_snapshot" ADD CONSTRAINT "planner_ranking_snapshot_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_ranking_snapshot" ADD CONSTRAINT "planner_ranking_snapshot_signalId_planner_signal_id_fk" FOREIGN KEY ("signalId") REFERENCES "public"."planner_signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_recurrence" ADD CONSTRAINT "planner_recurrence_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_relation" ADD CONSTRAINT "planner_relation_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_relation" ADD CONSTRAINT "planner_relation_relatedItemId_planner_item_id_fk" FOREIGN KEY ("relatedItemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_relation" ADD CONSTRAINT "planner_relation_relatedSignalId_planner_signal_id_fk" FOREIGN KEY ("relatedSignalId") REFERENCES "public"."planner_signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_reminder" ADD CONSTRAINT "planner_reminder_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_schedule" ADD CONSTRAINT "planner_schedule_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_session" ADD CONSTRAINT "planner_session_itemId_planner_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."planner_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_journal_batch_org_source_uidx" ON "accounting_journal_batch" USING btree ("organizationId","sourceModule","sourceObject","sourceId");--> statement-breakpoint
CREATE INDEX "accounting_journal_batch_org_postedAt_idx" ON "accounting_journal_batch" USING btree ("organizationId","postedAt");--> statement-breakpoint
CREATE INDEX "accounting_journal_batch_source_idx" ON "accounting_journal_batch" USING btree ("sourceModule","sourceObject","sourceId");--> statement-breakpoint
CREATE INDEX "ask_docs_feedback_locale_created_idx" ON "ask_docs_feedback" USING btree ("locale","created_at");--> statement-breakpoint
CREATE INDEX "customers_organization_id_idx" ON "customers" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "e_invoice_org_status_idx" ON "e_invoice" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "e_invoice_org_issue_date_idx" ON "e_invoice" USING btree ("organizationId","issueDate");--> statement-breakpoint
CREATE INDEX "e_invoice_transmission_org_invoice_idx" ON "e_invoice_transmission" USING btree ("organizationId","eInvoiceId");--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_org_name_uidx" ON "erp_role" USING btree ("organizationId","name");--> statement-breakpoint
CREATE INDEX "erp_role_org_status_idx" ON "erp_role" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_member_role_user_uidx" ON "erp_role_member" USING btree ("roleId","userId");--> statement-breakpoint
CREATE INDEX "erp_role_member_org_user_idx" ON "erp_role_member" USING btree ("organizationId","userId","status");--> statement-breakpoint
CREATE INDEX "erp_role_member_org_role_idx" ON "erp_role_member" USING btree ("organizationId","roleId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_permission_role_module_object_function_uidx" ON "erp_role_permission" USING btree ("roleId","module","object","function");--> statement-breakpoint
CREATE INDEX "erp_role_permission_org_role_idx" ON "erp_role_permission" USING btree ("organizationId","roleId","status");--> statement-breakpoint
CREATE INDEX "erp_role_permission_org_module_object_idx" ON "erp_role_permission" USING btree ("organizationId","module","object","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_application_org_candidate_requisition_uidx" ON "hrm_application" USING btree ("organizationId","candidateId","requisitionId");--> statement-breakpoint
CREATE INDEX "hrm_application_org_stage_idx" ON "hrm_application" USING btree ("organizationId","stage");--> statement-breakpoint
CREATE INDEX "hrm_application_org_requisition_idx" ON "hrm_application" USING btree ("organizationId","requisitionId");--> statement-breakpoint
CREATE INDEX "hrm_application_org_converted_employee_idx" ON "hrm_application" USING btree ("organizationId","convertedEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_approval_org_state_approver_idx" ON "hrm_approval" USING btree ("organizationId","state","currentApproverUserId");--> statement-breakpoint
CREATE INDEX "hrm_approval_org_subject_idx" ON "hrm_approval" USING btree ("organizationId","subjectKind","subjectId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_attendance_day_org_emp_date_uidx" ON "hrm_attendance_day" USING btree ("organizationId","employeeId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_attendance_day_org_date_state_idx" ON "hrm_attendance_day" USING btree ("organizationId","attendanceDate","state");--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_emp_occurredAt_idx" ON "hrm_attendance_event" USING btree ("organizationId","employeeId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_source_batchId_idx" ON "hrm_attendance_event" USING btree ("organizationId","source","importBatchId");--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_correctionOf_idx" ON "hrm_attendance_event" USING btree ("organizationId","correctionOfEventId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_org_code_uidx" ON "hrm_benefit" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_benefit_org_active_idx" ON "hrm_benefit" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_claim_reference_org_external_uidx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","externalClaimId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_claim_reference_org_enrollment_idx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","enrollmentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_claim_reference_org_status_idx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","claimStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_enrollment_org_benefit_employee_active_uidx" ON "hrm_benefit_enrollment" USING btree ("organizationId","benefitId","employeeId") WHERE "hrm_benefit_enrollment"."state" in ('pending', 'active');--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_org_employee_idx" ON "hrm_benefit_enrollment" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_org_state_idx" ON "hrm_benefit_enrollment" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_enrollment_dependent_org_enrollment_dep_uidx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","enrollmentId","dependentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_dependent_org_employee_idx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_dependent_org_dependent_idx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","dependentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_life_event_org_employee_idx" ON "hrm_benefit_life_event" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_life_event_org_type_idx" ON "hrm_benefit_life_event" USING btree ("organizationId","eventType");--> statement-breakpoint
CREATE INDEX "hrm_benefit_open_enrollment_org_active_idx" ON "hrm_benefit_open_enrollment" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_benefit_open_enrollment_org_period_idx" ON "hrm_benefit_open_enrollment" USING btree ("organizationId","startsOn","endsOn");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_provider_org_code_uidx" ON "hrm_benefit_provider" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_benefit_provider_org_active_idx" ON "hrm_benefit_provider" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_boarding_instance_org_kind_status_idx" ON "hrm_boarding_instance" USING btree ("organizationId","kind","status");--> statement-breakpoint
CREATE INDEX "hrm_boarding_instance_org_employee_kind_idx" ON "hrm_boarding_instance" USING btree ("organizationId","employeeId","kind");--> statement-breakpoint
CREATE INDEX "hrm_boarding_instance_org_contract_kind_idx" ON "hrm_boarding_instance" USING btree ("organizationId","contractId","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_boarding_instance_org_kind_employee_contract_open_uidx" ON "hrm_boarding_instance" USING btree ("organizationId","kind","employeeId","contractId") WHERE "status" in ('pending', 'in_progress', 'blocked');--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_boarding_task_org_instance_key_uidx" ON "hrm_boarding_task" USING btree ("organizationId","instanceId","taskKey");--> statement-breakpoint
CREATE INDEX "hrm_boarding_task_org_instance_status_idx" ON "hrm_boarding_task" USING btree ("organizationId","instanceId","status");--> statement-breakpoint
CREATE INDEX "hrm_boarding_task_org_owner_role_status_idx" ON "hrm_boarding_task" USING btree ("organizationId","ownerRole","status");--> statement-breakpoint
CREATE INDEX "hrm_boarding_task_org_due_status_idx" ON "hrm_boarding_task" USING btree ("organizationId","dueAt","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_boarding_template_org_kind_code_uidx" ON "hrm_boarding_template" USING btree ("organizationId","kind","code");--> statement-breakpoint
CREATE INDEX "hrm_boarding_template_org_kind_status_idx" ON "hrm_boarding_template" USING btree ("organizationId","kind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_boarding_template_task_org_template_key_uidx" ON "hrm_boarding_template_task" USING btree ("organizationId","templateId","taskKey");--> statement-breakpoint
CREATE INDEX "hrm_boarding_template_task_org_template_idx" ON "hrm_boarding_template_task" USING btree ("organizationId","templateId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_adjustment_org_payout_idx" ON "hrm_bonus_adjustment" USING btree ("organizationId","payoutId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_assignment_org_cycle_employee_uidx" ON "hrm_bonus_assignment" USING btree ("organizationId","cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_assignment_org_plan_idx" ON "hrm_bonus_assignment" USING btree ("organizationId","planId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_assignment_org_employee_idx" ON "hrm_bonus_assignment" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_clawback_org_payout_idx" ON "hrm_bonus_clawback" USING btree ("organizationId","payoutId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_clawback_org_state_idx" ON "hrm_bonus_clawback" USING btree ("organizationId","recoveryState");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_cycle_org_code_uidx" ON "hrm_bonus_cycle" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_plan_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","planId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_state_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_period_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","periodStart","periodEnd");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_payout_org_number_uidx" ON "hrm_bonus_payout" USING btree ("organizationId","payoutNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_payout_org_cycle_employee_uidx" ON "hrm_bonus_payout" USING btree ("organizationId","cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_cycle_state_idx" ON "hrm_bonus_payout" USING btree ("organizationId","cycleId","state");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_employee_idx" ON "hrm_bonus_payout" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_payroll_period_idx" ON "hrm_bonus_payout" USING btree ("organizationId","payrollPeriodId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_plan_org_code_uidx" ON "hrm_bonus_plan" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_bonus_plan_org_active_idx" ON "hrm_bonus_plan" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_bonus_plan_org_type_idx" ON "hrm_bonus_plan" USING btree ("organizationId","planType");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_cycle_idx" ON "hrm_bonus_target" USING btree ("organizationId","cycleId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_employee_idx" ON "hrm_bonus_target" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_assignment_idx" ON "hrm_bonus_target" USING btree ("organizationId","assignmentId");--> statement-breakpoint
CREATE INDEX "hrm_candidate_org_email_idx" ON "hrm_candidate" USING btree ("organizationId","email");--> statement-breakpoint
CREATE INDEX "hrm_candidate_org_archived_idx" ON "hrm_candidate" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_org_claim_number_uidx" ON "hrm_claim" USING btree ("organizationId","claimNumber");--> statement-breakpoint
CREATE INDEX "hrm_claim_org_employee_state_idx" ON "hrm_claim" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_claim_org_submitter_idx" ON "hrm_claim" USING btree ("organizationId","submittedByUserId");--> statement-breakpoint
CREATE INDEX "hrm_claim_org_payout_state_idx" ON "hrm_claim" USING btree ("organizationId","payoutMethod","state");--> statement-breakpoint
CREATE INDEX "hrm_claim_org_state_claim_date_idx" ON "hrm_claim" USING btree ("organizationId","state","claimDate");--> statement-breakpoint
CREATE INDEX "hrm_claim_org_paid_line_idx" ON "hrm_claim" USING btree ("organizationId","paidByPayrollLineId");--> statement-breakpoint
CREATE INDEX "hrm_claim_duplicate_signal_org_claim_idx" ON "hrm_claim_duplicate_signal" USING btree ("organizationId","claimId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_evidence_claim_document_uidx" ON "hrm_claim_evidence" USING btree ("claimId","documentId");--> statement-breakpoint
CREATE INDEX "hrm_claim_evidence_org_claim_idx" ON "hrm_claim_evidence" USING btree ("organizationId","claimId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_type_org_code_uidx" ON "hrm_claim_type" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_claim_type_org_active_idx" ON "hrm_claim_type" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_component_organizationId_code_uidx" ON "hrm_compensation_component" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_compensation_component_organizationId_idx" ON "hrm_compensation_component" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compliance_evidence_org_period_country_type_uidx" ON "hrm_compliance_evidence" USING btree ("organizationId","periodId","countryCode","packType");--> statement-breakpoint
CREATE INDEX "hrm_compliance_evidence_org_state_generated_idx" ON "hrm_compliance_evidence" USING btree ("organizationId","submissionState","generatedAt");--> statement-breakpoint
CREATE INDEX "hrm_compliance_exception_org_status_idx" ON "hrm_compliance_exception" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_compliance_exception_org_employee_idx" ON "hrm_compliance_exception" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_compliance_exception_org_owner_due_idx" ON "hrm_compliance_exception" USING btree ("organizationId","correctiveActionOwnerUserId","correctiveActionDueDate");--> statement-breakpoint
CREATE INDEX "hrm_compliance_filing_org_status_due_idx" ON "hrm_compliance_filing" USING btree ("organizationId","status","dueDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compliance_obligation_org_code_uidx" ON "hrm_compliance_obligation" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_kind_status_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","requirementKind","status");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_area_status_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","complianceArea","status");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_scope_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","countryCode","legalEntityCode","departmentId","workLocationCode");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_contract_compensation_line_contract_component_uidx" ON "hrm_contract_compensation_line" USING btree ("contractId","componentId");--> statement-breakpoint
CREATE INDEX "hrm_contract_compensation_line_contractId_idx" ON "hrm_contract_compensation_line" USING btree ("contractId");--> statement-breakpoint
CREATE INDEX "hrm_contract_compensation_line_organizationId_idx" ON "hrm_contract_compensation_line" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_country_rule_pack_country_version_uidx" ON "hrm_country_rule_pack" USING btree ("countryCode","version");--> statement-breakpoint
CREATE INDEX "hrm_country_rule_pack_country_effective_from_idx" ON "hrm_country_rule_pack" USING btree ("countryCode","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_department_organizationId_code_uidx" ON "hrm_department" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_department_organizationId_archivedAt_idx" ON "hrm_department" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_department_organizationId_parentDepartmentId_idx" ON "hrm_department" USING btree ("organizationId","parentDepartmentId");--> statement-breakpoint
CREATE INDEX "hrm_department_organizationId_orgUnitStatus_idx" ON "hrm_department" USING btree ("organizationId","orgUnitStatus");--> statement-breakpoint
CREATE INDEX "hrm_dependent_organizationId_employeeId_idx" ON "hrm_dependent" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_dependent_organizationId_archivedAt_idx" ON "hrm_dependent" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_employeeId_documentType_idx" ON "hrm_document" USING btree ("organizationId","employeeId","documentType");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_org_set_version_uidx" ON "hrm_document" USING btree ("organizationId","documentSetId","versionNumber");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_subjectKind_subjectId_idx" ON "hrm_document" USING btree ("organizationId","subjectKind","subjectId");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_effectiveTo_idx" ON "hrm_document" USING btree ("organizationId","effectiveTo");--> statement-breakpoint
CREATE INDEX "hrm_document_org_employee_latest_idx" ON "hrm_document" USING btree ("organizationId","employeeId","isLatestVersion");--> statement-breakpoint
CREATE INDEX "hrm_document_org_lifecycle_status_idx" ON "hrm_document" USING btree ("organizationId","documentLifecycleStatus","verificationStatus");--> statement-breakpoint
CREATE INDEX "hrm_document_org_group_type_idx" ON "hrm_document" USING btree ("organizationId","documentGroup","documentType");--> statement-breakpoint
CREATE INDEX "hrm_document_org_legal_entity_idx" ON "hrm_document" USING btree ("organizationId","legalEntityId");--> statement-breakpoint
CREATE INDEX "hrm_document_org_uploadedAt_idx" ON "hrm_document" USING btree ("organizationId","uploadedAt");--> statement-breakpoint
CREATE INDEX "hrm_document_org_retentionUntil_idx" ON "hrm_document" USING btree ("organizationId","retentionUntil");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_requirement_org_code_uidx" ON "hrm_document_requirement" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_type_status_idx" ON "hrm_document_requirement" USING btree ("organizationId","documentType","status");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_group_status_idx" ON "hrm_document_requirement" USING btree ("organizationId","documentGroup","status");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_legal_entity_idx" ON "hrm_document_requirement" USING btree ("organizationId","legalEntityId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_retention_rule_org_code_uidx" ON "hrm_document_retention_rule" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_document_retention_rule_org_status_idx" ON "hrm_document_retention_rule" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_document_retention_rule_org_group_type_idx" ON "hrm_document_retention_rule" USING btree ("organizationId","documentGroup","documentType");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_organizationId_employeeNumber_uidx" ON "hrm_employee" USING btree ("organizationId","employeeNumber");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_archivedAt_idx" ON "hrm_employee" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_email_idx" ON "hrm_employee" USING btree ("organizationId","email");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_currentDepartmentId_idx" ON "hrm_employee" USING btree ("organizationId","currentDepartmentId");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_managerEmployeeId_idx" ON "hrm_employee" USING btree ("organizationId","managerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_dottedLineManagerId_idx" ON "hrm_employee" USING btree ("organizationId","dottedLineManagerId");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_hrOwnerEmployeeId_idx" ON "hrm_employee" USING btree ("organizationId","hrOwnerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_employmentStatus_idx" ON "hrm_employee" USING btree ("organizationId","employmentStatus");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_employmentType_idx" ON "hrm_employee" USING btree ("organizationId","employmentType");--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_employee_effective_idx" ON "hrm_employee_assignment" USING btree ("organizationId","employeeId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_active_idx" ON "hrm_employee_assignment" USING btree ("organizationId","status","effectiveTo");--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_department_idx" ON "hrm_employee_assignment" USING btree ("organizationId","departmentId");--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_position_idx" ON "hrm_employee_assignment" USING btree ("organizationId","positionId");--> statement-breakpoint
CREATE INDEX "hrm_employee_change_history_org_employee_changedAt_idx" ON "hrm_employee_change_history" USING btree ("organizationId","employeeId","changedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_contact_profile_org_employee_uidx" ON "hrm_employee_contact_profile" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_workEmail_idx" ON "hrm_employee_contact_profile" USING btree ("organizationId","workEmail");--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_personalEmail_idx" ON "hrm_employee_contact_profile" USING btree ("organizationId","personalEmail");--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_personalPhone_idx" ON "hrm_employee_contact_profile" USING btree ("organizationId","personalPhone");--> statement-breakpoint
CREATE INDEX "hrm_employee_emergency_contact_org_employee_idx" ON "hrm_employee_emergency_contact" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_emergency_contact_org_employee_primary_uidx" ON "hrm_employee_emergency_contact" USING btree ("organizationId","employeeId") WHERE "hrm_employee_emergency_contact"."isPrimary" = true AND "hrm_employee_emergency_contact"."archivedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "hrm_employee_identity_document_org_employee_idx" ON "hrm_employee_identity_document" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_identity_document_org_document_number_idx" ON "hrm_employee_identity_document" USING btree ("organizationId","documentNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_identity_document_org_employee_primary_uidx" ON "hrm_employee_identity_document" USING btree ("organizationId","employeeId") WHERE "hrm_employee_identity_document"."isPrimary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_personal_profile_org_employee_uidx" ON "hrm_employee_personal_profile" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_personal_profile_org_nationality_idx" ON "hrm_employee_personal_profile" USING btree ("organizationId","nationality");--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_employee_type_effective_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","employeeId","relationshipType","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_reporting_org_employee_manager_type_effective_uidx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","employeeId","managerEmployeeId","relationshipType","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_manager_type_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","managerEmployeeId","relationshipType");--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_status_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_employee_skill_org_employee_idx" ON "hrm_employee_skill" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_skill_org_skill_idx" ON "hrm_employee_skill" USING btree ("organizationId","skillId");--> statement-breakpoint
CREATE INDEX "hrm_employee_work_authorization_org_employee_idx" ON "hrm_employee_work_authorization" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_work_authorization_org_country_status_idx" ON "hrm_employee_work_authorization" USING btree ("organizationId","countryCode","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employment_contract_organizationId_employeeId_version_uidx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId","versionNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employment_contract_org_employee_active_uidx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId") WHERE "hrm_employment_contract"."state" = 'active';--> statement-breakpoint
CREATE INDEX "hrm_employment_contract_organizationId_employeeId_effectiveFrom_idx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_employment_contract_organizationId_state_idx" ON "hrm_employment_contract" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_ess_document_request_org_employee_status_idx" ON "hrm_ess_document_request" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_ess_document_request_org_status_created_idx" ON "hrm_ess_document_request" USING btree ("organizationId","status","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_ess_profile_update_request_org_employee_status_idx" ON "hrm_ess_profile_update_request" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_ess_profile_update_request_org_status_created_idx" ON "hrm_ess_profile_update_request" USING btree ("organizationId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_expense_fund_org_code_uidx" ON "hrm_expense_fund" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_expense_fund_org_state_idx" ON "hrm_expense_fund" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_fwa_type_org_code_uidx" ON "hrm_flexible_work_arrangement_type" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_fwa_type_org_archivedAt_idx" ON "hrm_flexible_work_arrangement_type" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_employee_state_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_state_start_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","state","startDate");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_type_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","arrangementTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_fwa_schedule_request_day_uidx" ON "hrm_flexible_work_schedule_pattern" USING btree ("requestId","dayOfWeek");--> statement-breakpoint
CREATE INDEX "hrm_fwa_schedule_org_request_idx" ON "hrm_flexible_work_schedule_pattern" USING btree ("organizationId","requestId");--> statement-breakpoint
CREATE INDEX "hrm_import_session_org_status_idx" ON "hrm_import_session" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_import_session_org_type_idx" ON "hrm_import_session" USING btree ("organizationId","importType");--> statement-breakpoint
CREATE INDEX "hrm_interview_org_application_idx" ON "hrm_interview" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_interview_org_scheduled_idx" ON "hrm_interview" USING btree ("organizationId","scheduledAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_interview_scorecard_org_interview_user_uidx" ON "hrm_interview_scorecard" USING btree ("organizationId","interviewId","interviewerUserId");--> statement-breakpoint
CREATE INDEX "hrm_interview_scorecard_org_application_idx" ON "hrm_interview_scorecard" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_job_grade_organizationId_code_uidx" ON "hrm_job_grade" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_job_grade_organizationId_archivedAt_idx" ON "hrm_job_grade" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_job_grade_organizationId_ordinal_idx" ON "hrm_job_grade" USING btree ("organizationId","ordinal");--> statement-breakpoint
CREATE INDEX "hrm_job_offer_org_application_idx" ON "hrm_job_offer" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_job_offer_org_status_idx" ON "hrm_job_offer" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_job_offer_org_expires_idx" ON "hrm_job_offer" USING btree ("organizationId","expiresAt");--> statement-breakpoint
CREATE INDEX "hrm_job_posting_org_requisition_idx" ON "hrm_job_posting" USING btree ("organizationId","requisitionId");--> statement-breakpoint
CREATE INDEX "hrm_job_posting_org_channel_status_idx" ON "hrm_job_posting" USING btree ("organizationId","channel","status");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_status_idx" ON "hrm_job_requisition" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_department_idx" ON "hrm_job_requisition" USING btree ("organizationId","departmentId");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_position_idx" ON "hrm_job_requisition" USING btree ("organizationId","positionId");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_approval_idx" ON "hrm_job_requisition" USING btree ("organizationId","approvalState");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_manager_idx" ON "hrm_job_requisition" USING btree ("organizationId","hiringManagerUserId");--> statement-breakpoint
CREATE INDEX "hrm_kpi_goal_org_owner_idx" ON "hrm_kpi_goal" USING btree ("organizationId","ownerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_kpi_goal_org_status_idx" ON "hrm_kpi_goal" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_kpi_goal_org_dueDate_idx" ON "hrm_kpi_goal" USING btree ("organizationId","dueDate");--> statement-breakpoint
CREATE INDEX "hrm_kpi_goal_comment_org_goal_createdAt_idx" ON "hrm_kpi_goal_comment" USING btree ("organizationId","goalId","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_kpi_goal_milestone_org_goal_idx" ON "hrm_kpi_goal_milestone" USING btree ("organizationId","goalId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_kpi_metric_org_code_uidx" ON "hrm_kpi_metric" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_kpi_metric_org_state_idx" ON "hrm_kpi_metric" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_kpi_period_organizationId_idx" ON "hrm_kpi_period" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_kpi_score_org_period_employee_metric_uidx" ON "hrm_kpi_score" USING btree ("organizationId","periodId","employeeId","metricCode");--> statement-breakpoint
CREATE INDEX "hrm_kpi_score_organizationId_periodId_idx" ON "hrm_kpi_score" USING btree ("organizationId","periodId");--> statement-breakpoint
CREATE INDEX "hrm_kpi_score_org_period_metricId_idx" ON "hrm_kpi_score" USING btree ("organizationId","periodId","metricId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_leave_balance_unique_idx" ON "hrm_leave_balance" USING btree ("organizationId","employeeId","leaveTypeId","entitlementYear");--> statement-breakpoint
CREATE INDEX "hrm_leave_balance_org_employee_idx" ON "hrm_leave_balance" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_leave_entitlement_org_employee_type_year_uidx" ON "hrm_leave_entitlement" USING btree ("organizationId","employeeId","leaveTypeId","entitlementYear");--> statement-breakpoint
CREATE INDEX "hrm_leave_entitlement_org_employee_idx" ON "hrm_leave_entitlement" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_leave_entitlement_org_year_idx" ON "hrm_leave_entitlement" USING btree ("organizationId","entitlementYear");--> statement-breakpoint
CREATE INDEX "hrm_leave_policy_org_leaveTypeId_idx" ON "hrm_leave_policy" USING btree ("organizationId","leaveTypeId");--> statement-breakpoint
CREATE INDEX "hrm_leave_policy_org_effectiveFrom_idx" ON "hrm_leave_policy" USING btree ("organizationId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_leave_request_org_employee_state_idx" ON "hrm_leave_request" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_leave_request_org_state_start_idx" ON "hrm_leave_request" USING btree ("organizationId","state","startDate");--> statement-breakpoint
CREATE INDEX "hrm_leave_request_org_leave_type_idx" ON "hrm_leave_request" USING btree ("organizationId","leaveTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_leave_type_org_code_uidx" ON "hrm_leave_type" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_leave_type_org_archivedAt_idx" ON "hrm_leave_type" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_event_org_employee_idx" ON "hrm_lifecycle_event" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_event_org_employee_kind_idx" ON "hrm_lifecycle_event" USING btree ("organizationId","employeeId","kind");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_event_org_effective_date_idx" ON "hrm_lifecycle_event" USING btree ("organizationId","effectiveDate");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_status_effective_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","status","effectiveDate");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_employee_status_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_kind_status_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","transitionKind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_lifecycle_transition_org_emp_kind_eff_status_uidx" ON "hrm_lifecycle_transition" USING btree ("organizationId","employeeId","transitionKind","effectiveDate","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_offboarding_approval_org_instance_step_uidx" ON "hrm_offboarding_approval_step" USING btree ("organizationId","offboardingInstanceId","stepKey");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_approval_org_status_idx" ON "hrm_offboarding_approval_step" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_offboarding_clearance_org_instance_key_uidx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","offboardingInstanceId","itemKey");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_clearance_org_instance_status_idx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","offboardingInstanceId","status");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_clearance_org_owner_status_idx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","ownerRole","status");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_employee_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_status_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_exit_type_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","exitType");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_last_working_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","lastWorkingDate");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_settlement_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","settlementReadinessStatus");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_boarding_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","boardingInstanceId");--> statement-breakpoint
CREATE INDEX "hrm_org_structure_change_history_org_resource_changedAt_idx" ON "hrm_org_structure_change_history" USING btree ("organizationId","resourceType","resourceId","changedAt");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_unit_effective_idx" ON "hrm_org_unit_version" USING btree ("organizationId","orgUnitId","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_org_unit_version_org_unit_effective_uidx" ON "hrm_org_unit_version" USING btree ("organizationId","orgUnitId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_parent_idx" ON "hrm_org_unit_version" USING btree ("organizationId","parentOrgUnitId");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_status_idx" ON "hrm_org_unit_version" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_manager_idx" ON "hrm_org_unit_version" USING btree ("organizationId","managerEmployeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_pay_component_country_treatment_org_effective_uidx" ON "hrm_pay_component_country_treatment" USING btree ("organizationId","countryCode","componentCode","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_pay_component_country_treatment_org_country_idx" ON "hrm_pay_component_country_treatment" USING btree ("organizationId","countryCode","componentCode");--> statement-breakpoint
CREATE INDEX "hrm_payroll_adjustment_org_period_idx" ON "hrm_payroll_adjustment" USING btree ("organizationId","periodId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_adjustment_org_employee_idx" ON "hrm_payroll_adjustment" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_exchange_rate_org_pair_date_uidx" ON "hrm_payroll_exchange_rate" USING btree ("organizationId","fromCurrency","toCurrency","effectiveDate");--> statement-breakpoint
CREATE INDEX "hrm_payroll_exchange_rate_pair_effective_idx" ON "hrm_payroll_exchange_rate" USING btree ("fromCurrency","toCurrency","effectiveDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_group_org_code_uidx" ON "hrm_payroll_group" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_payroll_group_org_active_idx" ON "hrm_payroll_group" USING btree ("organizationId","isActive","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_legal_entity_config_org_code_uidx" ON "hrm_payroll_legal_entity_config" USING btree ("organizationId","legalEntityCode");--> statement-breakpoint
CREATE INDEX "hrm_payroll_legal_entity_config_org_country_active_idx" ON "hrm_payroll_legal_entity_config" USING btree ("organizationId","countryCode","isActive");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_run_id_idx" ON "hrm_payroll_line" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_org_run_kind_idx" ON "hrm_payroll_line" USING btree ("organizationId","runId","lineKind");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_org_run_code_idx" ON "hrm_payroll_line" USING btree ("organizationId","runId","code");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_claim_id_idx" ON "hrm_payroll_line" USING btree ("claimId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_salary_advance_id_idx" ON "hrm_payroll_line" USING btree ("salaryAdvanceId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_bonus_payout_id_idx" ON "hrm_payroll_line" USING btree ("bonusPayoutId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_payment_org_batch_employee_uidx" ON "hrm_payroll_payment" USING btree ("organizationId","batchId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_org_batch_idx" ON "hrm_payroll_payment" USING btree ("organizationId","batchId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_org_status_idx" ON "hrm_payroll_payment" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_payment_batch_org_reference_uidx" ON "hrm_payroll_payment_batch" USING btree ("organizationId","reference");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_batch_org_period_idx" ON "hrm_payroll_payment_batch" USING btree ("organizationId","periodId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_period_org_start_end_uidx" ON "hrm_payroll_period" USING btree ("organizationId","periodStart","periodEnd");--> statement-breakpoint
CREATE INDEX "hrm_payroll_period_org_state_idx" ON "hrm_payroll_period" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_payroll_period_org_start_idx" ON "hrm_payroll_period" USING btree ("organizationId","periodStart");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_profile_org_employee_current_uidx" ON "hrm_payroll_profile" USING btree ("organizationId","employeeId") WHERE "hrm_payroll_profile"."effectiveTo" IS NULL;--> statement-breakpoint
CREATE INDEX "hrm_payroll_profile_organizationId_employeeId_effectiveFrom_idx" ON "hrm_payroll_profile" USING btree ("organizationId","employeeId","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_run_org_period_employee_uidx" ON "hrm_payroll_run" USING btree ("organizationId","periodId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_run_org_period_state_idx" ON "hrm_payroll_run" USING btree ("organizationId","periodId","state");--> statement-breakpoint
CREATE INDEX "hrm_payroll_run_org_employee_idx" ON "hrm_payroll_run" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_policy_ack_org_employee_policy_version_uidx" ON "hrm_policy_acknowledgement" USING btree ("organizationId","employeeId","policyId","policyVersion");--> statement-breakpoint
CREATE INDEX "hrm_policy_ack_org_policy_version_idx" ON "hrm_policy_acknowledgement" USING btree ("organizationId","policyId","policyVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_position_organizationId_code_uidx" ON "hrm_position" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_departmentId_idx" ON "hrm_position" USING btree ("organizationId","departmentId");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_archivedAt_idx" ON "hrm_position" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_reportsToPositionId_idx" ON "hrm_position" USING btree ("organizationId","reportsToPositionId");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_positionOwnerEmployeeId_idx" ON "hrm_position" USING btree ("organizationId","positionOwnerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_position_effective_idx" ON "hrm_position_version" USING btree ("organizationId","positionId","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_position_version_org_position_effective_uidx" ON "hrm_position_version" USING btree ("organizationId","positionId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_unit_idx" ON "hrm_position_version" USING btree ("organizationId","orgUnitId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_reports_to_idx" ON "hrm_position_version" USING btree ("organizationId","reportsToPositionId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_owner_idx" ON "hrm_position_version" USING btree ("organizationId","positionOwnerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_status_idx" ON "hrm_position_version" USING btree ("organizationId","positionStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_pre_employment_check_org_app_type_uidx" ON "hrm_pre_employment_check" USING btree ("organizationId","applicationId","checkType");--> statement-breakpoint
CREATE INDEX "hrm_pre_employment_check_org_status_idx" ON "hrm_pre_employment_check" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_assessment_org_application_idx" ON "hrm_recruitment_assessment" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_assessment_org_status_idx" ON "hrm_recruitment_assessment" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_comm_org_application_idx" ON "hrm_recruitment_communication" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_comm_org_type_idx" ON "hrm_recruitment_communication" USING btree ("organizationId","communicationType");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_event_org_subject_idx" ON "hrm_recruitment_event" USING btree ("organizationId","subjectKind","subjectId");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_event_org_created_idx" ON "hrm_recruitment_event" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_event_org_type_idx" ON "hrm_recruitment_event" USING btree ("organizationId","eventType");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_review_cycleId_employeeId_uidx" ON "hrm_review" USING btree ("cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_review_organizationId_cycleId_idx" ON "hrm_review" USING btree ("organizationId","cycleId");--> statement-breakpoint
CREATE INDEX "hrm_review_cycle_organizationId_idx" ON "hrm_review_cycle" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_org_employee_state_idx" ON "hrm_salary_advance" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_org_state_idx" ON "hrm_salary_advance" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_advance_installment_advance_seq_uidx" ON "hrm_salary_advance_installment" USING btree ("advanceId","sequence");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_installment_org_state_idx" ON "hrm_salary_advance_installment" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_installment_org_advance_due_idx" ON "hrm_salary_advance_installment" USING btree ("organizationId","advanceId","dueAfterPeriodEndIso");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_analysis_org_employee_idx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_analysis_org_version_idx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","analysisVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_analysis_org_employee_version_uidx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","employeeId","analysisVersion","compensationScope");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_audit_org_created_idx" ON "hrm_salary_benchmark_audit_history" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_audit_org_resource_idx" ON "hrm_salary_benchmark_audit_history" USING btree ("organizationId","resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_mapping_org_benchmark_idx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","benchmarkId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_mapping_org_state_idx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_mapping_org_job_uidx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","benchmarkId","internalJobId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_row_org_survey_idx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","surveyId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_row_org_version_idx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","benchmarkVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_row_org_survey_job_uidx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","surveyId","benchmarkJobCode","benchmarkLevel");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_survey_org_year_idx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","surveyYear");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_survey_org_provider_idx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_survey_org_version_uidx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","sourceVersion");--> statement-breakpoint
CREATE INDEX "hrm_screening_question_org_requisition_idx" ON "hrm_screening_question" USING btree ("organizationId","requisitionId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_screening_response_org_app_question_uidx" ON "hrm_screening_response" USING btree ("organizationId","applicationId","questionId");--> statement-breakpoint
CREATE INDEX "hrm_screening_response_org_application_idx" ON "hrm_screening_response" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_assignment_org_employee_date_uidx" ON "hrm_shift_assignment" USING btree ("organizationId","employeeId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_shift_assignment_org_date_idx" ON "hrm_shift_assignment" USING btree ("organizationId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_shift_assignment_org_template_idx" ON "hrm_shift_assignment" USING btree ("organizationId","shiftTemplateId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_template_org_code_uidx" ON "hrm_shift_template" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_shift_template_org_active_idx" ON "hrm_shift_template" USING btree ("organizationId","isActive","code");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_request_occurred_idx" ON "hrm_signature_event" USING btree ("requestId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_org_occurred_idx" ON "hrm_signature_event" USING btree ("organizationId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_type_idx" ON "hrm_signature_event" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_token_uidx" ON "hrm_signature_party" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_signer_order_uidx" ON "hrm_signature_party" USING btree ("requestId","signerOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_employee_uidx" ON "hrm_signature_party" USING btree ("requestId","signerEmployeeId") WHERE "signerEmployeeId" is not null;--> statement-breakpoint
CREATE INDEX "hrm_signature_party_next_reminder_idx" ON "hrm_signature_party" USING btree ("nextReminderAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_expires_at_idx" ON "hrm_signature_party" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_request_signing_status_idx" ON "hrm_signature_party" USING btree ("requestId","signingStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_public_slug_uidx" ON "hrm_signature_request" USING btree ("publicSlug");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_derived_status_idx" ON "hrm_signature_request" USING btree ("organizationId","derivedStatus");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_kind_subject_idx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_org_kind_subject_open_uidx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId") WHERE "derivedStatus" in ('draft', 'sent', 'partially_signed');--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_skill_org_code_uidx" ON "hrm_skill" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_skill_org_archived_idx" ON "hrm_skill" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_skill_category_org_code_uidx" ON "hrm_skill_category" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_time_report_org_employee_state_idx" ON "hrm_time_report" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_time_report_org_state_kind_idx" ON "hrm_time_report" USING btree ("organizationId","state","reportKind");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_assignment_org_course_emp_assigned_uidx" ON "hrm_training_assignment" USING btree ("organizationId","courseId","employeeId","assignedAt");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_employee_state_idx" ON "hrm_training_assignment" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_course_state_idx" ON "hrm_training_assignment" USING btree ("organizationId","courseId","state");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_session_idx" ON "hrm_training_assignment" USING btree ("organizationId","sessionId");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_due_assigned_idx" ON "hrm_training_assignment" USING btree ("organizationId","dueAt") WHERE "state" = 'assigned';--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_category_org_code_uidx" ON "hrm_training_category" USING btree ("organizationId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_course_org_code_uidx" ON "hrm_training_course" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_training_course_org_statutory_idx" ON "hrm_training_course" USING btree ("organizationId","statutoryFlag","statutoryAuthorityCode");--> statement-breakpoint
CREATE INDEX "hrm_training_event_org_employee_occurred_idx" ON "hrm_training_event" USING btree ("organizationId","employeeId","occurredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_event_daily_idempotency_uidx" ON "hrm_training_event" USING btree ("organizationId","employeeId","assignmentId","action",date_trunc('day', "occurredAt")) WHERE "assignmentId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_prerequisite_org_course_prereq_uidx" ON "hrm_training_prerequisite" USING btree ("organizationId","courseId","prerequisiteCourseId");--> statement-breakpoint
CREATE INDEX "hrm_training_prerequisite_org_course_idx" ON "hrm_training_prerequisite" USING btree ("organizationId","courseId");--> statement-breakpoint
CREATE INDEX "hrm_training_record_org_employee_completed_idx" ON "hrm_training_record" USING btree ("organizationId","employeeId","completedAt");--> statement-breakpoint
CREATE INDEX "hrm_training_record_org_expires_idx" ON "hrm_training_record" USING btree ("organizationId","expiresAt") WHERE "expiresAt" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_session_org_code_uidx" ON "hrm_training_session" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_training_session_org_course_start_idx" ON "hrm_training_session" USING btree ("organizationId","courseId","scheduledStartAt");--> statement-breakpoint
CREATE INDEX "hrm_training_session_org_open_state_idx" ON "hrm_training_session" USING btree ("organizationId","state") WHERE "state" IN ('scheduled', 'in_progress');--> statement-breakpoint
CREATE INDEX "iam_audit_event_organizationId_auditOrigin_createdAt_idx" ON "iam_audit_event" USING btree ("organizationId","auditOrigin","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_organizationId_createdAt_idx" ON "iam_audit_event" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_actorUserId_createdAt_idx" ON "iam_audit_event" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_action_createdAt_idx" ON "iam_audit_event" USING btree ("action","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_organization_id_createdAt_idx" ON "import_job" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_state_idx" ON "import_job" USING btree ("state");--> statement-breakpoint
CREATE INDEX "import_job_failure_jobId_createdAt_idx" ON "import_job_failure" USING btree ("jobId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_rowIndex_idx" ON "import_job_row" USING btree ("jobId","rowIndex");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_state_idx" ON "import_job_row" USING btree ("jobId","state");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_id_idx" ON "knowledge_chunk" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_document_idx" ON "knowledge_chunk" USING btree ("organizationId","documentId");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_hnsw" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_document_source_external_uidx" ON "knowledge_document" USING btree ("sourceId","externalId");--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_source_id_idx" ON "knowledge_document" USING btree ("organizationId","sourceId");--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_updatedAt_idx" ON "knowledge_document" USING btree ("organizationId","updatedAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_case_eval_set_id_created_at_idx" ON "knowledge_eval_case" USING btree ("evalSetId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_run_organization_eval_set_createdAt_idx" ON "knowledge_eval_run" USING btree ("organizationId","evalSetId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_set_organization_id_createdAt_idx" ON "knowledge_eval_set" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_credential_org_provider_uidx" ON "knowledge_org_credential" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_setting_organization_uidx" ON "knowledge_org_setting" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_createdAt_idx" ON "knowledge_source" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_enabled_idx" ON "knowledge_source" USING btree ("organizationId","enabled");--> statement-breakpoint
CREATE INDEX "lynx_demo_unicorn_organization_id_idx" ON "lynx_demo_unicorn" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "lynx_demo_unicorn_org_company_uidx" ON "lynx_demo_unicorn" USING btree ("organizationId","company");--> statement-breakpoint
CREATE INDEX "messenger_message_organizationId_createdAt_idx" ON "messenger_message" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "messenger_message_roomId_createdAt_idx" ON "messenger_message" USING btree ("roomId","createdAt");--> statement-breakpoint
CREATE INDEX "messenger_room_organizationId_lastMessageAt_idx" ON "messenger_room" USING btree ("organizationId","lastMessageAt");--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_room_member_roomId_userId_uidx" ON "messenger_room_member" USING btree ("roomId","userId");--> statement-breakpoint
CREATE INDEX "messenger_room_member_userId_lastReadAt_idx" ON "messenger_room_member" USING btree ("userId","lastReadAt");--> statement-breakpoint
CREATE INDEX "org_bot_link_organization_id_platform_idx" ON "org_bot_link" USING btree ("organizationId","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "org_capability_policy_org_capability_audience_uidx" ON "org_capability_policy" USING btree ("organizationId","capabilityId","audience");--> statement-breakpoint
CREATE INDEX "org_capability_policy_org_idx" ON "org_capability_policy" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "org_coordination_activity_contextId_createdAt_idx" ON "org_coordination_activity" USING btree ("contextId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_activity_organizationId_createdAt_idx" ON "org_coordination_activity" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_organization_lastActivityAt_idx" ON "org_coordination_context" USING btree ("organizationId","lastActivityAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_createdByUserId_createdAt_idx" ON "org_coordination_context" USING btree ("createdByUserId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_linkedEntity_idx" ON "org_coordination_context" USING btree ("organizationId","linkedEntityType","linkedEntityId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_coordination_operator_context_user_uidx" ON "org_coordination_operator" USING btree ("contextId","userId");--> statement-breakpoint
CREATE INDEX "org_coordination_operator_user_joinedAt_idx" ON "org_coordination_operator" USING btree ("userId","joinedAt");--> statement-breakpoint
CREATE INDEX "org_domain_signal_outbox_org_created_idx" ON "org_domain_signal_outbox" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "org_domain_signal_outbox_org_key_idx" ON "org_domain_signal_outbox" USING btree ("organizationId","signalKey");--> statement-breakpoint
CREATE INDEX "org_event_delivery_endpointId_createdAt_idx" ON "org_event_delivery" USING btree ("endpointId","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_delivery_state_createdAt_idx" ON "org_event_delivery" USING btree ("state","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_endpoint_organization_id_idx" ON "org_event_endpoint" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "org_feedback_event_organizationId_createdAt_idx" ON "org_feedback_event" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "org_feedback_event_organizationId_state_createdAt_idx" ON "org_feedback_event" USING btree ("organizationId","state","createdAt");--> statement-breakpoint
CREATE INDEX "org_feedback_event_actorUserId_createdAt_idx" ON "org_feedback_event" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "org_notification_notice_organization_publishedAt_idx" ON "org_notification_notice" USING btree ("organizationId","publishedAt");--> statement-breakpoint
CREATE INDEX "org_notification_notice_organization_closedAt_idx" ON "org_notification_notice" USING btree ("organizationId","closedAt");--> statement-breakpoint
CREATE INDEX "org_notification_notice_targetUser_publishedAt_idx" ON "org_notification_notice" USING btree ("organizationId","targetUserId","publishedAt");--> statement-breakpoint
CREATE INDEX "org_notification_notice_linkedEntity_idx" ON "org_notification_notice" USING btree ("organizationId","linkedEntityType","linkedEntityId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_notification_receipt_notice_user_uidx" ON "org_notification_receipt" USING btree ("noticeId","userId");--> statement-breakpoint
CREATE INDEX "org_notification_receipt_user_createdAt_idx" ON "org_notification_receipt" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "org_operational_scope_policy_org_scope_audience_uidx" ON "org_operational_scope_policy" USING btree ("organizationId","scopeType","audience");--> statement-breakpoint
CREATE INDEX "org_operational_scope_policy_org_idx" ON "org_operational_scope_policy" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_slug_uidx" ON "organization_portal" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_org_audience_active_uidx" ON "organization_portal" USING btree ("organizationId","audience") WHERE "organization_portal"."status" = 'active';--> statement-breakpoint
CREATE INDEX "organization_portal_org_idx" ON "organization_portal" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "organization_portal_org_audience_status_idx" ON "organization_portal" USING btree ("organizationId","audience","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_access_portal_user_audience_uidx" ON "organization_portal_access" USING btree ("portalId","userId","audience");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_access_employee_subject_active_uidx" ON "organization_portal_access" USING btree ("portalId","subjectId") WHERE "organization_portal_access"."status" = 'active' AND "organization_portal_access"."audience" = 'employee' AND "organization_portal_access"."subjectId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "organization_portal_access_org_user_status_idx" ON "organization_portal_access" USING btree ("organizationId","userId","status");--> statement-breakpoint
CREATE INDEX "organization_portal_access_portal_user_status_idx" ON "organization_portal_access" USING btree ("portalId","userId","status");--> statement-breakpoint
CREATE INDEX "organization_portal_access_portal_subject_idx" ON "organization_portal_access" USING btree ("portalId","subjectId");--> statement-breakpoint
CREATE INDEX "planner_activity_item_id_created_at_idx" ON "planner_activity" USING btree ("itemId","createdAt");--> statement-breakpoint
CREATE INDEX "planner_activity_signal_id_created_at_idx" ON "planner_activity" USING btree ("signalId","createdAt");--> statement-breakpoint
CREATE INDEX "planner_assignment_item_id_idx" ON "planner_assignment" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_assignment_role_subject_idx" ON "planner_assignment" USING btree ("role","subjectUserId");--> statement-breakpoint
CREATE INDEX "planner_attachment_item_id_idx" ON "planner_attachment" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_comment_item_id_created_at_idx" ON "planner_comment" USING btree ("itemId","createdAt");--> statement-breakpoint
CREATE INDEX "planner_item_organization_lifecycle_idx" ON "planner_item" USING btree ("organizationId","lifecycle");--> statement-breakpoint
CREATE INDEX "planner_item_owner_lifecycle_idx" ON "planner_item" USING btree ("ownerUserId","lifecycle");--> statement-breakpoint
CREATE INDEX "planner_item_due_at_idx" ON "planner_item" USING btree ("dueAt");--> statement-breakpoint
CREATE INDEX "planner_item_schedule_start_at_idx" ON "planner_item" USING btree ("scheduleStartAt");--> statement-breakpoint
CREATE INDEX "planner_item_source_signal_id_idx" ON "planner_item" USING btree ("sourceSignalId");--> statement-breakpoint
CREATE INDEX "planner_link_organization_idx" ON "planner_link" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "planner_link_owner_idx" ON "planner_link" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "planner_link_item_id_idx" ON "planner_link" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_link_signal_id_idx" ON "planner_link" USING btree ("signalId");--> statement-breakpoint
CREATE INDEX "planner_link_module_entity_idx" ON "planner_link" USING btree ("module","entityType","entityId");--> statement-breakpoint
CREATE INDEX "planner_pressure_snapshot_organization_idx" ON "planner_pressure_snapshot" USING btree ("organizationId","snapshotAt");--> statement-breakpoint
CREATE INDEX "planner_pressure_snapshot_owner_idx" ON "planner_pressure_snapshot" USING btree ("ownerUserId","snapshotAt");--> statement-breakpoint
CREATE INDEX "planner_ranking_snapshot_item_idx" ON "planner_ranking_snapshot" USING btree ("itemId","snapshotAt");--> statement-breakpoint
CREATE INDEX "planner_ranking_snapshot_signal_idx" ON "planner_ranking_snapshot" USING btree ("signalId","snapshotAt");--> statement-breakpoint
CREATE INDEX "planner_recurrence_item_id_idx" ON "planner_recurrence" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_recurrence_next_run_at_idx" ON "planner_recurrence" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "planner_relation_item_id_idx" ON "planner_relation" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_relation_related_item_id_idx" ON "planner_relation" USING btree ("relatedItemId");--> statement-breakpoint
CREATE INDEX "planner_relation_related_signal_id_idx" ON "planner_relation" USING btree ("relatedSignalId");--> statement-breakpoint
CREATE INDEX "planner_reminder_item_id_idx" ON "planner_reminder" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_reminder_status_remind_at_idx" ON "planner_reminder" USING btree ("status","remindAt");--> statement-breakpoint
CREATE INDEX "planner_schedule_item_id_idx" ON "planner_schedule" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_schedule_start_idx" ON "planner_schedule" USING btree ("scheduledStartAt");--> statement-breakpoint
CREATE INDEX "planner_session_organization_status_idx" ON "planner_session" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "planner_session_owner_status_idx" ON "planner_session" USING btree ("ownerUserId","status");--> statement-breakpoint
CREATE INDEX "planner_session_item_id_idx" ON "planner_session" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "planner_session_started_at_idx" ON "planner_session" USING btree ("startedAt");--> statement-breakpoint
CREATE INDEX "planner_signal_organization_lifecycle_idx" ON "planner_signal" USING btree ("organizationId","lifecycle");--> statement-breakpoint
CREATE INDEX "planner_signal_owner_lifecycle_idx" ON "planner_signal" USING btree ("ownerUserId","lifecycle");--> statement-breakpoint
CREATE INDEX "planner_signal_detected_at_idx" ON "planner_signal" USING btree ("detectedAt");--> statement-breakpoint
CREATE INDEX "planner_signal_correlation_key_idx" ON "planner_signal" USING btree ("correlationKey");--> statement-breakpoint
CREATE UNIQUE INDEX "planner_view_org_slug_uidx" ON "planner_view" USING btree ("organizationId","slug") WHERE "planner_view"."organizationId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "planner_view_owner_slug_uidx" ON "planner_view" USING btree ("ownerUserId","slug") WHERE "planner_view"."ownerUserId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rail_pinned_item_user_resource_uidx" ON "rail_pinned_item" USING btree ("organizationId","userId","workbenchId","resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "rail_pinned_item_lookup_idx" ON "rail_pinned_item" USING btree ("organizationId","userId","workbenchId","rank");--> statement-breakpoint
CREATE INDEX "rail_recent_item_lookup_idx" ON "rail_recent_item" USING btree ("organizationId","userId","workbenchId","occurredAt");--> statement-breakpoint
CREATE INDEX "rail_saved_view_lookup_idx" ON "rail_saved_view" USING btree ("organizationId","userId","workbenchId","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_authority_org_user_role_uidx" ON "tenant_authority" USING btree ("organizationId","userId","role");--> statement-breakpoint
CREATE INDEX "tenant_authority_org_role_idx" ON "tenant_authority" USING btree ("organizationId","role","status");--> statement-breakpoint
CREATE INDEX "tenant_authority_org_user_idx" ON "tenant_authority" USING btree ("organizationId","userId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_capability_preference_org_user_capability_uidx" ON "user_capability_preference" USING btree ("organizationId","userId","capabilityId");--> statement-breakpoint
CREATE INDEX "user_capability_preference_org_user_idx" ON "user_capability_preference" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_operational_scope_org_user_scope_uidx" ON "user_operational_scope" USING btree ("organizationId","userId","scopeType");--> statement-breakpoint
CREATE INDEX "user_operational_scope_org_user_idx" ON "user_operational_scope" USING btree ("organizationId","userId");