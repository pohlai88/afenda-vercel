CREATE TABLE "hrm_training_prerequisite" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"courseId" text NOT NULL,
	"prerequisiteCourseId" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_training_prerequisite" ADD CONSTRAINT "hrm_training_prerequisite_courseId_hrm_training_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_training_prerequisite" ADD CONSTRAINT "hrm_training_prerequisite_prerequisiteCourseId_hrm_training_course_id_fk" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "public"."hrm_training_course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_training_prerequisite_org_course_prereq_uidx" ON "hrm_training_prerequisite" USING btree ("organizationId","courseId","prerequisiteCourseId");--> statement-breakpoint
CREATE INDEX "hrm_training_prerequisite_org_course_idx" ON "hrm_training_prerequisite" USING btree ("organizationId","courseId");