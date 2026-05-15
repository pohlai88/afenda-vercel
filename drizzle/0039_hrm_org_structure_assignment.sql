ALTER TABLE "hrm_job_grade"
  ADD COLUMN IF NOT EXISTS "ordinal" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minSalaryAmount" numeric(15,2),
  ADD COLUMN IF NOT EXISTS "maxSalaryAmount" numeric(15,2),
  ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'MYR',
  ADD COLUMN IF NOT EXISTS "benefitTierCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_department"
  ADD COLUMN IF NOT EXISTS "headEmployeeId" text,
  ADD COLUMN IF NOT EXISTS "costCenterCode" text;
--> statement-breakpoint
ALTER TABLE "hrm_position"
  ADD COLUMN IF NOT EXISTS "reportsToPositionId" text,
  ADD COLUMN IF NOT EXISTS "employmentType" text NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS "headcountBudget" integer;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hrm_position_reportsToPositionId_hrm_position_id_fk'
  ) THEN
    ALTER TABLE "hrm_position"
      ADD CONSTRAINT "hrm_position_reportsToPositionId_hrm_position_id_fk"
      FOREIGN KEY ("reportsToPositionId") REFERENCES "public"."hrm_position"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hrm_job_grade_organizationId_ordinal_idx"
  ON "hrm_job_grade" USING btree ("organizationId","ordinal");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hrm_department_organizationId_parentDepartmentId_idx"
  ON "hrm_department" USING btree ("organizationId","parentDepartmentId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hrm_position_organizationId_reportsToPositionId_idx"
  ON "hrm_position" USING btree ("organizationId","reportsToPositionId");
--> statement-breakpoint
CREATE TABLE "hrm_employee_assignment" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL,
  "departmentId" text,
  "positionId" text,
  "jobGradeId" text,
  "managerEmployeeId" text,
  "costCenterCode" text,
  "workLocationCode" text,
  "effectiveFrom" date NOT NULL,
  "effectiveTo" date,
  "status" text NOT NULL DEFAULT 'active',
  "reason" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment"
  ADD CONSTRAINT "hrm_employee_assignment_employeeId_hrm_employee_id_fk"
  FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment"
  ADD CONSTRAINT "hrm_employee_assignment_departmentId_hrm_department_id_fk"
  FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment"
  ADD CONSTRAINT "hrm_employee_assignment_positionId_hrm_position_id_fk"
  FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment"
  ADD CONSTRAINT "hrm_employee_assignment_jobGradeId_hrm_job_grade_id_fk"
  FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_employee_assignment"
  ADD CONSTRAINT "hrm_employee_assignment_managerEmployeeId_hrm_employee_id_fk"
  FOREIGN KEY ("managerEmployeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_employee_effective_idx"
  ON "hrm_employee_assignment" USING btree ("organizationId","employeeId","effectiveFrom");
--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_active_idx"
  ON "hrm_employee_assignment" USING btree ("organizationId","status","effectiveTo");
--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_department_idx"
  ON "hrm_employee_assignment" USING btree ("organizationId","departmentId");
--> statement-breakpoint
CREATE INDEX "hrm_employee_assignment_org_position_idx"
  ON "hrm_employee_assignment" USING btree ("organizationId","positionId");
--> statement-breakpoint
INSERT INTO "hrm_employee_assignment" (
  "id",
  "organizationId",
  "employeeId",
  "departmentId",
  "positionId",
  "jobGradeId",
  "managerEmployeeId",
  "costCenterCode",
  "workLocationCode",
  "effectiveFrom",
  "status",
  "reason",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId"
)
SELECT
  gen_random_uuid()::text,
  e."organizationId",
  e."id",
  e."currentDepartmentId",
  e."currentPositionId",
  e."currentJobGradeId",
  e."managerEmployeeId",
  d."costCenterCode",
  e."workStateCode",
  COALESCE(e."employmentStartDate", CURRENT_DATE),
  CASE WHEN e."archivedAt" IS NULL THEN 'active' ELSE 'archived' END,
  'compatibility_backfill',
  now(),
  now(),
  e."createdByUserId",
  e."updatedByUserId"
FROM "hrm_employee" e
LEFT JOIN "hrm_department" d
  ON d."id" = e."currentDepartmentId"
 AND d."organizationId" = e."organizationId"
WHERE
  e."currentDepartmentId" IS NOT NULL
  OR e."currentPositionId" IS NOT NULL
  OR e."currentJobGradeId" IS NOT NULL
  OR e."managerEmployeeId" IS NOT NULL;
