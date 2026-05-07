CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_organization_id_idx" ON "knowledge_chunk" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_hnsw" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);