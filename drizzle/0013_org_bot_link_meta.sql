ALTER TABLE "org_bot_link" ADD COLUMN "displayName" text;
--> statement-breakpoint
ALTER TABLE "org_bot_link" ADD COLUMN "lastTestedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "org_bot_link" ADD COLUMN "lastTestStatus" text;
--> statement-breakpoint
ALTER TABLE "org_bot_link" ADD COLUMN "lastTestError" text;
