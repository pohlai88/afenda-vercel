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
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitType" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitReason" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "effectiveSeparationDate" date;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "noticeStartDate" date;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "noticeEndDate" date;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "requiredNoticeDays" integer;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "noticeWaived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "shortNotice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "lastWorkingDate" date;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "boardingInstanceId" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "settlementReadinessStatus" text DEFAULT 'pending_clearance' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "settlementBlockers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "finalSettlementReference" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "rehireEligibility" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "rehireEligibilityNote" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitInterviewScheduledAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitInterviewCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitInterviewNote" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitInterviewFeedbackSummary" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "exitInterviewWouldRehire" boolean;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "replacementRequestReference" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "closureNote" text;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD COLUMN "completedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_approval_step" ADD CONSTRAINT "hrm_offboarding_approval_step_offboardingInstanceId_hrm_offboarding_instance_id_fk" FOREIGN KEY ("offboardingInstanceId") REFERENCES "public"."hrm_offboarding_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_offboardingInstanceId_hrm_offboarding_instance_id_fk" FOREIGN KEY ("offboardingInstanceId") REFERENCES "public"."hrm_offboarding_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_offboarding_clearance_item" ADD CONSTRAINT "hrm_offboarding_clearance_item_evidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("evidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_offboarding_approval_org_instance_step_uidx" ON "hrm_offboarding_approval_step" USING btree ("organizationId","offboardingInstanceId","stepKey");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_approval_org_status_idx" ON "hrm_offboarding_approval_step" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_offboarding_clearance_org_instance_key_uidx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","offboardingInstanceId","itemKey");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_clearance_org_instance_status_idx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","offboardingInstanceId","status");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_clearance_org_owner_status_idx" ON "hrm_offboarding_clearance_item" USING btree ("organizationId","ownerRole","status");--> statement-breakpoint
ALTER TABLE "hrm_offboarding_instance" ADD CONSTRAINT "hrm_offboarding_instance_boardingInstanceId_hrm_boarding_instance_id_fk" FOREIGN KEY ("boardingInstanceId") REFERENCES "public"."hrm_boarding_instance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_exit_type_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","exitType");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_last_working_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","lastWorkingDate");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_settlement_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","settlementReadinessStatus");--> statement-breakpoint
CREATE INDEX "hrm_offboarding_instance_org_boarding_idx" ON "hrm_offboarding_instance" USING btree ("organizationId","boardingInstanceId");