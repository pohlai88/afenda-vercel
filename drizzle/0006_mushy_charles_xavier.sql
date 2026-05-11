CREATE TABLE "hrm_department" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"parentDepartmentId" text,
	"headEmployeeId" text,
	"costCenterCode" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_employee" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeNumber" text NOT NULL,
	"legalName" text NOT NULL,
	"preferredName" text,
	"dateOfBirth" date,
	"gender" text,
	"nationality" text,
	"idDocumentType" text,
	"idDocumentNumber" text,
	"email" text,
	"phone" text,
	"address" jsonb,
	"countryCode" text,
	"workStateCode" text,
	"linkedUserId" text,
	"currentDepartmentId" text,
	"currentPositionId" text,
	"currentJobGradeId" text,
	"managerEmployeeId" text,
	"audit7w1h" jsonb,
	"archivedAt" timestamp,
	"archivedByUserId" text,
	"archivedReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"scenarioId" text,
	"scenarioVersion" integer,
	"simulationSeed" text
);
--> statement-breakpoint
CREATE TABLE "hrm_job_grade" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"minSalaryAmount" numeric(15, 2),
	"maxSalaryAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"benefitTierCode" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_position" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"departmentId" text NOT NULL,
	"defaultGradeId" text,
	"reportsToPositionId" text,
	"employmentType" text DEFAULT 'permanent' NOT NULL,
	"headcountBudget" integer,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_department" ADD CONSTRAINT "hrm_department_parentDepartmentId_hrm_department_id_fk" FOREIGN KEY ("parentDepartmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentDepartmentId_hrm_department_id_fk" FOREIGN KEY ("currentDepartmentId") REFERENCES "public"."hrm_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentPositionId_hrm_position_id_fk" FOREIGN KEY ("currentPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentJobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("currentJobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_managerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_defaultGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("defaultGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_position" ADD CONSTRAINT "hrm_position_reportsToPositionId_hrm_position_id_fk" FOREIGN KEY ("reportsToPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_department_organizationId_code_uidx" ON "hrm_department" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_department_organizationId_archivedAt_idx" ON "hrm_department" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_organizationId_employeeNumber_uidx" ON "hrm_employee" USING btree ("organizationId","employeeNumber");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_archivedAt_idx" ON "hrm_employee" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_email_idx" ON "hrm_employee" USING btree ("organizationId","email");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_currentDepartmentId_idx" ON "hrm_employee" USING btree ("organizationId","currentDepartmentId");--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_managerEmployeeId_idx" ON "hrm_employee" USING btree ("organizationId","managerEmployeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_job_grade_organizationId_code_uidx" ON "hrm_job_grade" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_job_grade_organizationId_archivedAt_idx" ON "hrm_job_grade" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_position_organizationId_code_uidx" ON "hrm_position" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_departmentId_idx" ON "hrm_position" USING btree ("organizationId","departmentId");--> statement-breakpoint
CREATE INDEX "hrm_position_organizationId_archivedAt_idx" ON "hrm_position" USING btree ("organizationId","archivedAt");