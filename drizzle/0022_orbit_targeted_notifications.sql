ALTER TABLE "org_notification_notice"
  ADD COLUMN IF NOT EXISTS "targetUserId" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_notification_notice_targetUser_publishedAt_idx"
  ON "org_notification_notice" ("organizationId", "targetUserId", "publishedAt");
