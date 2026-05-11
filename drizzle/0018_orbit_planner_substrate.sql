-- Migration 0018: orbit_planner_substrate
-- Orbit operational execution substrate — signals, items, links, schedules,
-- sessions, reminders, recurrence, views, and ranking snapshots.

CREATE TABLE IF NOT EXISTS "planner_signal" (
  "id"                text      PRIMARY KEY,
  "organizationId"    text,
  "ownerUserId"       text,
  "title"             text      NOT NULL,
  "description"       text,
  "signalClass"       text      NOT NULL DEFAULT 'manual_capture',
  "lifecycle"         text      NOT NULL DEFAULT 'detected',
  "originatingSystem" text,
  "correlationKey"    text,
  "correlationGroup"  text,
  "urgency"           integer   NOT NULL DEFAULT 2,
  "impact"            integer   NOT NULL DEFAULT 2,
  "severity"          integer   NOT NULL DEFAULT 2,
  "confidence"        integer   NOT NULL DEFAULT 3,
  "effort"            integer   NOT NULL DEFAULT 2,
  "escalationLevel"   integer   NOT NULL DEFAULT 1,
  "temporalProximity" integer   NOT NULL DEFAULT 1,
  "ownershipPressure" integer   NOT NULL DEFAULT 1,
  "temporalPast"      jsonb,
  "temporalNow"       jsonb,
  "temporalNext"      jsonb,
  "audit7w1h"         jsonb,
  "detectedAt"        timestamp NOT NULL DEFAULT now(),
  "promotedAt"        timestamp,
  "expiresAt"         timestamp,
  "createdByUserId"   text,
  "updatedByUserId"   text,
  "createdAt"         timestamp NOT NULL DEFAULT now(),
  "updatedAt"         timestamp NOT NULL DEFAULT now(),
  "auditOrigin"       text      NOT NULL DEFAULT 'production'
);

CREATE TABLE IF NOT EXISTS "planner_item" (
  "id"                text      PRIMARY KEY,
  "organizationId"    text,
  "ownerUserId"       text,
  "sourceSignalId"    text      REFERENCES "planner_signal"("id") ON DELETE SET NULL,
  "title"             text      NOT NULL,
  "description"       text,
  "lifecycle"         text      NOT NULL DEFAULT 'triaged',
  "urgency"           integer   NOT NULL DEFAULT 2,
  "impact"            integer   NOT NULL DEFAULT 2,
  "severity"          integer   NOT NULL DEFAULT 2,
  "confidence"        integer   NOT NULL DEFAULT 3,
  "effort"            integer   NOT NULL DEFAULT 2,
  "escalationLevel"   integer   NOT NULL DEFAULT 1,
  "temporalProximity" integer   NOT NULL DEFAULT 1,
  "ownershipPressure" integer   NOT NULL DEFAULT 1,
  "scheduleStartAt"   timestamp,
  "dueAt"             timestamp,
  "endAt"             timestamp,
  "blockedAt"         timestamp,
  "verifiedAt"        timestamp,
  "resolvedAt"        timestamp,
  "cancelledAt"       timestamp,
  "deprecatedAt"      timestamp,
  "temporalPast"      jsonb,
  "temporalNow"       jsonb,
  "temporalNext"      jsonb,
  "audit7w1h"         jsonb,
  "createdByUserId"   text,
  "updatedByUserId"   text,
  "createdAt"         timestamp NOT NULL DEFAULT now(),
  "updatedAt"         timestamp NOT NULL DEFAULT now(),
  "auditOrigin"       text      NOT NULL DEFAULT 'production'
);

