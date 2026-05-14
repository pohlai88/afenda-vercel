-- Register Vietnam VN-2024-01 composite rule pack (TS implementation lives under
-- lib/features/hrm/data/rule-packs/vietnam/).

INSERT INTO "hrm_country_rule_pack"
  ("id", "countryCode", "version", "effectiveFrom", "effectiveTo", "manifest", "publishedAt")
VALUES (
  gen_random_uuid()::text,
  'VN',
  'VN-2024-01',
  '2024-01-01',
  NULL,
  '{"epfVersion":"VN-BHXH-2024-01","socsoVersion":"VN-BHYT-BHTN-2024-01","eisVersion":"VN-N-A","pcbVersion":"VN-PIT-2024-01","hrdfVersion":null,"holidayVersion":"VN-HOLIDAY-2024-PLACEHOLDER","eaLeaveVersion":"VN-AL-2024-01"}',
  now()
)
ON CONFLICT ("countryCode", "version") DO NOTHING;
