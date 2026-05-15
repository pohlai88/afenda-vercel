ALTER TABLE "hrm_employee"
  ADD COLUMN "employmentStatus" text NOT NULL DEFAULT 'active',
  ADD COLUMN "employmentStartDate" date,
  ADD COLUMN "probationEndDate" date,
  ADD COLUMN "confirmationDate" date;
--> statement-breakpoint
CREATE INDEX "hrm_employee_organizationId_employmentStatus_idx"
  ON "hrm_employee" USING btree ("organizationId","employmentStatus");
--> statement-breakpoint
UPDATE "hrm_employee"
SET "employmentStatus" = 'archived'
WHERE "archivedAt" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "hrm_employee_personal_profile" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL,
  "dateOfBirth" date,
  "gender" text,
  "nationality" text,
  "maritalStatus" text,
  "primaryIdentityDocumentId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_personal_profile"
  ADD CONSTRAINT "hrm_employee_personal_profile_employeeId_hrm_employee_id_fk"
  FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_personal_profile_org_employee_uidx"
  ON "hrm_employee_personal_profile" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_employee_personal_profile_org_nationality_idx"
  ON "hrm_employee_personal_profile" USING btree ("organizationId","nationality");
--> statement-breakpoint

CREATE TABLE "hrm_employee_contact_profile" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL,
  "workEmail" text,
  "workPhone" text,
  "personalEmail" text,
  "personalPhone" text,
  "address" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_contact_profile"
  ADD CONSTRAINT "hrm_employee_contact_profile_employeeId_hrm_employee_id_fk"
  FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_contact_profile_org_employee_uidx"
  ON "hrm_employee_contact_profile" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_employee_contact_profile_org_workEmail_idx"
  ON "hrm_employee_contact_profile" USING btree ("organizationId","workEmail");
--> statement-breakpoint

CREATE TABLE "hrm_employee_identity_document" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL,
  "documentType" text NOT NULL,
  "documentNumber" text NOT NULL,
  "issuingCountry" text NOT NULL,
  "issuedAt" date,
  "expiresAt" date,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "verificationStatus" text NOT NULL DEFAULT 'unverified',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_identity_document"
  ADD CONSTRAINT "hrm_employee_identity_document_employeeId_hrm_employee_id_fk"
  FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_employee_identity_document_org_employee_idx"
  ON "hrm_employee_identity_document" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_employee_identity_document_org_employee_primary_uidx"
  ON "hrm_employee_identity_document" USING btree ("organizationId","employeeId")
  WHERE "isPrimary" = true;
--> statement-breakpoint

CREATE TABLE "hrm_employee_work_authorization" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL,
  "countryCode" text NOT NULL,
  "authorizationType" text NOT NULL,
  "documentNumber" text,
  "issuedAt" date,
  "expiresAt" date,
  "status" text NOT NULL DEFAULT 'active',
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_work_authorization"
  ADD CONSTRAINT "hrm_employee_work_authorization_employeeId_hrm_employee_id_fk"
  FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_employee_work_authorization_org_employee_idx"
  ON "hrm_employee_work_authorization" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_employee_work_authorization_org_country_status_idx"
  ON "hrm_employee_work_authorization" USING btree ("organizationId","countryCode","status");
--> statement-breakpoint

INSERT INTO "hrm_employee_personal_profile" (
  "id",
  "organizationId",
  "employeeId",
  "dateOfBirth",
  "gender",
  "nationality",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId"
)
SELECT
  gen_random_uuid()::text,
  e."organizationId",
  e."id",
  e."dateOfBirth",
  e."gender",
  e."nationality",
  now(),
  now(),
  e."createdByUserId",
  e."updatedByUserId"
FROM "hrm_employee" e
WHERE
  e."dateOfBirth" IS NOT NULL
  OR NULLIF(e."gender", '') IS NOT NULL
  OR NULLIF(e."nationality", '') IS NOT NULL
ON CONFLICT ("organizationId", "employeeId") DO NOTHING;
--> statement-breakpoint

INSERT INTO "hrm_employee_contact_profile" (
  "id",
  "organizationId",
  "employeeId",
  "workEmail",
  "workPhone",
  "address",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId"
)
SELECT
  gen_random_uuid()::text,
  e."organizationId",
  e."id",
  e."email",
  e."phone",
  e."address",
  now(),
  now(),
  e."createdByUserId",
  e."updatedByUserId"
FROM "hrm_employee" e
WHERE
  NULLIF(e."email", '') IS NOT NULL
  OR NULLIF(e."phone", '') IS NOT NULL
  OR e."address" IS NOT NULL
ON CONFLICT ("organizationId", "employeeId") DO NOTHING;
--> statement-breakpoint

INSERT INTO "hrm_employee_identity_document" (
  "id",
  "organizationId",
  "employeeId",
  "documentType",
  "documentNumber",
  "issuingCountry",
  "isPrimary",
  "verificationStatus",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId"
)
SELECT
  gen_random_uuid()::text,
  e."organizationId",
  e."id",
  COALESCE(NULLIF(e."idDocumentType", ''), 'national_id'),
  e."idDocumentNumber",
  COALESCE(NULLIF(e."countryCode", ''), NULLIF(e."nationality", ''), 'MY'),
  true,
  'unverified',
  now(),
  now(),
  e."createdByUserId",
  e."updatedByUserId"
FROM "hrm_employee" e
WHERE NULLIF(e."idDocumentNumber", '') IS NOT NULL
ON CONFLICT ("organizationId", "employeeId") WHERE "isPrimary" = true DO NOTHING;
