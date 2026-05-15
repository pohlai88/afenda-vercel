-- HRM claims enterprise metadata: audit reference, submitter, policy snapshot, payout method, and finance dimensions.
ALTER TABLE "hrm_claim_type" ADD COLUMN "periodLimit" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "annualLimit" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "evidenceRequiredAboveAmount" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "defaultPayoutMethod" text DEFAULT 'payroll' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "defaultFinanceAccountCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "defaultCostCenterCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim_type" ADD COLUMN "defaultTaxTreatment" text DEFAULT 'non_taxable_reimbursement' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "claimNumber" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "submittedByUserId" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "policySnapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "payoutMethod" text DEFAULT 'payroll' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "financeAccountCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "costCenterCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "projectCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_claim" ADD COLUMN "taxTreatment" text DEFAULT 'non_taxable_reimbursement' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_org_claim_number_uidx" ON "hrm_claim" USING btree ("organizationId","claimNumber");
--> statement-breakpoint
CREATE INDEX "hrm_claim_org_submitter_idx" ON "hrm_claim" USING btree ("organizationId","submittedByUserId");
--> statement-breakpoint
CREATE INDEX "hrm_claim_org_payout_state_idx" ON "hrm_claim" USING btree ("organizationId","payoutMethod","state");
