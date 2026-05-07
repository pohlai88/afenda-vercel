CREATE TABLE "org_event_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"endpointId" text NOT NULL,
	"eventType" text NOT NULL,
	"payloadHash" text NOT NULL,
	"signatureVersion" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"httpStatus" integer,
	"errorMessage" text,
	"durationMs" integer,
	"nextAttemptAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "org_event_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"signingKeyEncoded" text NOT NULL,
	"events" jsonb NOT NULL,
	"signatureVersion" text DEFAULT 'v1' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_event_delivery" ADD CONSTRAINT "org_event_delivery_endpointId_org_event_endpoint_id_fk" FOREIGN KEY ("endpointId") REFERENCES "public"."org_event_endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_event_endpoint" ADD CONSTRAINT "org_event_endpoint_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_event_delivery_endpointId_createdAt_idx" ON "org_event_delivery" USING btree ("endpointId","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_delivery_state_createdAt_idx" ON "org_event_delivery" USING btree ("state","createdAt");--> statement-breakpoint
CREATE INDEX "org_event_endpoint_organization_id_idx" ON "org_event_endpoint" USING btree ("organizationId");