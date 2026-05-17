CREATE TABLE "hrm_lifecycle_transition" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"transitionKind" text NOT NULL,
	"fromStatus" text,
	"toStatus" text,
	"effectiveDate" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"approvalReference" text,
	"lifecycleEventId" text,
	"iamAuditEventId" text,
	"actorUserId" text,
	"actorSessionId" text,
	"appliedAt" timestamp,
	"cancelledAt" timestamp,
	"rejectedAt" timestamp,
	"failureReason" text,
	"auditOrigin" text DEFAULT 'production' NOT NULL,
	"simulationRunId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_lifecycle_transition" ADD CONSTRAINT "hrm_lifecycle_transition_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_lifecycle_transition" ADD CONSTRAINT "hrm_lifecycle_transition_lifecycleEventId_hrm_lifecycle_event_id_fk" FOREIGN KEY ("lifecycleEventId") REFERENCES "public"."hrm_lifecycle_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_status_effective_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","status","effectiveDate");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_employee_status_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_lifecycle_transition_org_kind_status_idx" ON "hrm_lifecycle_transition" USING btree ("organizationId","transitionKind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_lifecycle_transition_org_emp_kind_eff_status_uidx" ON "hrm_lifecycle_transition" USING btree ("organizationId","employeeId","transitionKind","effectiveDate","status");