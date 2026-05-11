-- Phase 3B: Global rule-pack registry table.
-- The actual rule code lives in TypeScript (append-only); this table is a
-- discoverability index for which composite packs exist and their sub-versions.

CREATE TABLE "hrm_country_rule_pack" (
  "id"                text PRIMARY KEY NOT NULL,
  "countryCode"       text NOT NULL,
  "version"           text NOT NULL,
  "effectiveFrom"     text NOT NULL,
  "effectiveTo"       text,
  "manifest"          jsonb NOT NULL,
  "publishedByUserId" text,
  "publishedAt"       timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "hrm_country_rule_pack_country_version_uidx"
  ON "hrm_country_rule_pack" ("countryCode", "version");

CREATE INDEX "hrm_country_rule_pack_country_effective_from_idx"
  ON "hrm_country_rule_pack" ("countryCode", "effectiveFrom");

-- Seed MY-2026-01 as the baseline pack so the registry is never empty on deploy.
INSERT INTO "hrm_country_rule_pack"
  ("id", "countryCode", "version", "effectiveFrom", "effectiveTo", "manifest", "publishedAt")
VALUES (
  gen_random_uuid()::text,
  'MY',
  'MY-2026-01',
  '2026-01-01',
  NULL,
  '{"epfVersion":"MY-EPF-2025-10","socsoVersion":"MY-SOCSO-2024-10","eisVersion":"MY-EIS-2024-10","pcbVersion":"MY-PCB-2026-01","hrdfVersion":"MY-HRDF-2024-01","holidayVersion":"MY-HOLIDAY-2026","eaLeaveVersion":"MY-EA-2023-01"}',
  now()
);
