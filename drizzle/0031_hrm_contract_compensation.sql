-- ADR-0015: Contract compensation catalog + lines, annex slots, payroll run snapshot
--> statement-breakpoint
CREATE TABLE "hrm_compensation_component" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "taxTreatment" text NOT NULL DEFAULT 'taxable',
  "statutoryBaseTreatment" text NOT NULL DEFAULT 'included',
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_component_organizationId_code_uidx" ON "hrm_compensation_component" ("organizationId", "code");
--> statement-breakpoint
CREATE INDEX "hrm_compensation_component_organizationId_idx" ON "hrm_compensation_component" ("organizationId");
--> statement-breakpoint
CREATE TABLE "hrm_contract_compensation_line" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "contractId" text NOT NULL,
  "componentId" text NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'MYR',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hrm_contract_compensation_line" ADD CONSTRAINT "hrm_contract_compensation_line_contractId_hrm_employment_contract_id_fk" FOREIGN KEY ("contractId") REFERENCES "hrm_employment_contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "hrm_contract_compensation_line" ADD CONSTRAINT "hrm_contract_compensation_line_componentId_hrm_compensation_component_id_fk" FOREIGN KEY ("componentId") REFERENCES "hrm_compensation_component"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_contract_compensation_line_contract_component_uidx" ON "hrm_contract_compensation_line" ("contractId", "componentId");
--> statement-breakpoint
CREATE INDEX "hrm_contract_compensation_line_contractId_idx" ON "hrm_contract_compensation_line" ("contractId");
--> statement-breakpoint
CREATE INDEX "hrm_contract_compensation_line_organizationId_idx" ON "hrm_contract_compensation_line" ("organizationId");
--> statement-breakpoint
ALTER TABLE "hrm_employment_contract" ADD COLUMN "annexSlots" jsonb;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD COLUMN "compensationSnapshot" jsonb NOT NULL DEFAULT '[]'::jsonb;
