CREATE TABLE "hrm_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text,
	"documentType" text NOT NULL,
	"subjectKind" text,
	"subjectId" text,
	"title" text NOT NULL,
	"blobUrl" text NOT NULL,
	"payloadHash" text NOT NULL,
	"mimeType" text NOT NULL,
	"sizeBytes" integer NOT NULL,
	"classification" text DEFAULT 'internal' NOT NULL,
	"retentionPolicyCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"signedByUserId" text,
	"signedAt" timestamp,
	"replacedByDocumentId" text,
	"uploadedByUserId" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_employment_contract" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"versionNumber" integer NOT NULL,
	"contractType" text NOT NULL,
	"state" text NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"probationEndDate" date,
	"confirmationDate" date,
	"terminationDate" date,
	"terminationReason" text,
	"terminationNoticeDays" integer,
	"positionId" text,
	"departmentId" text,
	"jobGradeId" text,
	"workingPatternId" text,
	"baseSalaryAmount" numeric(15, 2),
	"baseSalaryCurrency" text DEFAULT 'MYR' NOT NULL,
	"payFrequency" text DEFAULT 'monthly' NOT NULL,
	"normalWorkingHoursPerWeek" numeric(5, 2),
	"signedDocumentId" text,
	"temporalPast" jsonb,
	"temporalNow" jsonb,
	"temporalNext" jsonb,
	"predictions" jsonb,
	"audit7w1h" jsonb,
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
CREATE TABLE "hrm_payroll_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"countryCode" text DEFAULT 'MY' NOT NULL,
	"taxResidencyCountry" text,
	"taxIdentifierType" text,
	"taxIdentifierNumber" text,
	"epfNumber" text,
	"socsoNumber" text,
	"eisEligible" boolean DEFAULT true NOT NULL,
	"pcbCategory" text,
	"hrdfApplicable" boolean DEFAULT false NOT NULL,
	"bankCode" text,
	"bankAccountTokenized" text,
	"bankAccountHolderName" text,
	"paySchedule" text DEFAULT 'monthly' NOT NULL,
	"payCurrency" text DEFAULT 'MYR' NOT NULL,
	"payrollGroupCode" text,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"statutoryProfileExtras" jsonb,
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
ALTER TABLE "hrm_employee" ADD COLUMN "currentEmploymentContractId" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_replacedByDocumentId_hrm_document_id_fk" FOREIGN KEY ("replacedByDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_positionId_hrm_position_id_fk" FOREIGN KEY ("positionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD CONSTRAINT "hrm_employment_contract_signedDocumentId_hrm_document_id_fk" FOREIGN KEY ("signedDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_profile" ADD CONSTRAINT "hrm_payroll_profile_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee" ADD CONSTRAINT "hrm_employee_currentEmploymentContractId_hrm_employment_contract_id_fk" FOREIGN KEY ("currentEmploymentContractId") REFERENCES "public"."hrm_employment_contract"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employment_contract_organizationId_employeeId_version_uidx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId","versionNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employment_contract_org_employee_active_uidx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId") WHERE state = 'active';--> statement-breakpoint
CREATE INDEX "hrm_employment_contract_organizationId_employeeId_effectiveFrom_idx" ON "hrm_employment_contract" USING btree ("organizationId","employeeId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_employment_contract_organizationId_state_idx" ON "hrm_employment_contract" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_profile_org_employee_current_uidx" ON "hrm_payroll_profile" USING btree ("organizationId","employeeId") WHERE "effectiveTo" IS NULL;--> statement-breakpoint
CREATE INDEX "hrm_payroll_profile_organizationId_employeeId_effectiveFrom_idx" ON "hrm_payroll_profile" USING btree ("organizationId","employeeId","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_employeeId_documentType_idx" ON "hrm_document" USING btree ("organizationId","employeeId","documentType");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_subjectKind_subjectId_idx" ON "hrm_document" USING btree ("organizationId","subjectKind","subjectId");--> statement-breakpoint
CREATE INDEX "hrm_document_organizationId_effectiveTo_idx" ON "hrm_document" USING btree ("organizationId","effectiveTo");
