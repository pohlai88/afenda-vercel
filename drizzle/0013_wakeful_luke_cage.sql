CREATE TABLE "org_push_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_push_subscription_endpoint_uidx" ON "org_push_subscription" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "org_push_subscription_org_user_idx" ON "org_push_subscription" USING btree ("organizationId","userId");