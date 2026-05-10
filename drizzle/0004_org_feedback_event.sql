-- Custom SQL migration file, put your code below! --
CREATE TABLE "org_feedback_event" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"organizationId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"message" text NOT NULL,
	"path" text,
	"userAgent" text,
	"metadata" text
);
--> statement-breakpoint
CREATE INDEX "org_feedback_event_organizationId_createdAt_idx" ON "org_feedback_event" USING btree ("organizationId","createdAt");
--> statement-breakpoint
CREATE INDEX "org_feedback_event_actorUserId_createdAt_idx" ON "org_feedback_event" USING btree ("actorUserId","createdAt");
