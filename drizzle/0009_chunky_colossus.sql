CREATE TABLE "hrm_document_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"documentType" text NOT NULL,
	"documentGroup" text NOT NULL,
	"legalEntityId" text,
	"employmentType" text,
	"isMandatory" boolean DEFAULT true NOT NULL,
	"allowEmployeeSubmission" boolean DEFAULT false NOT NULL,
	"allowEmployeeAccess" boolean DEFAULT false NOT NULL,
	"requiresExpiryDate" boolean DEFAULT false NOT NULL,
	"retentionPolicyCode" text,
	"status" text DEFAULT 'active' NOT NULL,
	"effectiveFrom" date,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_document_retention_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"documentGroup" text,
	"documentType" text,
	"retentionPeriodDays" integer NOT NULL,
	"archiveAfterSeparation" boolean DEFAULT true NOT NULL,
	"deleteAfterRetention" boolean DEFAULT false NOT NULL,
	"anonymizeAfterRetention" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_ess_document_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedByUserId" text NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"reviewNote" text,
	"fulfilledDocumentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_ess_profile_update_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"section" text NOT NULL,
	"requestedChanges" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedByUserId" text NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"reviewNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_exchange_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"fromCurrency" text NOT NULL,
	"toCurrency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"effectiveDate" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "documentSetId" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "previousDocumentId" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "legalEntityId" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "documentGroup" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "documentLifecycleStatus" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "isLatestVersion" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "retentionUntil" date;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "archivedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "archivedByUserId" text;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_document" ADD COLUMN "deletedByUserId" text;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD COLUMN "policyTitle" text;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD COLUMN "acknowledgementMethod" text DEFAULT 'employee_portal' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD COLUMN "acknowledgementSource" text DEFAULT 'employee_self_service' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD COLUMN "acknowledgedByUserId" text;--> statement-breakpoint
ALTER TABLE "hrm_policy_acknowledgement" ADD COLUMN "actorSessionId" text;--> statement-breakpoint
ALTER TABLE "hrm_ess_document_request" ADD CONSTRAINT "hrm_ess_document_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_ess_document_request" ADD CONSTRAINT "hrm_ess_document_request_fulfilledDocumentId_hrm_document_id_fk" FOREIGN KEY ("fulfilledDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_ess_profile_update_request" ADD CONSTRAINT "hrm_ess_profile_update_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_requirement_org_code_uidx" ON "hrm_document_requirement" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_type_status_idx" ON "hrm_document_requirement" USING btree ("organizationId","documentType","status");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_group_status_idx" ON "hrm_document_requirement" USING btree ("organizationId","documentGroup","status");--> statement-breakpoint
CREATE INDEX "hrm_document_requirement_org_legal_entity_idx" ON "hrm_document_requirement" USING btree ("organizationId","legalEntityId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_retention_rule_org_code_uidx" ON "hrm_document_retention_rule" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_document_retention_rule_org_status_idx" ON "hrm_document_retention_rule" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_document_retention_rule_org_group_type_idx" ON "hrm_document_retention_rule" USING btree ("organizationId","documentGroup","documentType");--> statement-breakpoint
CREATE INDEX "hrm_ess_document_request_org_employee_status_idx" ON "hrm_ess_document_request" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_ess_document_request_org_status_created_idx" ON "hrm_ess_document_request" USING btree ("organizationId","status","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_ess_profile_update_request_org_employee_status_idx" ON "hrm_ess_profile_update_request" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_ess_profile_update_request_org_status_created_idx" ON "hrm_ess_profile_update_request" USING btree ("organizationId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_exchange_rate_org_pair_date_uidx" ON "hrm_payroll_exchange_rate" USING btree ("organizationId","fromCurrency","toCurrency","effectiveDate");--> statement-breakpoint
CREATE INDEX "hrm_payroll_exchange_rate_pair_effective_idx" ON "hrm_payroll_exchange_rate" USING btree ("fromCurrency","toCurrency","effectiveDate");--> statement-breakpoint
ALTER TABLE "hrm_document" ADD CONSTRAINT "hrm_document_previousDocumentId_hrm_document_id_fk" FOREIGN KEY ("previousDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_document_org_set_version_uidx" ON "hrm_document" USING btree ("organizationId","documentSetId","versionNumber");--> statement-breakpoint
CREATE INDEX "hrm_document_org_employee_latest_idx" ON "hrm_document" USING btree ("organizationId","employeeId","isLatestVersion");--> statement-breakpoint
CREATE INDEX "hrm_document_org_lifecycle_status_idx" ON "hrm_document" USING btree ("organizationId","documentLifecycleStatus","verificationStatus");--> statement-breakpoint
CREATE INDEX "hrm_document_org_group_type_idx" ON "hrm_document" USING btree ("organizationId","documentGroup","documentType");--> statement-breakpoint
CREATE INDEX "hrm_document_org_legal_entity_idx" ON "hrm_document" USING btree ("organizationId","legalEntityId");--> statement-breakpoint
CREATE INDEX "hrm_document_org_uploadedAt_idx" ON "hrm_document" USING btree ("organizationId","uploadedAt");--> statement-breakpoint
CREATE INDEX "hrm_document_org_retentionUntil_idx" ON "hrm_document" USING btree ("organizationId","retentionUntil");--> statement-breakpoint
CREATE INDEX "hrm_policy_ack_org_policy_version_idx" ON "hrm_policy_acknowledgement" USING btree ("organizationId","policyId","policyVersion");