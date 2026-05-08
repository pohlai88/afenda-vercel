CREATE TABLE "lynx_demo_unicorn" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"company" text NOT NULL,
	"valuation" numeric(10, 2) NOT NULL,
	"dateJoined" date,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"industry" text NOT NULL,
	"selectInvestors" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lynx_demo_unicorn" ADD CONSTRAINT "lynx_demo_unicorn_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lynx_demo_unicorn_organization_id_idx" ON "lynx_demo_unicorn" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "lynx_demo_unicorn_org_company_uidx" ON "lynx_demo_unicorn" USING btree ("organizationId","company");