CREATE TABLE "hrm_interview_scorecard" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"interviewId" text NOT NULL,
	"applicationId" text NOT NULL,
	"interviewerUserId" text NOT NULL,
	"competencyRatings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overallRating" integer,
	"recommendation" text NOT NULL,
	"comments" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_job_posting" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requisitionId" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"externalReference" text,
	"publishedAt" timestamp,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_pre_employment_check" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"checkType" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"providerReference" text,
	"result" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_recruitment_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"assessmentType" text NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"score" numeric(9, 2),
	"result" text,
	"providerReference" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_recruitment_communication" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text,
	"candidateId" text,
	"communicationType" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"recipient" text,
	"status" text DEFAULT 'recorded' NOT NULL,
	"providerReference" text,
	"sentAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_screening_question" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requisitionId" text NOT NULL,
	"prompt" text NOT NULL,
	"questionType" text DEFAULT 'text' NOT NULL,
	"isKnockout" boolean DEFAULT false NOT NULL,
	"expectedAnswer" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_screening_response" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"applicationId" text NOT NULL,
	"questionId" text NOT NULL,
	"answer" text,
	"passed" boolean,
	"evaluatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_application" ADD COLUMN "screeningOutcome" text;--> statement-breakpoint
ALTER TABLE "hrm_application" ADD COLUMN "screeningSnapshot" jsonb;--> statement-breakpoint
ALTER TABLE "hrm_candidate" ADD COLUMN "parsedResume" jsonb;--> statement-breakpoint
ALTER TABLE "hrm_candidate" ADD COLUMN "parsedResumeAt" timestamp;--> statement-breakpoint
ALTER TABLE "hrm_job_offer" ADD COLUMN "currentApprovalId" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "requisitionType" text DEFAULT 'new_headcount' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "legalEntityId" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "jobGradeId" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "workLocationCode" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "employmentType" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "hiringManagerUserId" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "budgetReference" text;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "approvalState" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD COLUMN "currentApprovalId" text;--> statement-breakpoint
ALTER TABLE "hrm_interview_scorecard" ADD CONSTRAINT "hrm_interview_scorecard_interviewId_hrm_interview_id_fk" FOREIGN KEY ("interviewId") REFERENCES "public"."hrm_interview"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_interview_scorecard" ADD CONSTRAINT "hrm_interview_scorecard_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_posting" ADD CONSTRAINT "hrm_job_posting_requisitionId_hrm_job_requisition_id_fk" FOREIGN KEY ("requisitionId") REFERENCES "public"."hrm_job_requisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_pre_employment_check" ADD CONSTRAINT "hrm_pre_employment_check_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_assessment" ADD CONSTRAINT "hrm_recruitment_assessment_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_communication" ADD CONSTRAINT "hrm_recruitment_communication_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_recruitment_communication" ADD CONSTRAINT "hrm_recruitment_communication_candidateId_hrm_candidate_id_fk" FOREIGN KEY ("candidateId") REFERENCES "public"."hrm_candidate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_question" ADD CONSTRAINT "hrm_screening_question_requisitionId_hrm_job_requisition_id_fk" FOREIGN KEY ("requisitionId") REFERENCES "public"."hrm_job_requisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_response" ADD CONSTRAINT "hrm_screening_response_applicationId_hrm_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."hrm_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_screening_response" ADD CONSTRAINT "hrm_screening_response_questionId_hrm_screening_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."hrm_screening_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_interview_scorecard_org_interview_user_uidx" ON "hrm_interview_scorecard" USING btree ("organizationId","interviewId","interviewerUserId");--> statement-breakpoint
CREATE INDEX "hrm_interview_scorecard_org_application_idx" ON "hrm_interview_scorecard" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_job_posting_org_requisition_idx" ON "hrm_job_posting" USING btree ("organizationId","requisitionId");--> statement-breakpoint
CREATE INDEX "hrm_job_posting_org_channel_status_idx" ON "hrm_job_posting" USING btree ("organizationId","channel","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_pre_employment_check_org_app_type_uidx" ON "hrm_pre_employment_check" USING btree ("organizationId","applicationId","checkType");--> statement-breakpoint
CREATE INDEX "hrm_pre_employment_check_org_status_idx" ON "hrm_pre_employment_check" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_assessment_org_application_idx" ON "hrm_recruitment_assessment" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_assessment_org_status_idx" ON "hrm_recruitment_assessment" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_comm_org_application_idx" ON "hrm_recruitment_communication" USING btree ("organizationId","applicationId");--> statement-breakpoint
CREATE INDEX "hrm_recruitment_comm_org_type_idx" ON "hrm_recruitment_communication" USING btree ("organizationId","communicationType");--> statement-breakpoint
CREATE INDEX "hrm_screening_question_org_requisition_idx" ON "hrm_screening_question" USING btree ("organizationId","requisitionId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_screening_response_org_app_question_uidx" ON "hrm_screening_response" USING btree ("organizationId","applicationId","questionId");--> statement-breakpoint
CREATE INDEX "hrm_screening_response_org_application_idx" ON "hrm_screening_response" USING btree ("organizationId","applicationId");--> statement-breakpoint
ALTER TABLE "hrm_job_offer" ADD CONSTRAINT "hrm_job_offer_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_jobGradeId_hrm_job_grade_id_fk" FOREIGN KEY ("jobGradeId") REFERENCES "public"."hrm_job_grade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_job_requisition" ADD CONSTRAINT "hrm_job_requisition_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_approval_idx" ON "hrm_job_requisition" USING btree ("organizationId","approvalState");--> statement-breakpoint
CREATE INDEX "hrm_job_requisition_org_manager_idx" ON "hrm_job_requisition" USING btree ("organizationId","hiringManagerUserId");