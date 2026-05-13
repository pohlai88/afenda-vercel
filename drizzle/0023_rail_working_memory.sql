-- Migration 0023: rail_working_memory
-- Working Memory Rail (Phase 3a) — per-user, per-workbench operator memory.
-- Three tables back the four new rail slots declared in
-- `components/workbench/left-nav-rail/workbench-rail.schema.ts`:
--
--   rail_pinned_item   → operator-pinned records (`pinned[]`)
--   rail_saved_view    → operator-saved filtered URLs (`views[]`)
--   rail_recent_item   → activity-derived recents (`recents[]`)
--
-- The `inbox` slot is a *derived* pressure summary composed from each
-- workbench's own queries (e.g. pending invitations + audit failures for
-- org admin, leave approvals + payroll locks for HRM); it does not need
-- its own table.
--
-- Org / user references are intentionally FK-less. This repo's convention
-- (see `iam_audit_event`, `planner_signal`, `import_job`) keeps cross-schema
-- referential integrity at the application layer because `neon_auth.*` is
-- managed by Neon Auth and does not contractually expose CASCADE semantics
-- to Drizzle migrations. Org-delete fan-out, when needed, lives in the
-- `rail-memory` server module (Phase 3b).

CREATE TABLE IF NOT EXISTS "rail_pinned_item" (
  "id"             text      PRIMARY KEY,
  "organizationId" text      NOT NULL,
  "userId"         text      NOT NULL,
  "workbenchId"    text      NOT NULL,
  "resourceType"   text      NOT NULL,
  "resourceId"     text      NOT NULL,
  "label"          text      NOT NULL,
  "href"           text      NOT NULL,
  "icon"           text,
  "rank"           integer   NOT NULL DEFAULT 0,
  "createdAt"      timestamp NOT NULL DEFAULT now(),
  "updatedAt"      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rail_pinned_item_user_resource_uidx"
  ON "rail_pinned_item"
  ("organizationId", "userId", "workbenchId", "resourceType", "resourceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rail_pinned_item_lookup_idx"
  ON "rail_pinned_item"
  ("organizationId", "userId", "workbenchId", "rank");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rail_saved_view" (
  "id"             text      PRIMARY KEY,
  "organizationId" text      NOT NULL,
  "userId"         text      NOT NULL,
  "workbenchId"    text      NOT NULL,
  "label"          text      NOT NULL,
  "href"           text      NOT NULL,
  "icon"           text,
  "rank"           integer   NOT NULL DEFAULT 0,
  "createdAt"      timestamp NOT NULL DEFAULT now(),
  "updatedAt"      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rail_saved_view_lookup_idx"
  ON "rail_saved_view"
  ("organizationId", "userId", "workbenchId", "rank");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rail_recent_item" (
  "id"             text      PRIMARY KEY,
  "organizationId" text      NOT NULL,
  "userId"         text      NOT NULL,
  "workbenchId"    text      NOT NULL,
  "resourceType"   text      NOT NULL,
  "resourceId"     text,
  "label"          text      NOT NULL,
  "href"           text      NOT NULL,
  "icon"           text,
  "occurredAt"    timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rail_recent_item_lookup_idx"
  ON "rail_recent_item"
  ("organizationId", "userId", "workbenchId", "occurredAt");
--> statement-breakpoint
-- App-side policy: list-pinned queries surface ≤ 8 entries; list-views ≤ 8;
-- list-recents ≤ 5. A nightly cron (added in Phase 3b) prunes recents beyond
-- 25 per (org, user, workbench) so DB growth stays linear in operator count.
