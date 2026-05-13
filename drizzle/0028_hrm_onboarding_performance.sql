ALTER TABLE "hrm_employment_contract" ADD COLUMN IF NOT EXISTS "onboardingChecklist" jsonb;
--> statement-breakpoint
CREATE TABLE "hrm_review_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_review" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"employeeId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"rating" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD CONSTRAINT "hrm_review_cycleId_hrm_review_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_review_cycle"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD CONSTRAINT "hrm_review_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_review_cycleId_employeeId_uidx" ON "hrm_review" USING btree ("cycleId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_review_organizationId_cycleId_idx" ON "hrm_review" USING btree ("organizationId","cycleId");
--> statement-breakpoint
CREATE INDEX "hrm_review_cycle_organizationId_idx" ON "hrm_review_cycle" USING btree ("organizationId");
