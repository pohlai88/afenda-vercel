-- Operational atom — extend `todo` rows with four optional JSONB spokes
-- (linkage, counter-party, provenance, impact). Existing rows keep working
-- because every column is nullable; the application treats NULL as the
-- absence of the spoke and the atom-canvas UI degrades gracefully.
--
-- Indexable subkeys (e.g. linkage->>'runId') can be added in a later
-- migration once query patterns stabilise — premature indexing here would
-- pin the JSON shape before the spokes prove themselves.

ALTER TABLE "todo" ADD COLUMN IF NOT EXISTS "linkage" jsonb;
ALTER TABLE "todo" ADD COLUMN IF NOT EXISTS "counterparty" jsonb;
ALTER TABLE "todo" ADD COLUMN IF NOT EXISTS "provenance" jsonb;
ALTER TABLE "todo" ADD COLUMN IF NOT EXISTS "impact" jsonb;
