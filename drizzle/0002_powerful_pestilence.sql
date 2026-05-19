ALTER TABLE "hrm_flexible_work_request" ADD COLUMN "suspendedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD COLUMN "suspensionReason" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD COLUMN "terminatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD COLUMN "terminationReason" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD COLUMN "renewalOfRequestId" text;