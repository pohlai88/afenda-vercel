CREATE TABLE "hrm_overtime_eligibility_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"overtimeTypeId" text NOT NULL,
	"departmentId" text,
	"jobGradeId" text,
	"employmentType" text,
	"legalEntityCode" text,
	"countryCode" text,
	"workLocationCode" text,
	"positionId" text,
	"workerCategory" text,
	"policyGroupCode" text,
	"allowException" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_overtime_type" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"dayCategory" text DEFAULT 'normal_day' NOT NULL,
	"description" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_overtime_request" ADD COLUMN "overtimeTypeId" text;--> statement-breakpoint
ALTER TABLE "hrm_overtime_eligibility_rule" ADD CONSTRAINT "hrm_overtime_eligibility_rule_overtimeTypeId_hrm_overtime_type_id_fk" FOREIGN KEY ("overtimeTypeId") REFERENCES "public"."hrm_overtime_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_overtime_eligibility_org_type_idx" ON "hrm_overtime_eligibility_rule" USING btree ("organizationId","overtimeTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_overtime_type_org_code_uidx" ON "hrm_overtime_type" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_overtime_type_org_archivedAt_idx" ON "hrm_overtime_type" USING btree ("organizationId","archivedAt");--> statement-breakpoint
ALTER TABLE "hrm_overtime_request" ADD CONSTRAINT "hrm_overtime_request_overtimeTypeId_hrm_overtime_type_id_fk" FOREIGN KEY ("overtimeTypeId") REFERENCES "public"."hrm_overtime_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_overtime_request_org_type_idx" ON "hrm_overtime_request" USING btree ("organizationId","overtimeTypeId");