CREATE TABLE "hrm_benefit_claim_reference" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"enrollmentId" text NOT NULL,
	"providerId" text,
	"externalClaimId" text NOT NULL,
	"claimStatus" text DEFAULT 'submitted' NOT NULL,
	"claimedAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"paymentReference" text,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_enrollment_dependent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"enrollmentId" text NOT NULL,
	"employeeId" text NOT NULL,
	"dependentId" text NOT NULL,
	"effectiveFrom" timestamp NOT NULL,
	"effectiveTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_open_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"startsOn" timestamp NOT NULL,
	"endsOn" timestamp NOT NULL,
	"planIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_benefit_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"countryCodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"externalReference" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_benefit_claim_reference" ADD CONSTRAINT "hrm_benefit_claim_reference_enrollmentId_hrm_benefit_enrollment_id_fk" FOREIGN KEY ("enrollmentId") REFERENCES "public"."hrm_benefit_enrollment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_claim_reference" ADD CONSTRAINT "hrm_benefit_claim_reference_providerId_hrm_benefit_provider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."hrm_benefit_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_enrollmentId_hrm_benefit_enrollment_id_fk" FOREIGN KEY ("enrollmentId") REFERENCES "public"."hrm_benefit_enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment_dependent" ADD CONSTRAINT "hrm_benefit_enrollment_dependent_dependentId_hrm_dependent_id_fk" FOREIGN KEY ("dependentId") REFERENCES "public"."hrm_dependent"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_claim_reference_org_external_uidx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","externalClaimId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_claim_reference_org_enrollment_idx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","enrollmentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_claim_reference_org_status_idx" ON "hrm_benefit_claim_reference" USING btree ("organizationId","claimStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_enrollment_dependent_org_enrollment_dep_uidx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","enrollmentId","dependentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_dependent_org_employee_idx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_dependent_org_dependent_idx" ON "hrm_benefit_enrollment_dependent" USING btree ("organizationId","dependentId");--> statement-breakpoint
CREATE INDEX "hrm_benefit_open_enrollment_org_active_idx" ON "hrm_benefit_open_enrollment" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_benefit_open_enrollment_org_period_idx" ON "hrm_benefit_open_enrollment" USING btree ("organizationId","startsOn","endsOn");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_provider_org_code_uidx" ON "hrm_benefit_provider" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_benefit_provider_org_active_idx" ON "hrm_benefit_provider" USING btree ("organizationId","isActive");