-- Drop legacy FK constraints that pointed app tables at public.user / public.organization.
-- Auth data now lives exclusively in neon_auth.* (managed by Neon Auth).
-- The neon_auth.* cross-schema FKs already exist and are owned by Neon; this migration
-- only removes the duplicate public-schema references that were created by the original
-- Better Auth migration and would cause FK violations when inserting Neon Auth user IDs.

ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_organizationId_organization_id_fk";
ALTER TABLE "iam_audit_event" DROP CONSTRAINT IF EXISTS "iam_audit_event_actorUserId_user_id_fk";
ALTER TABLE "iam_audit_event" DROP CONSTRAINT IF EXISTS "iam_audit_event_organizationId_organization_id_fk";
ALTER TABLE "import_job" DROP CONSTRAINT IF EXISTS "import_job_createdByUserId_user_id_fk";
ALTER TABLE "import_job" DROP CONSTRAINT IF EXISTS "import_job_organizationId_organization_id_fk";
ALTER TABLE "knowledge_chunk" DROP CONSTRAINT IF EXISTS "knowledge_chunk_organizationId_organization_id_fk";
ALTER TABLE "knowledge_chunk" DROP CONSTRAINT IF EXISTS "knowledge_chunk_createdByUserId_user_id_fk";
ALTER TABLE "org_event_endpoint" DROP CONSTRAINT IF EXISTS "org_event_endpoint_organizationId_organization_id_fk";
