-- Org + personal task lists and items (foundation harness module).

CREATE TABLE IF NOT EXISTS "todo_list" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text,
  "ownerUserId" text,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "archivedAt" timestamp,
  "shareTokenHash" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "todo_list_scope_check" CHECK (
    ("organizationId" IS NOT NULL AND "ownerUserId" IS NULL)
    OR ("organizationId" IS NULL AND "ownerUserId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "todo_list_org_slug_uidx"
  ON "todo_list" ("organizationId", "slug")
  WHERE "organizationId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "todo_list_owner_slug_uidx"
  ON "todo_list" ("ownerUserId", "slug")
  WHERE "ownerUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "todo_list_organization_id_idx" ON "todo_list" ("organizationId");
CREATE INDEX IF NOT EXISTS "todo_list_owner_user_id_idx" ON "todo_list" ("ownerUserId");

CREATE TABLE IF NOT EXISTS "todo" (
  "id" text PRIMARY KEY NOT NULL,
  "listId" text NOT NULL REFERENCES "todo_list"("id") ON DELETE CASCADE,
  "organizationId" text,
  "ownerUserId" text,
  "assigneeUserId" text,
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "state" text NOT NULL DEFAULT 'pending',
  "priority" text NOT NULL DEFAULT 'normal',
  "dueAt" timestamp,
  "snoozeUntil" timestamp,
  "recurrenceRule" text,
  "parentTodoId" text REFERENCES "todo"("id") ON DELETE SET NULL,
  "position" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "todo_scope_check" CHECK (
    ("organizationId" IS NOT NULL AND "ownerUserId" IS NULL)
    OR ("organizationId" IS NULL AND "ownerUserId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "todo_organization_id_state_idx" ON "todo" ("organizationId", "state");
CREATE INDEX IF NOT EXISTS "todo_owner_user_id_state_idx" ON "todo" ("ownerUserId", "state");
CREATE INDEX IF NOT EXISTS "todo_assignee_user_id_state_idx" ON "todo" ("assigneeUserId", "state");
CREATE INDEX IF NOT EXISTS "todo_due_at_idx" ON "todo" ("dueAt");
CREATE INDEX IF NOT EXISTS "todo_list_id_idx" ON "todo" ("listId");
CREATE INDEX IF NOT EXISTS "todo_snooze_until_idx" ON "todo" ("snoozeUntil");

CREATE TABLE IF NOT EXISTS "todo_attachment" (
  "id" text PRIMARY KEY NOT NULL,
  "todoId" text NOT NULL REFERENCES "todo"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "contentSha256" text NOT NULL,
  "mimeType" text NOT NULL,
  "sizeBytes" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "todo_attachment_todo_id_idx" ON "todo_attachment" ("todoId");

CREATE TABLE IF NOT EXISTS "todo_comment" (
  "id" text PRIMARY KEY NOT NULL,
  "todoId" text NOT NULL REFERENCES "todo"("id") ON DELETE CASCADE,
  "authorUserId" text NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "todo_comment_todo_id_created_at_idx" ON "todo_comment" ("todoId", "createdAt");
