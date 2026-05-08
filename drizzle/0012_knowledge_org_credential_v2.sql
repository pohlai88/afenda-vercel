ALTER TABLE "knowledge_org_credential" ADD COLUMN "cipherText" text;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "cipherIv" text;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "cipherTag" text;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "keyVersion" smallint DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "lastRotatedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "lastUsedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD COLUMN "metadata" jsonb;
--> statement-breakpoint
UPDATE "knowledge_org_credential"
SET
	"cipherText" = encode(convert_to("encryptedPayload", 'utf8'), 'base64'),
	"cipherIv" = encode(decode('000000000000000000000000', 'hex'), 'base64'),
	"cipherTag" = encode(decode('00000000000000000000000000000000', 'hex'), 'base64'),
	"lastRotatedAt" = "updatedAt"
WHERE "cipherText" IS NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ALTER COLUMN "cipherText" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ALTER COLUMN "cipherIv" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ALTER COLUMN "cipherTag" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" ADD CONSTRAINT "knowledge_org_credential_state_check" CHECK ("knowledge_org_credential"."state" in ('active', 'rotating', 'disabled', 'revoked'));
--> statement-breakpoint
ALTER TABLE "knowledge_org_credential" DROP COLUMN "encryptedPayload";
