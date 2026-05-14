-- Vietnam e-invoice substrate (NĐ123-shaped persistence) + durable domain-signal outbox.

CREATE TABLE "e_invoice" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "provider" text NOT NULL DEFAULT 'mock',
  "templateCode" text NOT NULL,
  "series" text NOT NULL,
  "invoiceNumber" text NOT NULL,
  "issueDate" date NOT NULL,
  "buyerName" text NOT NULL,
  "buyerTaxCode" text,
  "currency" text NOT NULL DEFAULT 'VND',
  "totalAmountVnd" bigint NOT NULL,
  "vatRateBps" integer NOT NULL DEFAULT 0,
  "xmlPayload" text NOT NULL,
  "providerReference" text,
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);

CREATE INDEX "e_invoice_org_status_idx" ON "e_invoice" ("organizationId", "status");
CREATE INDEX "e_invoice_org_issue_date_idx" ON "e_invoice" ("organizationId", "issueDate");

CREATE TABLE "e_invoice_transmission" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "eInvoiceId" text NOT NULL REFERENCES "e_invoice"("id") ON DELETE CASCADE,
  "channel" text NOT NULL DEFAULT 'mock',
  "state" text NOT NULL DEFAULT 'queued',
  "requestXml" text,
  "responseXml" text,
  "errorCode" text,
  "errorMessage" text,
  "attemptCount" integer NOT NULL DEFAULT 0,
  "lastAttemptAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "e_invoice_transmission_org_invoice_idx"
  ON "e_invoice_transmission" ("organizationId", "eInvoiceId");

CREATE TABLE "org_domain_signal_outbox" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "signalKey" text NOT NULL,
  "payload" jsonb NOT NULL,
  "actorUserId" text NOT NULL,
  "actorSessionId" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "org_domain_signal_outbox_org_created_idx"
  ON "org_domain_signal_outbox" ("organizationId", "createdAt" DESC);

CREATE INDEX "org_domain_signal_outbox_org_key_idx"
  ON "org_domain_signal_outbox" ("organizationId", "signalKey");
