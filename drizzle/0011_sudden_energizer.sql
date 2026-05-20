ALTER TABLE "hrm_overtime_policy" ADD COLUMN "enforceClaimDeadlineOnSubmit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "requireHrSecondApproval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "managerChainMaxDepth" integer DEFAULT 1 NOT NULL;