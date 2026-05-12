-- Migration 0021: hrm_compliance_evidence — bureau-supplied authority payload hash
-- Phase 3J: stores the canonical SHA-256 of the bureau's webhook body so that
-- disputes can replay the exact bytes the bureau signed without re-fetching
-- from the bureau (which most Malaysian bureaus do not retain past their
-- operational window).
--
-- Why a separate column from `outputHash`:
--   - `outputHash` is OUR-side fingerprint of the canonical pack we generated
--     and sent OUTBOUND.
--   - `authorityPayloadHash` is THEIR-side fingerprint of the canonical
--     acknowledgement body we received INBOUND.
--   - Conflating them would lose the chain-of-custody distinction during
--     regulator inspection.
--
-- NULL for:
--   - manual acknowledgement (no bureau payload exists)
--   - future API-poll acknowledgement (until the API contract emits a
--     hashable response body)
--   - pre-3J acknowledged rows (cannot be backfilled honestly)

ALTER TABLE "hrm_compliance_evidence"
  ADD COLUMN IF NOT EXISTS "authorityPayloadHash" text;
