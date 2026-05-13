-- Phase 5: Register Indonesia ID-2026-01 composite rule pack (TS
-- implementation lives under lib/features/hrm/data/rule-packs/indonesia/).

INSERT INTO "hrm_country_rule_pack"
  ("id", "countryCode", "version", "effectiveFrom", "effectiveTo", "manifest", "publishedAt")
VALUES (
  gen_random_uuid()::text,
  'ID',
  'ID-2026-01',
  '2026-01-01',
  NULL,
  '{"epfVersion":"ID-JHT-2026-01","socsoVersion":"ID-BPJS-2026-01","eisVersion":"ID-N-A","pcbVersion":"ID-PPH21-DEFERRED-2026-01","hrdfVersion":null,"holidayVersion":"ID-HOLIDAY-2026","eaLeaveVersion":"ID-EMPLOYMENT-2026-01"}',
  now()
);
