-- Migration 0020: hrm_compliance_evidence — acknowledgement provenance columns
-- Phase 3I: first-class temporal authority metadata for the bureau-confirmation
-- lifecycle. Until now, the only signal that a row was acknowledged was the
-- `submissionState = 'acknowledged'` enum + the IAM audit row written alongside
-- the transition. That is sufficient for compliance attestation but inadequate
-- for in-product chronology, regulator queries, or webhook joins.
--
-- Columns added:
--   - acknowledgedAt:        when the bureau receipt was recorded
--   - acknowledgedByUserId:  actor who recorded it (null for webhook / system)
--   - acknowledgementSource: 'manual' | 'webhook' | 'api' | 'import'
--
-- Backfill is intentional NO-OP. Pre-3I rows that already reached
-- `acknowledged` cannot have their original chronology recovered honestly.
-- Leaving the new columns NULL preserves audit truth: "we know it was
-- acknowledged, we do not know precisely when or by whom in the new schema."

ALTER TABLE "hrm_compliance_evidence"
  ADD COLUMN IF NOT EXISTS "acknowledgedAt"        timestamp,
  ADD COLUMN IF NOT EXISTS "acknowledgedByUserId"  text,
  ADD COLUMN IF NOT EXISTS "acknowledgementSource" text;
