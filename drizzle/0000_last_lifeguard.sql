CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" text PRIMARY KEY NOT NULL,
	"listId" text NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"assigneeUserId" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"dueAt" timestamp,
	"snoozeUntil" timestamp,
	"recurrenceRule" text,
	"parentTodoId" text,
	"position" integer DEFAULT 0 NOT NULL,
	"linkage" jsonb,
	"counterparty" jsonb,
	"provenance" jsonb,
	"impact" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"actorUserId" text,
	"actorSessionId" text,
	"organizationId" text,
	"resourceType" text,
	"resourceId" text,
	"path" text,
	"ipAddress" text,
	"userAgent" text,
	"metadata" text
);
--> statement-breakpoint
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
CREATE TABLE "knowledge_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"documentId" text,
	"chunkIndex" integer,
	"tokenCount" integer,
	"embeddingModelVersion" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"sourceId" text NOT NULL,
	"externalId" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"inputDigest" text NOT NULL,
	"tokenCount" integer DEFAULT 0 NOT NULL,
	"embeddingModelVersion" text,
	"lastEmbeddedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_case" (
	"id" text PRIMARY KEY NOT NULL,
	"evalSetId" text NOT NULL,
	"question" text NOT NULL,
	"expectedEvidenceIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expectedAnswerSubstring" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"evalSetId" text NOT NULL,
	"topK" integer NOT NULL,
	"retrievalMode" text NOT NULL,
	"totalCases" integer DEFAULT 0 NOT NULL,
	"recallAtK" numeric(5, 4) NOT NULL,
	"meanReciprocalRank" numeric(5, 4) NOT NULL,
	"evidenceOverlap" numeric(5, 4) NOT NULL,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"createdByUserId" text,
	"judgeModel" text,
	"judgeScore" numeric(5, 4),
	"judgeMetadata" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_eval_set" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_org_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"cipherText" text NOT NULL,
	"cipherIv" text NOT NULL,
	"cipherTag" text NOT NULL,
	"keyVersion" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastRotatedAt" timestamp,
	"lastUsedAt" timestamp,
	"metadata" jsonb,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_org_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"retrievalHybridEnabled" boolean DEFAULT false NOT NULL,
	"retrievalRerankEnabled" boolean DEFAULT false NOT NULL,
	"enforceZdr" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_source" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lynx_demo_unicorn" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"company" text NOT NULL,
	"valuation" numeric(10, 2) NOT NULL,
	"dateJoined" date,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"industry" text NOT NULL,
	"selectInvestors" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_bot_link" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"platform" text NOT NULL,
	"externalWorkspaceId" text,
	"externalRepository" text,
	"externalInstallationId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"displayName" text,
	"lastTestedAt" timestamp,
	"lastTestStatus" text,
	"lastTestError" text
);
--> statement-breakpoint
CREATE TABLE "org_event_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"endpointId" text NOT NULL,
	"eventType" text NOT NULL,
	"payloadHash" text NOT NULL,
	"signatureVersion" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"httpStatus" integer,
	"errorMessage" text,
	"durationMs" integer,
	"nextAttemptAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "org_event_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"signingKeyEncoded" text NOT NULL,
	"events" jsonb NOT NULL,
	"signatureVersion" text DEFAULT 'v1' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"todoId" text NOT NULL,
	"url" text NOT NULL,
	"contentSha256" text NOT NULL,
	"mimeType" text NOT NULL,
	"sizeBytes" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"todoId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_list" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"ownerUserId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"archivedAt" timestamp,
	"shareTokenHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_listId_todo_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."todo_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_failure" ADD CONSTRAINT "import_job_failure_rowId_import_job_row_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."import_job_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_row" ADD CONSTRAINT "import_job_row_jobId_import_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_documentId_knowledge_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."knowledge_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_sourceId_knowledge_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."knowledge_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_eval_case" ADD CONSTRAINT "knowledge_eval_case_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_eval_run" ADD CONSTRAINT "knowledge_eval_run_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_event_delivery" ADD CONSTRAINT "org_event_delivery_endpointId_org_event_endpoint_id_fk" FOREIGN KEY ("endpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_attachment" ADD CONSTRAINT "todo_attachment_todoId_todo_id_fk" FOREIGN KEY ("todoId") REFERENCES "public"."todo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_comment" ADD CONSTRAINT "todo_comment_todoId_todo_id_fk" FOREIGN KEY ("todoId") REFERENCES "public"."todo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_organization_id_idx" ON "customers" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "todo_organization_id_state_idx" ON "todo" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "todo_owner_user_id_state_idx" ON "todo" USING btree ("ownerUserId","state");--> statement-breakpoint
CREATE INDEX "todo_assignee_user_id_state_idx" ON "todo" USING btree ("assigneeUserId","state");--> statement-breakpoint
CREATE INDEX "todo_due_at_idx" ON "todo" USING btree ("dueAt");--> statement-breakpoint
CREATE INDEX "todo_list_id_idx" ON "todo" USING btree ("listId");--> statement-breakpoint
CREATE INDEX "todo_snooze_until_idx" ON "todo" USING btree ("snoozeUntil");--> statement-breakpoint
CREATE INDEX "iam_audit_event_organizationId_createdAt_idx" ON "iam_audit_event" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_actorUserId_createdAt_idx" ON "iam_audit_event" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_action_createdAt_idx" ON "iam_audit_event" USING btree ("action","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_organization_id_createdAt_idx" ON "import_job" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_state_idx" ON "import_job" USING btree ("state");--> statement-breakpoint
CREATE INDEX "import_job_failure_jobId_createdAt_idx" ON "import_job_failure" USING btree ("jobId","createdAt");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_rowIndex_idx" ON "import_job_row" USING btree ("jobId","rowIndex");--> statement-breakpoint
CREATE INDEX "import_job_row_jobId_state_idx" ON "import_job_row" USING btree ("jobId","state");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_id_idx" ON "knowledge_chunk" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_document_idx" ON "knowledge_chunk" USING btree ("organizationId","documentId");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_hnsw" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_document_source_external_uidx" ON "knowledge_document" USING btree ("sourceId","externalId");--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_source_id_idx" ON "knowledge_document" USING btree ("organizationId","sourceId");--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_updatedAt_idx" ON "knowledge_document" USING btree ("organizationId","updatedAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_case_eval_set_id_created_at_idx" ON "knowledge_eval_case" USING btree ("evalSetId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_run_organization_eval_set_createdAt_idx" ON "knowledge_eval_run" USING btree ("organizationId","evalSetId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_eval_set_organization_id_createdAt_idx" ON "knowledge_eval_set" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_credential_org_provider_uidx" ON "knowledge_org_credential" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_setting_organization_uidx" ON "knowledge_org_setting" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_createdAt_idx" ON "knowledge_source" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_enabled_idx" ON "knowledge_source" USING btree ("organizationId","enabled");--> statement-breakpoint
CREATE INDEX "lynx_demo_unicorn_organization_id_idx" ON "lynx_demo_unicorn" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "lynx_demo_unicorn_org_company_uidx" ON "lynx_demo_unicorn" USING btree ("organizationId","company");--> statement-breakpoint
CREATE INDEX "org_bot_link_organization_id_platform_idx" ON "org_bot_link" USING btree ("organizationId","platform");--> statement-breakpoint
CREATE INDEX "org_event_delivery_endpointId_createdAt_idx" ON "org_event_delivery" USING btree ("endpointId","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_delivery_state_createdAt_idx" ON "org_event_delivery" USING btree ("state","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_endpoint_organization_id_idx" ON "org_event_endpoint" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "todo_attachment_todo_id_idx" ON "todo_attachment" USING btree ("todoId");--> statement-breakpoint
CREATE INDEX "todo_comment_todo_id_created_at_idx" ON "todo_comment" USING btree ("todoId","createdAt");--> statement-breakpoint
CREATE INDEX "todo_list_organization_id_idx" ON "todo_list" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "todo_list_owner_user_id_idx" ON "todo_list" USING btree ("ownerUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "todo_list_org_slug_uidx" ON "todo_list" USING btree ("organizationId","slug") WHERE "todo_list"."organizationId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "todo_list_owner_slug_uidx" ON "todo_list" USING btree ("ownerUserId","slug") WHERE "todo_list"."ownerUserId" IS NOT NULL;