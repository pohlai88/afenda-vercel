CREATE TABLE "hrm_flexible_work_eligibility_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"arrangementTypeId" text NOT NULL,
	"departmentId" text,
	"jobGradeId" text,
	"employmentType" text,
	"allowException" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD CONSTRAINT "hrm_flexible_work_eligibility_rule_arrangementTypeId_hrm_flexible_work_arrangement_type_id_fk" FOREIGN KEY ("arrangementTypeId") REFERENCES "public"."hrm_flexible_work_arrangement_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_fwa_eligibility_org_type_idx" ON "hrm_flexible_work_eligibility_rule" USING btree ("organizationId","arrangementTypeId");