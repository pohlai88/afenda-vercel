CREATE TABLE "hrm_career_discussion" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"planId" text,
	"discussionDate" date NOT NULL,
	"participants" text,
	"notes" text,
	"agreedActions" text,
	"nextReviewDate" date,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_career_path_framework" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pathKind" text DEFAULT 'vertical' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"jobFamilyRef" text,
	"departmentRef" text,
	"audit7w1h" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_career_path_framework_path_kind_chk" CHECK ("hrm_career_path_framework"."pathKind" IN ('vertical', 'lateral', 'specialist', 'leadership', 'functional', 'cross_functional')),
	CONSTRAINT "hrm_career_path_framework_status_chk" CHECK ("hrm_career_path_framework"."status" IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hrm_career_path_stage" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"frameworkId" text NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"targetGradeRef" text,
	"targetPositionRef" text,
	"expectedMonths" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_development_coach_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"coachEmployeeId" text NOT NULL,
	"objective" text,
	"status" text DEFAULT 'active' NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_development_goal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"title" text NOT NULL,
	"goalType" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"priority" text,
	"ownerUserId" text,
	"targetDate" date,
	"completionCriteria" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_goal_type_chk" CHECK ("hrm_development_goal"."goalType" IN ('skill', 'competency', 'certification', 'leadership', 'project', 'mentoring', 'coaching')),
	CONSTRAINT "hrm_development_goal_status_chk" CHECK ("hrm_development_goal"."status" IN ('not_started', 'in_progress', 'completed', 'overdue', 'blocked', 'cancelled', 'deferred'))
);
--> statement-breakpoint
CREATE TABLE "hrm_development_learning_action" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"goalId" text NOT NULL,
	"trainingCourseId" text,
	"externalRef" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'recommended' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_learning_action_status_chk" CHECK ("hrm_development_learning_action"."status" IN ('recommended', 'assigned', 'in_progress', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hrm_development_mentor_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"mentorEmployeeId" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_development_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"goalId" text NOT NULL,
	"title" text NOT NULL,
	"targetDate" date,
	"status" text DEFAULT 'not_started' NOT NULL,
	"ownerUserId" text,
	"completionCriteria" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_milestone_status_chk" CHECK ("hrm_development_milestone"."status" IN ('not_started', 'in_progress', 'completed', 'overdue', 'blocked', 'cancelled', 'deferred'))
);
--> statement-breakpoint
CREATE TABLE "hrm_development_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"targetRoleId" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"startDate" date,
	"targetDate" date,
	"managerReviewNote" text,
	"audit7w1h" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_plan_status_chk" CHECK ("hrm_development_plan"."status" IN ('draft', 'active', 'completed', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hrm_development_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"sessionKind" text NOT NULL,
	"sessionDate" date NOT NULL,
	"notes" text,
	"actions" text,
	"outcome" text,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_session_kind_chk" CHECK ("hrm_development_session"."sessionKind" IN ('mentor', 'coach'))
);
--> statement-breakpoint
CREATE TABLE "hrm_development_stretch_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"title" text NOT NULL,
	"assignmentKind" text DEFAULT 'project' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"startDate" date,
	"endDate" date,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_development_stretch_kind_chk" CHECK ("hrm_development_stretch_assignment"."assignmentKind" IN ('project', 'acting_role', 'leadership_exposure', 'cross_functional')),
	CONSTRAINT "hrm_development_stretch_status_chk" CHECK ("hrm_development_stretch_assignment"."status" IN ('planned', 'active', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_career_aspiration" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"preferredRoleTitle" text,
	"preferredDepartmentRef" text,
	"preferredLocationRef" text,
	"mobilityPreference" text,
	"notes" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_readiness_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"targetRoleId" text,
	"readinessLevel" text DEFAULT 'developing' NOT NULL,
	"progressPercent" integer DEFAULT 0 NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_employee_readiness_level_chk" CHECK ("hrm_employee_readiness_snapshot"."readinessLevel" IN ('not_ready', 'developing', 'near_ready', 'ready', 'role_ready')),
	CONSTRAINT "hrm_employee_readiness_progress_chk" CHECK ("hrm_employee_readiness_snapshot"."progressPercent" >= 0 AND "hrm_employee_readiness_snapshot"."progressPercent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "hrm_employee_target_role" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"frameworkId" text,
	"targetRoleTitle" text NOT NULL,
	"jobFamilyRef" text,
	"gradeRef" text,
	"positionRef" text,
	"departmentRef" text,
	"source" text DEFAULT 'employee' NOT NULL,
	"isPrimary" boolean DEFAULT true NOT NULL,
	"recommendedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_employee_target_role_source_chk" CHECK ("hrm_employee_target_role"."source" IN ('employee', 'manager', 'hr'))
);
--> statement-breakpoint
ALTER TABLE "hrm_career_discussion" ADD CONSTRAINT "hrm_career_discussion_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_career_discussion" ADD CONSTRAINT "hrm_career_discussion_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_career_path_stage" ADD CONSTRAINT "hrm_career_path_stage_frameworkId_hrm_career_path_framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."hrm_career_path_framework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_coach_assignment" ADD CONSTRAINT "hrm_development_coach_assignment_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_coach_assignment" ADD CONSTRAINT "hrm_development_coach_assignment_coachEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("coachEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_goal" ADD CONSTRAINT "hrm_development_goal_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_learning_action" ADD CONSTRAINT "hrm_development_learning_action_goalId_hrm_development_goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."hrm_development_goal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_learning_action" ADD CONSTRAINT "hrm_development_learning_action_trainingCourseId_hrm_training_course_id_fk" FOREIGN KEY ("trainingCourseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_mentor_assignment" ADD CONSTRAINT "hrm_development_mentor_assignment_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_mentor_assignment" ADD CONSTRAINT "hrm_development_mentor_assignment_mentorEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("mentorEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_milestone" ADD CONSTRAINT "hrm_development_milestone_goalId_hrm_development_goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."hrm_development_goal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_plan" ADD CONSTRAINT "hrm_development_plan_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_plan" ADD CONSTRAINT "hrm_development_plan_targetRoleId_hrm_employee_target_role_id_fk" FOREIGN KEY ("targetRoleId") REFERENCES "public"."hrm_employee_target_role"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_session" ADD CONSTRAINT "hrm_development_session_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_development_stretch_assignment" ADD CONSTRAINT "hrm_development_stretch_assignment_planId_hrm_development_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_development_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_career_aspiration" ADD CONSTRAINT "hrm_employee_career_aspiration_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_readiness_snapshot" ADD CONSTRAINT "hrm_employee_readiness_snapshot_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_readiness_snapshot" ADD CONSTRAINT "hrm_employee_readiness_snapshot_targetRoleId_hrm_employee_target_role_id_fk" FOREIGN KEY ("targetRoleId") REFERENCES "public"."hrm_employee_target_role"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_target_role" ADD CONSTRAINT "hrm_employee_target_role_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_employee_target_role" ADD CONSTRAINT "hrm_employee_target_role_frameworkId_hrm_career_path_framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."hrm_career_path_framework"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_career_discussion_org_emp_date_idx" ON "hrm_career_discussion" USING btree ("organizationId","employeeId","discussionDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_career_path_framework_org_code_uidx" ON "hrm_career_path_framework" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_career_path_framework_org_status_idx" ON "hrm_career_path_framework" USING btree ("organizationId","status","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_career_path_stage_framework_seq_uidx" ON "hrm_career_path_stage" USING btree ("frameworkId","sequence");--> statement-breakpoint
CREATE INDEX "hrm_career_path_stage_org_framework_idx" ON "hrm_career_path_stage" USING btree ("organizationId","frameworkId","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_development_coach_plan_coach_uidx" ON "hrm_development_coach_assignment" USING btree ("planId","coachEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_development_goal_plan_status_idx" ON "hrm_development_goal" USING btree ("planId","status");--> statement-breakpoint
CREATE INDEX "hrm_development_learning_action_goal_idx" ON "hrm_development_learning_action" USING btree ("goalId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_development_mentor_plan_mentor_uidx" ON "hrm_development_mentor_assignment" USING btree ("planId","mentorEmployeeId");--> statement-breakpoint
CREATE INDEX "hrm_development_milestone_goal_status_idx" ON "hrm_development_milestone" USING btree ("goalId","status");--> statement-breakpoint
CREATE INDEX "hrm_development_plan_org_emp_status_idx" ON "hrm_development_plan" USING btree ("organizationId","employeeId","status");--> statement-breakpoint
CREATE INDEX "hrm_development_session_plan_date_idx" ON "hrm_development_session" USING btree ("planId","sessionDate");--> statement-breakpoint
CREATE INDEX "hrm_development_stretch_plan_idx" ON "hrm_development_stretch_assignment" USING btree ("planId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_career_aspiration_org_emp_uidx" ON "hrm_employee_career_aspiration" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_employee_readiness_org_emp_idx" ON "hrm_employee_readiness_snapshot" USING btree ("organizationId","employeeId","computedAt");--> statement-breakpoint
CREATE INDEX "hrm_employee_target_role_org_emp_idx" ON "hrm_employee_target_role" USING btree ("organizationId","employeeId","isPrimary");