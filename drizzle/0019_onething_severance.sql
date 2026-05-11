-- Hard severance: drop legacy OneThing / iThink runtime tables.
--
-- The Orbit (`planner_*`) substrate from migration `0018_orbit_planner_substrate`
-- is the only operational execution surface. Historical `iam_audit_event` rows
-- referencing `erp.onething.*` / `erp.ithink.*` remain readable through the
-- shared trailing-verb audit grammar; no runtime path generates new ones.
--
-- Pre-flight expectation: legacy data has been archived externally (pg_dump or
-- equivalent) before this migration is applied to production.

DROP TABLE IF EXISTS "onething_comment" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "onething_attachment" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "onething" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "onething_list" CASCADE;
