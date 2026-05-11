CREATE TABLE "org_notification_notice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"createdByUserId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"linkedEntityType" text,
	"linkedEntityId" text,
	"linkedEntityLabel" text,
	"linkedPath" text,
	"publishedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"closedAt" timestamp,
	"closedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_notification_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"noticeId" text NOT NULL,
	"userId" text NOT NULL,
	"readAt" timestamp,
	"acknowledgedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_notification_receipt" ADD CONSTRAINT "org_notification_receipt_noticeId_org_notification_notice_id_fk" FOREIGN KEY ("noticeId") REFERENCES "public"."org_notification_notice"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "org_notification_notice_organization_publishedAt_idx" ON "org_notification_notice" USING btree ("organizationId","publishedAt");
--> statement-breakpoint
CREATE INDEX "org_notification_notice_organization_closedAt_idx" ON "org_notification_notice" USING btree ("organizationId","closedAt");
--> statement-breakpoint
CREATE INDEX "org_notification_notice_linkedEntity_idx" ON "org_notification_notice" USING btree ("organizationId","linkedEntityType","linkedEntityId");
--> statement-breakpoint
CREATE UNIQUE INDEX "org_notification_receipt_notice_user_uidx" ON "org_notification_receipt" USING btree ("noticeId","userId");
--> statement-breakpoint
CREATE INDEX "org_notification_receipt_user_createdAt_idx" ON "org_notification_receipt" USING btree ("userId","createdAt");
