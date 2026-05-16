CREATE TABLE "hrm_signature_request" (
	"id" text PRIMARY KEY NOT NULL,
	"publicSlug" text NOT NULL,
	"organizationId" text NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"signingOrder" text DEFAULT 'parallel' NOT NULL,
	"documentId" text NOT NULL,
	"signedEnvelopeDocumentId" text,
	"derivedStatus" text DEFAULT 'draft' NOT NULL,
	"mode" text DEFAULT 'in_app' NOT NULL,
	"providerEndpointId" text,
	"externalReference" text,
	"declarationTextHash" text NOT NULL,
	"expirationPeriodDays" integer,
	"sentAt" timestamp,
	"lastEventAt" timestamp,
	"voidedAt" timestamp,
	"voidReason" text,
	"audit7w1h" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"partyId" text,
	"type" text NOT NULL,
	"actorType" text NOT NULL,
	"actorUserId" text,
	"actorEmail" text,
	"actorName" text,
	"userAgent" text,
	"ipAddress" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dataHash" text NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_signature_party" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"signerOrder" integer NOT NULL,
	"signerEmployeeId" text,
	"signerEmail" text NOT NULL,
	"signerName" text NOT NULL,
	"role" text DEFAULT 'signer' NOT NULL,
	"token" text NOT NULL,
	"readStatus" text DEFAULT 'not_opened' NOT NULL,
	"sendStatus" text DEFAULT 'not_sent' NOT NULL,
	"signingStatus" text DEFAULT 'not_signed' NOT NULL,
	"expiresAt" timestamp,
	"sentAt" timestamp,
	"firstOpenedAt" timestamp,
	"signedAt" timestamp,
	"lastReminderSentAt" timestamp,
	"nextReminderAt" timestamp,
	"rejectionReason" text,
	"signedProofEventId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_documentId_hrm_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."hrm_document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_signedEnvelopeDocumentId_hrm_document_id_fk" FOREIGN KEY ("signedEnvelopeDocumentId") REFERENCES "public"."hrm_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_request" ADD CONSTRAINT "hrm_signature_request_providerEndpointId_org_event_endpoint_id_fk" FOREIGN KEY ("providerEndpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_event" ADD CONSTRAINT "hrm_signature_event_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_requestId_hrm_signature_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_signature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_signature_party" ADD CONSTRAINT "hrm_signature_party_signerEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("signerEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_public_slug_uidx" ON "hrm_signature_request" USING btree ("publicSlug");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_derived_status_idx" ON "hrm_signature_request" USING btree ("organizationId","derivedStatus");--> statement-breakpoint
CREATE INDEX "hrm_signature_request_org_kind_subject_idx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_request_org_kind_subject_open_uidx" ON "hrm_signature_request" USING btree ("organizationId","kind","subjectId") WHERE "derivedStatus" in ('draft', 'sent', 'partially_signed');--> statement-breakpoint
CREATE INDEX "hrm_signature_event_request_occurred_idx" ON "hrm_signature_event" USING btree ("requestId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_org_occurred_idx" ON "hrm_signature_event" USING btree ("organizationId","occurredAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_event_type_idx" ON "hrm_signature_event" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_token_uidx" ON "hrm_signature_party" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_signer_order_uidx" ON "hrm_signature_party" USING btree ("requestId","signerOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_signature_party_request_employee_uidx" ON "hrm_signature_party" USING btree ("requestId","signerEmployeeId") WHERE "signerEmployeeId" is not null;--> statement-breakpoint
CREATE INDEX "hrm_signature_party_next_reminder_idx" ON "hrm_signature_party" USING btree ("nextReminderAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_expires_at_idx" ON "hrm_signature_party" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "hrm_signature_party_request_signing_status_idx" ON "hrm_signature_party" USING btree ("requestId","signingStatus");
