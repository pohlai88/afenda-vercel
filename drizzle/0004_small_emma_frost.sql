CREATE TABLE "hrm_leave_blackout" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"leaveTypeId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_org_holiday" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"holidayDate" date NOT NULL,
	"name" text NOT NULL,
	"regionCode" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_leave_request" ADD COLUMN "returnedReason" text;--> statement-breakpoint
ALTER TABLE "hrm_leave_request" ADD COLUMN "medicalCertificateRef" text;--> statement-breakpoint
ALTER TABLE "hrm_leave_type" ADD COLUMN "minNoticeDays" integer;--> statement-breakpoint
ALTER TABLE "hrm_leave_type" ADD COLUMN "maxConsecutiveDays" integer;--> statement-breakpoint
ALTER TABLE "hrm_leave_type" ADD COLUMN "requiresAttachment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_leave_blackout" ADD CONSTRAINT "hrm_leave_blackout_leaveTypeId_hrm_leave_type_id_fk" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."hrm_leave_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_leave_blackout_org_active_idx" ON "hrm_leave_blackout" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_leave_blackout_org_range_idx" ON "hrm_leave_blackout" USING btree ("organizationId","startDate","endDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_org_holiday_org_date_uidx" ON "hrm_org_holiday" USING btree ("organizationId","holidayDate");--> statement-breakpoint
CREATE INDEX "hrm_org_holiday_org_active_idx" ON "hrm_org_holiday" USING btree ("organizationId","isActive");