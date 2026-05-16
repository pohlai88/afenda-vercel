CREATE TABLE "hrm_employee_skill" (
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"skillId" text NOT NULL,
	"proficiency" integer NOT NULL,
	"validityFrom" date NOT NULL,
	"validityTo" date,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_employee_skill_employeeId_skillId_pk" PRIMARY KEY("employeeId","skillId"),
	CONSTRAINT "hrm_employee_skill_proficiency_range" CHECK ("hrm_employee_skill"."proficiency" >= 1 AND "hrm_employee_skill"."proficiency" <= 5)
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_advance_installment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"advanceId" text NOT NULL,
	"sequence" integer NOT NULL,
	"dueAfterPeriodEndIso" date NOT NULL,
	"plannedAmount" numeric(15, 2) NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"deductedByPayrollLineId" text,
	"deductedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"partyId" text,
	"type" text NOT NULL,
	"actorType" text NOT NULL,
	"actorUserId" text,
	"actorEmail" text,
	"actorName" text,
	"userAgent" text,
	"ipAddress" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dataHash" text NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_party" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"signerOrder" integer NOT NULL,
	"signerEmployeeId" text,
	"signerEmail" text NOT NULL,
	"signerName" text NOT NULL,
	"role" text DEFAULT 'signer' NOT NULL,
	"token" text NOT NULL,
	"readStatus" text DEFAULT 'not_opened' NOT NULL,
	"sendStatus" text DEFAULT 'not_sent' NOT NULL,
	"signingStatus" text DEFAULT 'not_signed' NOT NULL,
	"expiresAt" timestamp,
	"sentAt" timestamp,
	"firstOpenedAt" timestamp,
	"signedAt" timestamp,
	"lastReminderSentAt" timestamp,
	"nextReminderAt" timestamp,
	"rejectionReason" text,
	"signedProofEventId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_request" (
	"id" text PRIMARY KEY NOT NULL,
	"publicSlug" text NOT NULL,
	"organizationId" text NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"signingOrder" text DEFAULT 'parallel' NOT NULL,
	"documentId" text NOT NULL,
	"signedEnvelopeDocumentId" text,
	"derivedStatus" text DEFAULT 'draft' NOT NULL,
	"mode" text DEFAULT 'in_app' NOT NULL,
	"providerEndpointId" text,
	"externalReference" text,
	"declarationTextHash" text NOT NULL,
	"expirationPeriodDays" integer,
	"sentAt" timestamp,
	"lastEventAt" timestamp,
	"voidedAt" timestamp,
	"voidReason" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_skill" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"categoryId" text,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_skill_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_training_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"sessionId" text,
	"employeeId" text NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"dueAt" timestamp,
	"required" boolean DEFAULT true NOT NULL,
	"state" text DEFAULT 'assigned' NOT NULL,
	"attendance" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"sourceKind" text DEFAULT 'manual' NOT NULL,
	"sourceReference" text,
	"createdByUserId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_assignment_state_chk" CHECK ("hrm_training_assignment"."state" IN ('assigned', 'completed', 'waived', 'cancelled', 'overdue')),
	CONSTRAINT "hrm_training_assignment_attendance_chk" CHECK ("hrm_training_assignment"."attendance" IS NULL OR "hrm_training_assignment"."attendance" IN ('present', 'absent', 'excused')),
	CONSTRAINT "hrm_training_assignment_priority_chk" CHECK ("hrm_training_assignment"."priority" IN ('low', 'normal', 'high', 'statutory')),
	CONSTRAINT "hrm_training_assignment_source_kind_chk" CHECK ("hrm_training_assignment"."sourceKind" IN ('manual', 'onboarding', 'recertification', 'compliance_cycle', 'session_roster'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"archivedAt" timestamp,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_training_course" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"categoryId" text,
	"deliveryMode" text DEFAULT 'classroom' NOT NULL,
	"defaultDurationHours" numeric(9, 2),
	"defaultCreditUnits" numeric(9, 2),
	"statutoryFlag" boolean DEFAULT false NOT NULL,
	"statutoryAuthorityCode" text,
	"recertificationIntervalMonths" integer,
	"defaultRequired" boolean DEFAULT true NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"grantsSkillId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_course_delivery_mode_chk" CHECK ("hrm_training_course"."deliveryMode" IN ('classroom', 'online', 'external', 'self_paced', 'virtual')),
	CONSTRAINT "hrm_training_course_state_chk" CHECK ("hrm_training_course"."state" IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"action" text NOT NULL,
	"recordId" text,
	"assignmentId" text,
	"sessionId" text,
	"employeeId" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"actorUserId" text,
	CONSTRAINT "hrm_training_event_action_chk" CHECK ("hrm_training_event"."action" IN ('assigned', 'completed', 'verified', 'waived', 'expired', 'reassigned', 'cancelled', 'session_closed'))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_record" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"assignmentId" text,
	"sessionId" text,
	"courseId" text NOT NULL,
	"employeeId" text NOT NULL,
	"completedAt" date NOT NULL,
	"expiresAt" date,
	"instructor" text,
	"hoursCompleted" numeric(9, 2),
	"creditUnits" numeric(9, 2),
	"costAmount" numeric(15, 2),
	"costCurrency" text DEFAULT 'MYR' NOT NULL,
	"certificateDocumentId" text,
	"verificationState" text DEFAULT 'self_attested' NOT NULL,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"feedbackRating" integer,
	"feedbackText" text,
	"notes" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_record_verification_state_chk" CHECK ("hrm_training_record"."verificationState" IN ('self_attested', 'hr_verified', 'external_verified')),
	CONSTRAINT "hrm_training_record_feedback_rating_chk" CHECK ("hrm_training_record"."feedbackRating" IS NULL OR ("hrm_training_record"."feedbackRating" >= 1 AND "hrm_training_record"."feedbackRating" <= 5))
);
--> statement-breakpoint
CREATE TABLE "hrm_training_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"scheduledStartAt" timestamp NOT NULL,
	"scheduledEndAt" timestamp NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"meetingUrl" text,
	"trainerName" text,
	"trainerEmail" text,
	"vendorOrgId" text,
	"capacity" integer,
	"state" text DEFAULT 'scheduled' NOT NULL,
	"closedAt" timestamp,
	"closedByUserId" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	CONSTRAINT "hrm_training_session_end_after_start_chk" CHECK ("scheduledEndAt" > "scheduledStartAt"),
	CONSTRAINT "hrm_training_session_state_chk" CHECK ("hrm_training_session"."state" IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD COLUMN "salaryAdvanceInstallmentId" text;--> statement-breakpoint
ALTER TABLE "hrm_salary_advance" ADD COLUMN "installmentCount" integer;--> statement-breakpoint
ALTER TABLE "hrm_salary_advance" ADD COLUMN "firstPeriodEndIso" date;--> statement-breakpoint
ALTER TABLE "hrm_employee_skill" ADD CONSTRAINT "hrm_employee_skill_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_skill" ADD CONSTRAINT "hrm_employee_skill_skillId_hrm_skill_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."hrm_skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_salary_advance_installment" ADD CONSTRAINT "hrm_salary_advance_installment_advanceId_hrm_salary_advance_id_fk" FOREIGN KEY ("advanceId") REFERENCES "public"."hrm_salary_advance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_event" ADD CONSTRAINT "hrm_signature_event_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_signerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("signerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_signedEnvelopeDocumentId_hrm_document_id_fk" FOREIGN KEY ("signedEnvelopeDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_providerEndpointId_org_event_endpoint_id_fk" FOREIGN KEY ("providerEndpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_skill" ADD CONSTRAINT "hrm_skill_categoryId_hrm_skill_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."hrm_skill_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_assignment" ADD CONSTRAINT "hrm_training_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_course" ADD CONSTRAINT "hrm_training_course_categoryId_hrm_training_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."hrm_training_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_recordId_hrm_training_record_id_fk" FOREIGN KEY ("recordId") REFERENCES "public"."hrm_training_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_assignmentId_hrm_training_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_training_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_event" ADD CONSTRAINT "hrm_training_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_assignmentId_hrm_training_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_training_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_sessionId_hrm_training_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."hrm_training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_record" ADD CONSTRAINT "hrm_training_record_certificateDocumentId_hrm_document_id_fk" FOREIGN KEY ("certificateDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_session" ADD CONSTRAINT "hrm_training_session_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_employee_skill_org_employee_idx" ON "hrm_employee_skill" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_skill_org_skill_idx" ON "hrm_employee_skill" USING btree ("organizationId","skillId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_salary_advance_installment_advance_seq_uidx" ON "hrm_salary_advance_installment" USING btree ("advanceId","sequence");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_installment_org_state_idx" ON "hrm_salary_advance_installment" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_installment_org_advance_due_idx" ON "hrm_salary_advance_installment" USING btree ("organizationId","advanceId","dueAfterPeriodEndIso");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_request_occurred_idx" ON "hrm_signature_event" USING btree ("requestId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_org_occurred_idx" ON "hrm_signature_event" USING btree ("organizationId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_type_idx" ON "hrm_signature_event" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_token_uidx" ON "hrm_signature_party" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_signer_order_uidx" ON "hrm_signature_party" USING btree ("requestId","signerOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_employee_uidx" ON "hrm_signature_party" USING btree ("requestId","signerEmployeeId") WHERE "signerEmployeeId" is not null;--> statement-breakpoint
CREATE INDEX "hrm_signature_party_next_reminder_idx" ON "hrm_signature_party" USING btree ("nextReminderAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_expires_at_idx" ON "hrm_signature_party" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_request_signing_status_idx" ON "hrm_signature_party" USING btree ("requestId","signingStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_public_slug_uidx" ON "hrm_signature_request" USING btree ("publicSlug");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_derived_status_idx" ON "hrm_signature_request" USING btree ("organizationId","derivedStatus");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_kind_subject_idx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_org_kind_subject_open_uidx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId") WHERE "derivedStatus" in ('draft', 'sent', 'partially_signed');--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_skill_org_code_uidx" ON "hrm_skill" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_skill_org_archived_idx" ON "hrm_skill" USING btree ("organizationId","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_skill_category_org_code_uidx" ON "hrm_skill_category" USING btree ("organizationId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_assignment_org_course_emp_assigned_uidx" ON "hrm_training_assignment" USING btree ("organizationId","courseId","employeeId","assignedAt");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_employee_state_idx" ON "hrm_training_assignment" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_course_state_idx" ON "hrm_training_assignment" USING btree ("organizationId","courseId","state");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_session_idx" ON "hrm_training_assignment" USING btree ("organizationId","sessionId");--> statement-breakpoint
CREATE INDEX "hrm_training_assignment_org_due_assigned_idx" ON "hrm_training_assignment" USING btree ("organizationId","dueAt") WHERE "state" = 'assigned';--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_category_org_code_uidx" ON "hrm_training_category" USING btree ("organizationId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_course_org_code_uidx" ON "hrm_training_course" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_training_course_org_statutory_idx" ON "hrm_training_course" USING btree ("organizationId","statutoryFlag","statutoryAuthorityCode");--> statement-breakpoint
CREATE INDEX "hrm_training_event_org_employee_occurred_idx" ON "hrm_training_event" USING btree ("organizationId","employeeId","occurredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_event_daily_idempotency_uidx" ON "hrm_training_event" USING btree ("organizationId","employeeId","assignmentId","action",date_trunc('day', "occurredAt")) WHERE "assignmentId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hrm_training_record_org_employee_completed_idx" ON "hrm_training_record" USING btree ("organizationId","employeeId","completedAt");--> statement-breakpoint
CREATE INDEX "hrm_training_record_org_expires_idx" ON "hrm_training_record" USING btree ("organizationId","expiresAt") WHERE "expiresAt" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_session_org_code_uidx" ON "hrm_training_session" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_training_session_org_course_start_idx" ON "hrm_training_session" USING btree ("organizationId","courseId","scheduledStartAt");--> statement-breakpoint
CREATE INDEX "hrm_training_session_org_open_state_idx" ON "hrm_training_session" USING btree ("organizationId","state") WHERE "state" IN ('scheduled', 'in_progress');--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_salaryAdvanceInstallmentId_hrm_salary_advance_installment_id_fk" FOREIGN KEY ("salaryAdvanceInstallmentId") REFERENCES "public"."hrm_salary_advance_installment"("id") ON DELETE set null ON UPDATE no action;