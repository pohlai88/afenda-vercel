CREATE TABLE "hrm_overtime_approval_route" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"label" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"departmentId" text,
	"costCenterCode" text,
	"workLocationCode" text,
	"jobGradeId" text,
	"minAmountCents" integer,
	"maxAmountCents" integer,
	"requiresEligibilityException" boolean,
	"requiresPolicyException" boolean,
	"approverKind" text NOT NULL,
	"managerChainDepth" integer,
	"targetUserId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_overtime_approval_route" ADD CONSTRAINT "hrm_overtime_approval_route_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_overtime_approval_route" ADD CONSTRAINT "hrm_overtime_approval_route_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_overtime_approval_route_org_priority_idx" ON "hrm_overtime_approval_route" USING btree ("organizationId","priority");--> statement-breakpoint
CREATE INDEX "hrm_overtime_approval_route_org_active_idx" ON "hrm_overtime_approval_route" USING btree ("organizationId","isActive");