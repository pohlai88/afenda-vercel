CREATE TABLE "org_coordination_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"contextId" text NOT NULL,
	"organizationId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"kind" text DEFAULT 'comment' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_coordination_context" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"subject" text,
	"linkedEntityType" text,
	"linkedEntityId" text,
	"linkedEntityLabel" text,
	"linkedEntityPath" text,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_coordination_operator" (
	"id" text PRIMARY KEY NOT NULL,
	"contextId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastReadAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "org_coordination_activity" ADD CONSTRAINT "org_coordination_activity_contextId_org_coordination_context_id_fk" FOREIGN KEY ("contextId") REFERENCES "public"."org_coordination_context"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_coordination_operator" ADD CONSTRAINT "org_coordination_operator_contextId_org_coordination_context_id_fk" FOREIGN KEY ("contextId") REFERENCES "public"."org_coordination_context"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_coordination_activity_contextId_createdAt_idx" ON "org_coordination_activity" USING btree ("contextId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_activity_organizationId_createdAt_idx" ON "org_coordination_activity" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_organization_lastActivityAt_idx" ON "org_coordination_context" USING btree ("organizationId","lastActivityAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_createdByUserId_createdAt_idx" ON "org_coordination_context" USING btree ("createdByUserId","createdAt");--> statement-breakpoint
CREATE INDEX "org_coordination_context_linkedEntity_idx" ON "org_coordination_context" USING btree ("organizationId","linkedEntityType","linkedEntityId");--> statement-breakpoint
CREATE UNIQUE INDEX "org_coordination_operator_context_user_uidx" ON "org_coordination_operator" USING btree ("contextId","userId");--> statement-breakpoint
CREATE INDEX "org_coordination_operator_user_joinedAt_idx" ON "org_coordination_operator" USING btree ("userId","joinedAt");