CREATE TABLE "hrm_employee_reporting_relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"managerEmployeeId" text NOT NULL,
	"relationshipType" text NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"status" text DEFAULT 'active' NOT NULL,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_org_unit_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"orgUnitId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"orgUnitType" text DEFAULT 'department' NOT NULL,
	"parentOrgUnitId" text,
	"managerEmployeeId" text,
	"costCenterCode" text,
	"workLocationCode" text,
	"status" text DEFAULT 'active' NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_position_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"positionId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"orgUnitId" text NOT NULL,
	"positionOwnerEmployeeId" text,
	"reportsToPositionId" text,
	"defaultGradeId" text,
	"employmentType" text DEFAULT 'permanent' NOT NULL,
	"headcountBudget" integer,
	"positionStatus" text DEFAULT 'active' NOT NULL,
	"costCenterCode" text,
	"workLocationCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"reason" text,
	"approvalReference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_department" ADD COLUMN "orgUnitStatus" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD COLUMN "positionOwnerEmployeeId" text;--> statement-breakpoint
ALTER TABLE "hrm_employee_reporting_relationship" ADD CONSTRAINT "hrm_employee_reporting_relationship_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_reporting_relationship" ADD CONSTRAINT "hrm_employee_reporting_relationship_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_orgUnitId_hrm_department_id_fk" FOREIGN KEY ("orgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_parentOrgUnitId_hrm_department_id_fk" FOREIGN KEY ("parentOrgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_org_unit_version" ADD CONSTRAINT "hrm_org_unit_version_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_orgUnitId_hrm_department_id_fk" FOREIGN KEY ("orgUnitId") REFERENCES "public"."hrm_department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_positionOwnerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("positionOwnerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_reportsToPositionId_hrm_position_id_fk" FOREIGN KEY ("reportsToPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position_version" ADD CONSTRAINT "hrm_position_version_defaultGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("defaultGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_employee_type_effective_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","employeeId","relationshipType","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_manager_type_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","managerEmployeeId","relationshipType");--> statement-breakpoint
CREATE INDEX "hrm_employee_reporting_org_status_idx" ON "hrm_employee_reporting_relationship" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_unit_effective_idx" ON "hrm_org_unit_version" USING btree ("organizationId","orgUnitId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_parent_idx" ON "hrm_org_unit_version" USING btree ("organizationId","parentOrgUnitId");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_status_idx" ON "hrm_org_unit_version" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_org_unit_version_org_manager_idx" ON "hrm_org_unit_version" USING btree ("organizationId","managerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_position_effective_idx" ON "hrm_position_version" USING btree ("organizationId","positionId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_unit_idx" ON "hrm_position_version" USING btree ("organizationId","orgUnitId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_reports_to_idx" ON "hrm_position_version" USING btree ("organizationId","reportsToPositionId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_owner_idx" ON "hrm_position_version" USING btree ("organizationId","positionOwnerEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_position_version_org_status_idx" ON "hrm_position_version" USING btree ("organizationId","positionStatus");--> statement-breakpoint
CREATE INDEX "hrm_department_organizationId_orgUnitStatus_idx" ON "hrm_department" USING btree ("organizationId","orgUnitStatus");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_positionOwnerEmployeeId_idx" ON "hrm_position" USING btree ("organizationId","positionOwnerEmployeeId");