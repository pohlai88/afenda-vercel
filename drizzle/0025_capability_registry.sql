-- Migration 0025: capability_registry
-- Capability Registry — layered policy for the Marketplace surface
-- (`/{locale}/marketplace`). Two new tables back the resolver pipeline that
-- replaces the previous `localStorage`-only utility-bar visibility:
--
--   org_capability_policy        → org governance (allowed | blocked | mandatory),
--                                  scoped per audience (all | admin | member).
--   user_capability_preference   → per-user visibility override (visible | hidden).
--
-- The catalog itself remains source-of-truth in code (today: NEXUS_UTILITY_CATALOG
-- adapted via `lib/features/marketplace/data/capability-catalog.shared.ts`); both
-- `capabilityId` columns are free-form `text` so the catalog can grow without
-- migrations. Application-layer Zod schemas validate against the live registry.
--
-- Org / user references are intentionally FK-less, matching the convention of
-- `iam_audit_event`, `rail_pinned_item`, and `org_event_endpoint`. Cross-schema
-- referential integrity to `neon_auth.*` lives at the application boundary.

CREATE TABLE IF NOT EXISTS "org_capability_policy" (
  "id"             text      PRIMARY KEY,
  "organizationId" text      NOT NULL,
  "capabilityId"   text      NOT NULL,
  "state"          text      NOT NULL,
  "audience"       text      NOT NULL DEFAULT 'all',
  "updatedBy"      text      NOT NULL,
  "createdAt"      timestamp NOT NULL DEFAULT now(),
  "updatedAt"      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_capability_policy_org_capability_audience_uidx"
  ON "org_capability_policy"
  ("organizationId", "capabilityId", "audience");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_capability_policy_org_idx"
  ON "org_capability_policy"
  ("organizationId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_capability_preference" (
  "id"             text      PRIMARY KEY,
  "organizationId" text      NOT NULL,
  "userId"         text      NOT NULL,
  "capabilityId"   text      NOT NULL,
  "state"          text      NOT NULL,
  "displayOrder"   integer   NOT NULL DEFAULT 0,
  "createdAt"      timestamp NOT NULL DEFAULT now(),
  "updatedAt"      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_capability_preference_org_user_capability_uidx"
  ON "user_capability_preference"
  ("organizationId", "userId", "capabilityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_capability_preference_org_user_idx"
  ON "user_capability_preference"
  ("organizationId", "userId");
