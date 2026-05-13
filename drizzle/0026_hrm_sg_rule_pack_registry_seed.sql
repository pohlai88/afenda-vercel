-- Phase 5: Register Singapore SG-2026-01 composite rule pack (TS implementation
-- lives under lib/features/hrm/data/rule-packs/singapore/).

INSERT INTO "hrm_country_rule_pack"
  ("id", "countryCode", "version", "effectiveFrom", "effectiveTo", "manifest", "publishedAt")
VALUES (
  gen_random_uuid()::text,
  'SG',
  'SG-2026-01',
  '2026-01-01',
  NULL,
  '{"epfVersion":"SG-CPF-2026-01","socsoVersion":"SG-N-A","eisVersion":"SG-N-A","pcbVersion":"SG-IRAS-NO-MONTHLY-WITHHOLDING-2026-01","hrdfVersion":"SG-SDL-2026-01","holidayVersion":"SG-HOLIDAY-2026","eaLeaveVersion":"SG-EMPLOYMENT-2026-01"}',
  now()
);