CREATE TABLE IF NOT EXISTS "planner_assignment" (
  "id"              text      PRIMARY KEY,
  "itemId"          text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "role"            text      NOT NULL,
  "subjectUserId"   text,
  "subjectLabel"    text,
  "createdByUserId" text,
  "createdAt"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_schedule" (
  "id"               text      PRIMARY KEY,
  "itemId"           text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "scheduledStartAt" timestamp,
  "scheduledEndAt"   timestamp,
  "snoozedUntil"     timestamp,
  "timeZone"         text,
  "createdAt"        timestamp NOT NULL DEFAULT now(),
  "updatedAt"        timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_relation" (
  "id"              text      PRIMARY KEY,
  "itemId"          text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "relatedItemId"   text      REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "relatedSignalId" text      REFERENCES "planner_signal"("id") ON DELETE CASCADE,
  "relationType"    text      NOT NULL,
  "createdAt"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_link" (
  "id"              text      PRIMARY KEY,
  "organizationId"  text,
  "ownerUserId"     text,
  "itemId"          text      REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "signalId"        text      REFERENCES "planner_signal"("id") ON DELETE CASCADE,
  "module"          text      NOT NULL,
  "entityType"      text      NOT NULL,
  "entityId"        text      NOT NULL,
  "displayLabel"    text      NOT NULL,
  "href"            text,
  "causalityReason" text,
  "temporalContext" jsonb,
  "auditContext"    jsonb,
  "createdAt"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_reminder" (
  "id"           text      PRIMARY KEY,
  "itemId"       text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "remindAt"     timestamp NOT NULL,
  "status"       text      NOT NULL DEFAULT 'pending',
  "snoozedUntil" timestamp,
  "deliveredAt"  timestamp,
  "createdAt"    timestamp NOT NULL DEFAULT now(),
  "updatedAt"    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_recurrence" (
  "id"         text      PRIMARY KEY,
  "itemId"     text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "rrule"      text      NOT NULL,
  "timeZone"   text,
  "nextRunAt"  timestamp,
  "lastRunAt"  timestamp,
  "pausedAt"   timestamp,
  "createdAt"  timestamp NOT NULL DEFAULT now(),
  "updatedAt"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_session" (
  "id"              text      PRIMARY KEY,
  "organizationId"  text,
  "ownerUserId"     text,
  "itemId"          text      REFERENCES "planner_item"("id") ON DELETE SET NULL,
  "status"          text      NOT NULL DEFAULT 'active',
  "summary"         text,
  "startedAt"       timestamp NOT NULL DEFAULT now(),
  "endedAt"         timestamp,
  "pausedAt"        timestamp,
  "durationMinutes" integer,
  "createdByUserId" text,
  "updatedByUserId" text,
  "createdAt"       timestamp NOT NULL DEFAULT now(),
  "updatedAt"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_activity" (
  "id"           text      PRIMARY KEY,
  "itemId"       text      REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "signalId"     text      REFERENCES "planner_signal"("id") ON DELETE CASCADE,
  "activityType" text      NOT NULL,
  "body"         text      NOT NULL,
  "metadata"     jsonb,
  "authorUserId" text,
  "createdAt"    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_comment" (
  "id"           text      PRIMARY KEY,
  "itemId"       text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "authorUserId" text      NOT NULL,
  "body"         text      NOT NULL,
  "createdAt"    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_attachment" (
  "id"            text      PRIMARY KEY,
  "itemId"        text      NOT NULL REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "url"           text      NOT NULL,
  "contentSha256" text      NOT NULL,
  "mimeType"      text      NOT NULL,
  "sizeBytes"     integer   NOT NULL,
  "createdAt"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_view" (
  "id"             text      PRIMARY KEY,
  "organizationId" text,
  "ownerUserId"    text,
  "slug"           text      NOT NULL,
  "name"           text      NOT NULL,
  "surface"        text      NOT NULL,
  "filterState"    jsonb,
  "sortMode"       text,
  "createdAt"      timestamp NOT NULL DEFAULT now(),
  "updatedAt"      timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_ranking_snapshot" (
  "id"              text      PRIMARY KEY,
  "itemId"          text      REFERENCES "planner_item"("id") ON DELETE CASCADE,
  "signalId"        text      REFERENCES "planner_signal"("id") ON DELETE CASCADE,
  "displayPriority" text      NOT NULL,
  "pressureScore"   integer   NOT NULL,
  "dimensions"      jsonb,
  "snapshotAt"      timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "planner_pressure_snapshot" (
  "id"             text      PRIMARY KEY,
  "organizationId" text,
  "ownerUserId"    text,
  "summary"        jsonb,
  "snapshotAt"     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "planner_signal_organization_lifecycle_idx"
  ON "planner_signal"("organizationId", "lifecycle");
CREATE INDEX "planner_signal_owner_lifecycle_idx"
  ON "planner_signal"("ownerUserId", "lifecycle");
CREATE INDEX "planner_signal_detected_at_idx"
  ON "planner_signal"("detectedAt");
CREATE INDEX "planner_signal_correlation_key_idx"
  ON "planner_signal"("correlationKey");

CREATE INDEX "planner_item_organization_lifecycle_idx"
  ON "planner_item"("organizationId", "lifecycle");
CREATE INDEX "planner_item_owner_lifecycle_idx"
  ON "planner_item"("ownerUserId", "lifecycle");
CREATE INDEX "planner_item_due_at_idx"
  ON "planner_item"("dueAt");
CREATE INDEX "planner_item_schedule_start_at_idx"
  ON "planner_item"("scheduleStartAt");
CREATE INDEX "planner_item_source_signal_id_idx"
  ON "planner_item"("sourceSignalId");

CREATE INDEX "planner_assignment_item_id_idx"
  ON "planner_assignment"("itemId");
CREATE INDEX "planner_assignment_role_subject_idx"
  ON "planner_assignment"("role", "subjectUserId");

CREATE INDEX "planner_schedule_item_id_idx"
  ON "planner_schedule"("itemId");
CREATE INDEX "planner_schedule_start_idx"
  ON "planner_schedule"("scheduledStartAt");

CREATE INDEX "planner_relation_item_id_idx"
  ON "planner_relation"("itemId");
CREATE INDEX "planner_relation_related_item_id_idx"
  ON "planner_relation"("relatedItemId");
CREATE INDEX "planner_relation_related_signal_id_idx"
  ON "planner_relation"("relatedSignalId");

CREATE INDEX "planner_link_organization_idx"
  ON "planner_link"("organizationId");
CREATE INDEX "planner_link_owner_idx"
  ON "planner_link"("ownerUserId");
CREATE INDEX "planner_link_item_id_idx"
  ON "planner_link"("itemId");
CREATE INDEX "planner_link_signal_id_idx"
  ON "planner_link"("signalId");
CREATE INDEX "planner_link_module_entity_idx"
  ON "planner_link"("module", "entityType", "entityId");

CREATE INDEX "planner_reminder_item_id_idx"
  ON "planner_reminder"("itemId");
CREATE INDEX "planner_reminder_status_remind_at_idx"
  ON "planner_reminder"("status", "remindAt");

CREATE INDEX "planner_recurrence_item_id_idx"
  ON "planner_recurrence"("itemId");
CREATE INDEX "planner_recurrence_next_run_at_idx"
  ON "planner_recurrence"("nextRunAt");

CREATE INDEX "planner_session_organization_status_idx"
  ON "planner_session"("organizationId", "status");
CREATE INDEX "planner_session_owner_status_idx"
  ON "planner_session"("ownerUserId", "status");
CREATE INDEX "planner_session_item_id_idx"
  ON "planner_session"("itemId");
CREATE INDEX "planner_session_started_at_idx"
  ON "planner_session"("startedAt");

CREATE INDEX "planner_activity_item_id_created_at_idx"
  ON "planner_activity"("itemId", "createdAt");
CREATE INDEX "planner_activity_signal_id_created_at_idx"
  ON "planner_activity"("signalId", "createdAt");

CREATE INDEX "planner_comment_item_id_created_at_idx"
  ON "planner_comment"("itemId", "createdAt");

CREATE INDEX "planner_attachment_item_id_idx"
  ON "planner_attachment"("itemId");

CREATE UNIQUE INDEX "planner_view_org_slug_uidx"
  ON "planner_view"("organizationId", "slug")
  WHERE "organizationId" IS NOT NULL;
CREATE UNIQUE INDEX "planner_view_owner_slug_uidx"
  ON "planner_view"("ownerUserId", "slug")
  WHERE "ownerUserId" IS NOT NULL;

CREATE INDEX "planner_ranking_snapshot_item_idx"
  ON "planner_ranking_snapshot"("itemId", "snapshotAt");
CREATE INDEX "planner_ranking_snapshot_signal_idx"
  ON "planner_ranking_snapshot"("signalId", "snapshotAt");

CREATE INDEX "planner_pressure_snapshot_organization_idx"
  ON "planner_pressure_snapshot"("organizationId", "snapshotAt");
CREATE INDEX "planner_pressure_snapshot_owner_idx"
  ON "planner_pressure_snapshot"("ownerUserId", "snapshotAt");
