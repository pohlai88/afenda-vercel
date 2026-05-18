CREATE TABLE "hrm_salary_benchmark_analysis_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"benchmarkId" text NOT NULL,
	"mappingId" text,
	"analysisVersion" text NOT NULL,
	"compensationScope" text DEFAULT 'base_salary' NOT NULL,
	"thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currencyConversionReference" text,
	"recommendationHandoffState" text DEFAULT 'none' NOT NULL,
	"recommendationHandoffAt" timestamp,
	"generatedByUserId" text,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_audit_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"action" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" text NOT NULL,
	"actorUserId" text,
	"snapshotVersion" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"benchmarkId" text NOT NULL,
	"internalJobId" text NOT NULL,
	"internalJobTitle" text NOT NULL,
	"internalJobFamily" text NOT NULL,
	"internalGrade" text NOT NULL,
	"legalEntityCode" text,
	"countryCode" text NOT NULL,
	"location" text,
	"employmentCategory" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"sourceVersion" text NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_row" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"surveyId" text NOT NULL,
	"benchmarkVersion" text NOT NULL,
	"jobFamily" text NOT NULL,
	"benchmarkJobCode" text NOT NULL,
	"benchmarkJobTitle" text NOT NULL,
	"benchmarkLevel" text NOT NULL,
	"industry" text,
	"countryCode" text NOT NULL,
	"location" text,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"minimum" numeric(15, 2),
	"midpoint" numeric(15, 2),
	"median" numeric(15, 2),
	"average" numeric(15, 2),
	"maximum" numeric(15, 2),
	"p25" numeric(15, 2),
	"p50" numeric(15, 2),
	"p75" numeric(15, 2),
	"p90" numeric(15, 2),
	"sampleSize" integer,
	"effectiveDate" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_benchmark_survey" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"surveyYear" integer NOT NULL,
	"surveyName" text,
	"industry" text,
	"companySizeSegment" text,
	"revenueSegment" text,
	"countryCode" text NOT NULL,
	"location" text,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"effectiveDate" date NOT NULL,
	"sourceVersion" text NOT NULL,
	"confidenceLevel" numeric(5, 4),
	"uploadedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_benchmarkId_hrm_salary_benchmark_row_id_fk" FOREIGN KEY ("benchmarkId") REFERENCES "public"."hrm_salary_benchmark_row"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_analysis_snapshot" ADD CONSTRAINT "hrm_salary_benchmark_analysis_snapshot_mappingId_hrm_salary_benchmark_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."hrm_salary_benchmark_mapping"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_mapping" ADD CONSTRAINT "hrm_salary_benchmark_mapping_benchmarkId_hrm_salary_benchmark_row_id_fk" FOREIGN KEY ("benchmarkId") REFERENCES "public"."hrm_salary_benchmark_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_benchmark_row" ADD CONSTRAINT "hrm_salary_benchmark_row_surveyId_hrm_salary_benchmark_survey_id_fk" FOREIGN KEY ("surveyId") REFERENCES "public"."hrm_salary_benchmark_survey"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_analysis_org_employee_idx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_analysis_org_version_idx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","analysisVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_analysis_org_employee_version_uidx" ON "hrm_salary_benchmark_analysis_snapshot" USING btree ("organizationId","employeeId","analysisVersion","compensationScope");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_audit_org_created_idx" ON "hrm_salary_benchmark_audit_history" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_audit_org_resource_idx" ON "hrm_salary_benchmark_audit_history" USING btree ("organizationId","resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_mapping_org_benchmark_idx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","benchmarkId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_mapping_org_state_idx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_mapping_org_job_uidx" ON "hrm_salary_benchmark_mapping" USING btree ("organizationId","benchmarkId","internalJobId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_row_org_survey_idx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","surveyId");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_row_org_version_idx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","benchmarkVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_row_org_survey_job_uidx" ON "hrm_salary_benchmark_row" USING btree ("organizationId","surveyId","benchmarkJobCode","benchmarkLevel");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_survey_org_year_idx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","surveyYear");--> statement-breakpoint
CREATE INDEX "hrm_salary_benchmark_survey_org_provider_idx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_benchmark_survey_org_version_uidx" ON "hrm_salary_benchmark_survey" USING btree ("organizationId","sourceVersion");