CREATE TABLE "hrm_pay_component_country_treatment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"countryCode" text NOT NULL,
	"componentCode" text NOT NULL,
	"taxable" boolean NOT NULL,
	"contributable" boolean NOT NULL,
	"pensionable" boolean NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveTo" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_pay_component_country_treatment_country_chk" CHECK ("hrm_pay_component_country_treatment"."countryCode" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"employeeId" text NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"approvalId" text,
	"retroReferencePeriodId" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_group" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"countryCode" text DEFAULT 'MY' NOT NULL,
	"paySchedule" text DEFAULT 'monthly' NOT NULL,
	"payCurrency" text DEFAULT 'MYR' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_legal_entity_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"legalEntityCode" text NOT NULL,
	"countryCode" text NOT NULL,
	"registrationNumber" text,
	"defaultPayrollCurrency" text NOT NULL,
	"payrollCountryCode" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_payroll_legal_entity_config_country_chk" CHECK ("hrm_payroll_legal_entity_config"."countryCode" ~ '^[A-Z]{2}$' AND "hrm_payroll_legal_entity_config"."payrollCountryCode" ~ '^[A-Z]{2}$'),
	CONSTRAINT "hrm_payroll_legal_entity_config_currency_chk" CHECK ("hrm_payroll_legal_entity_config"."defaultPayrollCurrency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"batchId" text NOT NULL,
	"employeeId" text NOT NULL,
	"netAmount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_payroll_payment_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"reference" text NOT NULL,
	"state" text DEFAULT 'generated' NOT NULL,
	"documentId" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_payroll_period" ADD COLUMN "cutoffDate" date;--> statement-breakpoint
ALTER TABLE "hrm_payroll_period" ADD COLUMN "payrollGroupCode" text;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_approvalId_hrm_approval_id_fk" FOREIGN KEY ("approvalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_adjustment" ADD CONSTRAINT "hrm_payroll_adjustment_retroReferencePeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("retroReferencePeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment" ADD CONSTRAINT "hrm_payroll_payment_batchId_hrm_payroll_payment_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."hrm_payroll_payment_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment" ADD CONSTRAINT "hrm_payroll_payment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment_batch" ADD CONSTRAINT "hrm_payroll_payment_batch_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_payroll_payment_batch" ADD CONSTRAINT "hrm_payroll_payment_batch_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_pay_component_country_treatment_org_effective_uidx" ON "hrm_pay_component_country_treatment" USING btree ("organizationId","countryCode","componentCode","effectiveFrom");--> statement-breakpoint
CREATE INDEX "hrm_pay_component_country_treatment_org_country_idx" ON "hrm_pay_component_country_treatment" USING btree ("organizationId","countryCode","componentCode");--> statement-breakpoint
CREATE INDEX "hrm_payroll_adjustment_org_period_idx" ON "hrm_payroll_adjustment" USING btree ("organizationId","periodId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_adjustment_org_employee_idx" ON "hrm_payroll_adjustment" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_group_org_code_uidx" ON "hrm_payroll_group" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_payroll_group_org_active_idx" ON "hrm_payroll_group" USING btree ("organizationId","isActive","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_legal_entity_config_org_code_uidx" ON "hrm_payroll_legal_entity_config" USING btree ("organizationId","legalEntityCode");--> statement-breakpoint
CREATE INDEX "hrm_payroll_legal_entity_config_org_country_active_idx" ON "hrm_payroll_legal_entity_config" USING btree ("organizationId","countryCode","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_payment_org_batch_employee_uidx" ON "hrm_payroll_payment" USING btree ("organizationId","batchId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_org_batch_idx" ON "hrm_payroll_payment" USING btree ("organizationId","batchId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_org_status_idx" ON "hrm_payroll_payment" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_payment_batch_org_reference_uidx" ON "hrm_payroll_payment_batch" USING btree ("organizationId","reference");--> statement-breakpoint
CREATE INDEX "hrm_payroll_payment_batch_org_period_idx" ON "hrm_payroll_payment_batch" USING btree ("organizationId","periodId");