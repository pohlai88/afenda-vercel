CREATE TABLE "hrm_shift_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"attendanceDate" date NOT NULL,
	"kind" text DEFAULT 'unavailable' NOT NULL,
	"reason" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_availability_kind_chk" CHECK ("hrm_shift_availability"."kind" IN ('unavailable', 'preferred'))
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_schedule_change_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requesterEmployeeId" text NOT NULL,
	"assignmentId" text NOT NULL,
	"proposedTemplateId" text NOT NULL,
	"proposedDate" date NOT NULL,
	"reason" text NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"managerNote" text,
	"rejectedReason" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_schedule_change_state_chk" CHECK ("hrm_shift_schedule_change_request"."state" IN ('submitted', 'approved', 'rejected', 'returned', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "hrm_shift_coverage_requirement" ADD COLUMN "requiredPositionId" text;--> statement-breakpoint
ALTER TABLE "hrm_shift_coverage_requirement" ADD COLUMN "requiredTrainingCourseId" text;--> statement-breakpoint
ALTER TABLE "hrm_shift_availability" ADD CONSTRAINT "hrm_shift_availability_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_schedule_change_request" ADD CONSTRAINT "hrm_shift_schedule_change_request_requesterEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("requesterEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_schedule_change_request" ADD CONSTRAINT "hrm_shift_schedule_change_request_assignmentId_hrm_shift_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_shift_assignment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_schedule_change_request" ADD CONSTRAINT "hrm_shift_schedule_change_request_proposedTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("proposedTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_shift_availability_org_employee_date_idx" ON "hrm_shift_availability" USING btree ("organizationId","employeeId","attendanceDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_availability_org_emp_date_kind_uq" ON "hrm_shift_availability" USING btree ("organizationId","employeeId","attendanceDate","kind");--> statement-breakpoint
CREATE INDEX "hrm_shift_schedule_change_org_state_idx" ON "hrm_shift_schedule_change_request" USING btree ("organizationId","state");--> statement-breakpoint
ALTER TABLE "hrm_shift_coverage_requirement" ADD CONSTRAINT "hrm_shift_coverage_requirement_requiredPositionId_hrm_position_id_fk" FOREIGN KEY ("requiredPositionId") REFERENCES "public"."hrm_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_coverage_requirement" ADD CONSTRAINT "hrm_shift_coverage_requirement_requiredTrainingCourseId_hrm_training_course_id_fk" FOREIGN KEY ("requiredTrainingCourseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE set null ON UPDATE no action;