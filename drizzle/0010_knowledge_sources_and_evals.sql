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
CREATE TABLE "knowledge_eval_case" (
	"id" text PRIMARY KEY NOT NULL,
	"evalSetId" text NOT NULL,
	"question" text NOT NULL,
	"expectedEvidenceIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expectedAnswerSubstring" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_org_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"encryptedPayload" text NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD COLUMN "documentId" text;
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD COLUMN "chunkIndex" integer;
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD COLUMN "tokenCount" integer;
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD COLUMN "embeddingModelVersion" text;
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('english', "title" || ' ' || "body")) STORED;
--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_sourceId_knowledge_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."knowledge_source"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_eval_case" ADD CONSTRAINT "knowledge_eval_case_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_documentId_knowledge_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."knowledge_document"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_createdAt_idx" ON "knowledge_source" USING btree ("organizationId","createdAt");
--> statement-breakpoint
CREATE INDEX "knowledge_source_organization_id_enabled_idx" ON "knowledge_source" USING btree ("organizationId","enabled");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_document_source_external_uidx" ON "knowledge_document" USING btree ("sourceId","externalId");
--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_source_id_idx" ON "knowledge_document" USING btree ("organizationId","sourceId");
--> statement-breakpoint
CREATE INDEX "knowledge_document_organization_id_updatedAt_idx" ON "knowledge_document" USING btree ("organizationId","updatedAt");
--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_document_idx" ON "knowledge_chunk" USING btree ("organizationId","documentId");
--> statement-breakpoint
CREATE INDEX "knowledge_chunk_search_vector_gin" ON "knowledge_chunk" USING gin ("searchVector");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_setting_organization_uidx" ON "knowledge_org_setting" USING btree ("organizationId");
--> statement-breakpoint
CREATE INDEX "knowledge_eval_set_organization_id_createdAt_idx" ON "knowledge_eval_set" USING btree ("organizationId","createdAt");
--> statement-breakpoint
CREATE INDEX "knowledge_eval_case_eval_set_id_createdAt_idx" ON "knowledge_eval_case" USING btree ("evalSetId","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_org_credential_org_provider_uidx" ON "knowledge_org_credential" USING btree ("organizationId","provider");
--> statement-breakpoint
CREATE INDEX "org_bot_link_organization_id_platform_idx" ON "org_bot_link" USING btree ("organizationId","platform");
