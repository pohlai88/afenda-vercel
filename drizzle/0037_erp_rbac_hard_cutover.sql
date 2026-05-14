CREATE TABLE "tenant_authority" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "appointedByUserId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_authority_org_user_role_uidx" ON "tenant_authority" USING btree ("organizationId","userId","role");
--> statement-breakpoint
CREATE INDEX "tenant_authority_org_role_idx" ON "tenant_authority" USING btree ("organizationId","role","status");
--> statement-breakpoint
CREATE INDEX "tenant_authority_org_user_idx" ON "tenant_authority" USING btree ("organizationId","userId","status");
--> statement-breakpoint

CREATE TABLE "erp_role" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'active',
  "createdByUserId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_org_name_uidx" ON "erp_role" USING btree ("organizationId","name");
--> statement-breakpoint
CREATE INDEX "erp_role_org_status_idx" ON "erp_role" USING btree ("organizationId","status");
--> statement-breakpoint

CREATE TABLE "erp_role_member" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "roleId" text NOT NULL,
  "userId" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "assignedByUserId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "erp_role_member"
  ADD CONSTRAINT "erp_role_member_roleId_erp_role_id_fk"
  FOREIGN KEY ("roleId") REFERENCES "public"."erp_role"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_member_role_user_uidx" ON "erp_role_member" USING btree ("roleId","userId");
--> statement-breakpoint
CREATE INDEX "erp_role_member_org_user_idx" ON "erp_role_member" USING btree ("organizationId","userId","status");
--> statement-breakpoint
CREATE INDEX "erp_role_member_org_role_idx" ON "erp_role_member" USING btree ("organizationId","roleId","status");
--> statement-breakpoint

CREATE TABLE "erp_role_permission" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "roleId" text NOT NULL,
  "module" text NOT NULL,
  "object" text NOT NULL,
  "function" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "grantedByUserId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "erp_role_permission"
  ADD CONSTRAINT "erp_role_permission_roleId_erp_role_id_fk"
  FOREIGN KEY ("roleId") REFERENCES "public"."erp_role"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "erp_role_permission_role_module_object_function_uidx"
  ON "erp_role_permission" USING btree ("roleId","module","object","function");
--> statement-breakpoint
CREATE INDEX "erp_role_permission_org_role_idx"
  ON "erp_role_permission" USING btree ("organizationId","roleId","status");
--> statement-breakpoint
CREATE INDEX "erp_role_permission_org_module_object_idx"
  ON "erp_role_permission" USING btree ("organizationId","module","object","status");
--> statement-breakpoint

INSERT INTO "tenant_authority" (
  "id",
  "organizationId",
  "userId",
  "role",
  "status",
  "appointedByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  m."organizationId",
  m."userId",
  CASE
    WHEN m."role" = 'owner' THEN 'tenant_owner'
    WHEN m."role" = 'admin' THEN 'tenant_support_admin'
    ELSE NULL
  END,
  'active',
  m."userId",
  now(),
  now()
FROM neon_auth.member AS m
WHERE m."role" IN ('owner', 'admin')
ON CONFLICT ("organizationId", "userId", "role") DO NOTHING;
--> statement-breakpoint

INSERT INTO "tenant_authority" (
  "id",
  "organizationId",
  "userId",
  "role",
  "status",
  "appointedByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  seeded."organizationId",
  seeded."userId",
  'tenant_key_admin',
  'active',
  seeded."userId",
  now(),
  now()
FROM (
  SELECT DISTINCT ON (m."organizationId")
    m."organizationId",
    m."userId"
  FROM neon_auth.member AS m
  ORDER BY
    m."organizationId",
    CASE
      WHEN m."role" = 'owner' THEN 1
      WHEN m."role" = 'admin' THEN 2
      ELSE 3
    END,
    m."createdAt" ASC,
    m."userId" ASC
) AS seeded
ON CONFLICT ("organizationId", "userId", "role") DO NOTHING;
--> statement-breakpoint

INSERT INTO "tenant_authority" (
  "id",
  "organizationId",
  "userId",
  "role",
  "status",
  "appointedByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  key_admin."organizationId",
  key_admin."userId",
  'tenant_support_admin',
  'active',
  key_admin."userId",
  now(),
  now()
FROM (
  SELECT DISTINCT ON (m."organizationId")
    m."organizationId",
    m."userId"
  FROM neon_auth.member AS m
  ORDER BY
    m."organizationId",
    CASE
      WHEN m."role" = 'owner' THEN 1
      WHEN m."role" = 'admin' THEN 2
      ELSE 3
    END,
    m."createdAt" ASC,
    m."userId" ASC
) AS key_admin
WHERE NOT EXISTS (
  SELECT 1
  FROM "tenant_authority" AS existing
  WHERE existing."organizationId" = key_admin."organizationId"
    AND existing."role" = 'tenant_support_admin'
    AND existing."status" = 'active'
)
ON CONFLICT ("organizationId", "userId", "role") DO NOTHING;
