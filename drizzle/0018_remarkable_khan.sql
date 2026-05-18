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
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_arrangementTypeId_hrm_flexible_work_arrangement_type_id_fk" FOREIGN KEY ("arrangementTypeId") REFERENCES "public"."hrm_flexible_work_arrangement_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_request" ADD CONSTRAINT "hrm_flexible_work_request_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_schedule_pattern" ADD CONSTRAINT "hrm_flexible_work_schedule_pattern_requestId_hrm_flexible_work_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_flexible_work_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_fwa_type_org_code_uidx" ON "hrm_flexible_work_arrangement_type" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_fwa_type_org_archivedAt_idx" ON "hrm_flexible_work_arrangement_type" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_employee_state_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_state_start_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","state","startDate");--> statement-breakpoint
CREATE INDEX "hrm_fwa_request_org_type_idx" ON "hrm_flexible_work_request" USING btree ("organizationId","arrangementTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_fwa_schedule_request_day_uidx" ON "hrm_flexible_work_schedule_pattern" USING btree ("requestId","dayOfWeek");--> statement-breakpoint
CREATE INDEX "hrm_fwa_schedule_org_request_idx" ON "hrm_flexible_work_schedule_pattern" USING btree ("organizationId","requestId");