CREATE TABLE "organization_portal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"slug" text NOT NULL,
	"audience" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"displayName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_slug_uidx" ON "organization_portal" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_org_audience_active_uidx" ON "organization_portal" USING btree ("organizationId","audience") WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX "organization_portal_org_idx" ON "organization_portal" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "organization_portal_org_audience_status_idx" ON "organization_portal" USING btree ("organizationId","audience","status");--> statement-breakpoint
CREATE TABLE "organization_portal_access" (
	"id" text PRIMARY KEY NOT NULL,
	"portalId" text NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"audience" text NOT NULL,
	"subjectId" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "organization_portal_access" ADD CONSTRAINT "organization_portal_access_portalId_organization_portal_id_fk" FOREIGN KEY ("portalId") REFERENCES "public"."organization_portal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_access_portal_user_audience_uidx" ON "organization_portal_access" USING btree ("portalId","userId","audience");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_portal_access_portal_audience_subject_active_uidx" ON "organization_portal_access" USING btree ("portalId","audience","subjectId") WHERE "status" = 'active' AND "subjectId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "organization_portal_access_org_user_status_idx" ON "organization_portal_access" USING btree ("organizationId","userId","status");--> statement-breakpoint
CREATE INDEX "organization_portal_access_portal_user_status_idx" ON "organization_portal_access" USING btree ("portalId","userId","status");--> statement-breakpoint
CREATE INDEX "organization_portal_access_portal_subject_idx" ON "organization_portal_access" USING btree ("portalId","subjectId");
