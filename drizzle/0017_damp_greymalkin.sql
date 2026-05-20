CREATE TABLE "hrm_shift_roster_report_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_roster_report_def_org_name_uidx" ON "hrm_shift_roster_report_definition" USING btree ("organizationId","name");--> statement-breakpoint
CREATE INDEX "hrm_shift_roster_report_def_org_idx" ON "hrm_shift_roster_report_definition" USING btree ("organizationId");