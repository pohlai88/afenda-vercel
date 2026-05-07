CREATE TABLE "import_job" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"adapter" text NOT NULL,
	"state" text NOT NULL,
	"totalRows" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"inputDigest" text NOT NULL,
	"createdByUserId" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "import_job_failure" (
	"id" text PRIMARY KEY NOT NULL,
	"jobId" text NOT NULL,
	"rowId" text,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"field" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job_row" (
	"id" text PRIMARY KEY NOT NULL,
	"jobId" text NOT NULL,
	"rowIndex" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"state" text NOT NULL,
	"resourceType" text,
	"resourceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_rowId_import_job_row_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."import_job_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_row" ADD CONSTRAINT "import_job_row_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_job_organization_id_createdAt_idx" ON "import_job" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_state_idx" ON "import_job" USING btree ("state");--> statement-breakpoint
CREATE INDEX "import_job_failure_jobId_createdAt_idx" ON "import_job_failure" USING btree ("jobId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_rowIndex_idx" ON "import_job_row" USING btree ("jobId","rowIndex");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_state_idx" ON "import_job_row" USING btree ("jobId","state");