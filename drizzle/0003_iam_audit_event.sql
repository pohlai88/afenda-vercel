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
ALTER TABLE "iam_audit_event" ADD CONSTRAINT "iam_audit_event_actorUserId_user_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD CONSTRAINT "iam_audit_event_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "iam_audit_event_organizationId_createdAt_idx" ON "iam_audit_event" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_actorUserId_createdAt_idx" ON "iam_audit_event" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "iam_audit_event_action_createdAt_idx" ON "iam_audit_event" USING btree ("action","createdAt");