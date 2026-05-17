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
ALTER TABLE "hrm_benefit_claim_reference" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_benefit_open_enrollment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_benefit_provider" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_claim_duplicate_signal" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_ess_document_request" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_ess_profile_update_request" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_expense_fund" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_pay_component_country_treatment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_anomaly" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_correction" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_exchange_rate" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_group" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_legal_entity_config" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment_batch" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hrm_benefit_claim_reference" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_benefit_enrollment_dependent" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_benefit_open_enrollment" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_benefit_provider" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_claim_duplicate_signal" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_compliance_exception" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_compliance_filing" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_ess_document_request" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_ess_profile_update_request" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_expense_fund" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_pay_component_country_treatment" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_adjustment" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_anomaly" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_correction" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_exchange_rate" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_group" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_legal_entity_config" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_payment" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_payroll_payment_batch" CASCADE;--> statement-breakpoint
DROP TABLE "hrm_policy_acknowledgement" CASCADE;--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP CONSTRAINT "hrm_claim_expenseFundId_hrm_expense_fund_id_fk";
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" DROP CONSTRAINT "hrm_payroll_line_benefitEnrollmentId_hrm_benefit_enrollment_id_fk";
--> statement-breakpoint
ALTER TABLE "hrm_payroll_profile" DROP CONSTRAINT "hrm_payroll_profile_payrollGroupId_hrm_payroll_group_id_fk";
--> statement-breakpoint
DROP INDEX "hrm_candidate_magic_link_token_uidx";--> statement-breakpoint
DROP INDEX "hrm_claim_org_fund_state_idx";--> statement-breakpoint
DROP INDEX "hrm_offboarding_instance_org_exit_type_idx";--> statement-breakpoint
DROP INDEX "hrm_offboarding_instance_org_last_working_idx";--> statement-breakpoint
DROP INDEX "hrm_payroll_line_benefit_enrollment_id_idx";--> statement-breakpoint
ALTER TABLE "hrm_employee_personal_profile" ADD COLUMN "profilePhotoBlobUrl" text;--> statement-breakpoint
ALTER TABLE "hrm_employee_personal_profile" ADD COLUMN "profilePhotoUpdatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "positionId" text;--> statement-breakpoint
CREATE INDEX "hrm_org_structure_change_history_org_resource_changedAt_idx" ON "hrm_org_structure_change_history" USING btree ("organizationId","resourceType","resourceId","changedAt");--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_personalEmail_idx" ON "hrm_employee_contact_profile" USING btree ("organizationId","personalEmail");--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_personalPhone_idx" ON "hrm_employee_contact_profile" USING btree ("organizationId","personalPhone");--> statement-breakpoint
CREATE INDEX "hrm_employee_identity_document_org_document_number_idx" ON "hrm_employee_identity_document" USING btree ("organizationId","documentNumber");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_position_idx" ON "hrm_job_requisition" USING btree ("organizationId","positionId");--> statement-breakpoint
ALTER TABLE "hrm_benefit" DROP COLUMN "benefitCategory";--> statement-breakpoint
ALTER TABLE "hrm_benefit" DROP COLUMN "providerId";--> statement-breakpoint
ALTER TABLE "hrm_benefit" DROP COLUMN "scopeCountryCodes";--> statement-breakpoint
ALTER TABLE "hrm_benefit" DROP COLUMN "scopeLegalEntityCodes";--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" DROP COLUMN "effectiveTo";--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" DROP COLUMN "documentIds";--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" DROP COLUMN "eligibilityOverrideApprovedByUserId";--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" DROP COLUMN "eligibilityOverrideReason";--> statement-breakpoint
ALTER TABLE "hrm_candidate" DROP COLUMN "resumeDocumentId";--> statement-breakpoint
ALTER TABLE "hrm_candidate" DROP COLUMN "structuredProfile";--> statement-breakpoint
ALTER TABLE "hrm_candidate" DROP COLUMN "magicLinkToken";--> statement-breakpoint
ALTER TABLE "hrm_candidate" DROP COLUMN "magicLinkExpiresAt";--> statement-breakpoint
ALTER TABLE "hrm_candidate" DROP COLUMN "consentedTermsAt";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "expenseFundId";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "reimbursementMode";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "requestedAmount";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "approvedAmount";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "rejectedAmount";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "offsetAmount";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "claimCurrency";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "reimbursementCurrency";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "fxRate";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "fxRateAsOf";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "fxRateSource";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "fxSnapshot";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "eligibilitySnapshot";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "validationFlags";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "requiresExceptionApproval";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "exceptionApprovedByUserId";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "exceptionApprovedAt";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "exceptionReason";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "duplicateReviewStatus";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "returnedReason";--> statement-breakpoint
ALTER TABLE "hrm_claim" DROP COLUMN "paymentReference";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "verificationStatus";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "verifiedByUserId";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "verifiedAt";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "rejectionReason";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "versionNumber";--> statement-breakpoint
ALTER TABLE "hrm_document" DROP COLUMN "isMandatory";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "exitType";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "exitReason";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "lastWorkingDate";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "effectiveSeparationDate";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "noticeStartDate";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "noticeEndDate";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "requiredNoticeDays";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "rehireEligibility";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "settlementReadinessStatus";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "settlementBlockers";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "exitInterviewScheduledAt";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "exitInterviewCompletedAt";--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" DROP COLUMN "exitInterviewFeedback";--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" DROP COLUMN "benefitEnrollmentId";--> statement-breakpoint
ALTER TABLE "hrm_payroll_period" DROP COLUMN "cutoffDate";--> statement-breakpoint
ALTER TABLE "hrm_payroll_period" DROP COLUMN "payrollGroupCode";--> statement-breakpoint
ALTER TABLE "hrm_payroll_profile" DROP COLUMN "payrollGroupId";