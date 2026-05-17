CREATE TABLE "hrm_compliance_obligation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"complianceArea" text NOT NULL,
	"requirementKind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"countryCode" text,
	"legalEntityCode" text,
	"departmentId" text,
	"workLocationCode" text,
	"employmentType" text,
	"workerCategory" text,
	"policyId" text,
	"policyVersion" text,
	"acknowledgementDeadline" date,
	"dueDate" date,
	"alertLeadDays" integer DEFAULT 7 NOT NULL,
	"sourceReferenceId" text,
	"metadata" jsonb,
	"effectiveFrom" date,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD COLUMN "correctiveActionProgressNote" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD COLUMN "correctiveActionEvidenceDocumentId" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD COLUMN "correctiveActionUpdatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD COLUMN "resolutionNote" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD COLUMN "resolvedEvidenceDocumentId" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "legalEntityCode" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "workLocationCode" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "employmentType" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "workerCategory" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "waivedAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_compliance_filing" ADD COLUMN "waivedByUserId" text;--> statement-breakpoint
ALTER TABLE "hrm_compliance_obligation" ADD CONSTRAINT "hrm_compliance_obligation_departmentId_hrm_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."hrm_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compliance_obligation_org_code_uidx" ON "hrm_compliance_obligation" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_kind_status_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","requirementKind","status");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_area_status_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","complianceArea","status");--> statement-breakpoint
CREATE INDEX "hrm_compliance_obligation_org_scope_idx" ON "hrm_compliance_obligation" USING btree ("organizationId","countryCode","legalEntityCode","departmentId","workLocationCode");--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD CONSTRAINT "hrm_compliance_exception_correctiveActionEvidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("correctiveActionEvidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compliance_exception" ADD CONSTRAINT "hrm_compliance_exception_resolvedEvidenceDocumentId_hrm_document_id_fk" FOREIGN KEY ("resolvedEvidenceDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_compliance_exception_org_owner_due_idx" ON "hrm_compliance_exception" USING btree ("organizationId","correctiveActionOwnerUserId","correctiveActionDueDate");