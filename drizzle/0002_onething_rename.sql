ALTER TABLE "todo_list" RENAME TO "onething_list";
--> statement-breakpoint
ALTER TABLE "todo" RENAME TO "onething";
--> statement-breakpoint
ALTER TABLE "todo_attachment" RENAME TO "onething_attachment";
--> statement-breakpoint
ALTER TABLE "todo_comment" RENAME TO "onething_comment";
--> statement-breakpoint

ALTER TABLE "onething" RENAME CONSTRAINT "todo_listId_todo_list_id_fk" TO "onething_listId_onething_list_id_fk";
--> statement-breakpoint
ALTER TABLE "onething_attachment" RENAME CONSTRAINT "todo_attachment_todoId_todo_id_fk" TO "onething_attachment_oneThingId_onething_id_fk";
--> statement-breakpoint
ALTER TABLE "onething_comment" RENAME CONSTRAINT "todo_comment_todoId_todo_id_fk" TO "onething_comment_oneThingId_onething_id_fk";
--> statement-breakpoint

ALTER TABLE "onething" RENAME COLUMN "description" TO "consequence";
--> statement-breakpoint
ALTER TABLE "onething" RENAME COLUMN "priority" TO "severity";
--> statement-breakpoint
ALTER TABLE "onething" RENAME COLUMN "parentTodoId" TO "parentOneThingId";
--> statement-breakpoint
ALTER TABLE "onething_attachment" RENAME COLUMN "todoId" TO "oneThingId";
--> statement-breakpoint
ALTER TABLE "onething_comment" RENAME COLUMN "todoId" TO "oneThingId";
--> statement-breakpoint

ALTER TABLE "onething" ALTER COLUMN "state" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "onething" ALTER COLUMN "severity" DROP DEFAULT;
--> statement-breakpoint
UPDATE "onething"
SET "state" = COALESCE(
  NULLIF("oneThingState", ''),
  CASE "state"
    WHEN 'pending' THEN CASE WHEN "assigneeUserId" IS NULL THEN 'detected' ELSE 'owned' END
    WHEN 'in_progress' THEN 'resolving'
    WHEN 'completed' THEN 'resolved'
    WHEN 'cancelled' THEN 'deprecated'
    WHEN 'snoozed' THEN 'blocked'
    ELSE 'detected'
  END
);
--> statement-breakpoint
UPDATE "onething"
SET "severity" = CASE "severity"
  WHEN 'urgent' THEN 'critical'
  WHEN 'high' THEN 'high'
  WHEN 'normal' THEN 'medium'
  WHEN 'low' THEN 'low'
  ELSE 'medium'
END;
--> statement-breakpoint
DROP INDEX IF EXISTS "todo_organization_id_one_thing_state_idx";
--> statement-breakpoint
ALTER TABLE "onething" DROP COLUMN "oneThingState";
--> statement-breakpoint
ALTER TABLE "onething" ALTER COLUMN "state" SET DEFAULT 'detected';
--> statement-breakpoint
ALTER TABLE "onething" ALTER COLUMN "severity" SET DEFAULT 'medium';
--> statement-breakpoint

ALTER INDEX "todo_organization_id_state_idx" RENAME TO "onething_organization_id_state_idx";
--> statement-breakpoint
ALTER INDEX "todo_owner_user_id_state_idx" RENAME TO "onething_owner_user_id_state_idx";
--> statement-breakpoint
ALTER INDEX "todo_assignee_user_id_state_idx" RENAME TO "onething_assignee_user_id_state_idx";
--> statement-breakpoint
ALTER INDEX "todo_due_at_idx" RENAME TO "onething_due_at_idx";
--> statement-breakpoint
ALTER INDEX "todo_list_id_idx" RENAME TO "onething_list_id_idx";
--> statement-breakpoint
ALTER INDEX "todo_snooze_until_idx" RENAME TO "onething_snooze_until_idx";
--> statement-breakpoint
ALTER INDEX "todo_attachment_todo_id_idx" RENAME TO "onething_attachment_onething_id_idx";
--> statement-breakpoint
ALTER INDEX "todo_comment_todo_id_created_at_idx" RENAME TO "onething_comment_onething_id_created_at_idx";
--> statement-breakpoint
ALTER INDEX "todo_list_organization_id_idx" RENAME TO "onething_list_organization_id_idx";
--> statement-breakpoint
ALTER INDEX "todo_list_owner_user_id_idx" RENAME TO "onething_list_owner_user_id_idx";
--> statement-breakpoint
ALTER INDEX "todo_list_org_slug_uidx" RENAME TO "onething_list_org_slug_uidx";
--> statement-breakpoint
ALTER INDEX "todo_list_owner_slug_uidx" RENAME TO "onething_list_owner_slug_uidx";
