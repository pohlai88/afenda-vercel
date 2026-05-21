CREATE TABLE "hrm_time_clock_device" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"externalDeviceId" text NOT NULL,
	"name" text NOT NULL,
	"deviceType" text NOT NULL,
	"locationRef" text,
	"state" text DEFAULT 'active' NOT NULL,
	"syncStatus" text DEFAULT 'idle' NOT NULL,
	"lastSyncAt" timestamp,
	"integrationCredentialRef" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_time_clock_device_type_chk" CHECK ("hrm_time_clock_device"."deviceType" IN ('biometric', 'card', 'rfid', 'kiosk', 'web', 'api')),
	CONSTRAINT "hrm_time_clock_device_state_chk" CHECK ("hrm_time_clock_device"."state" IN ('active', 'inactive', 'revoked')),
	CONSTRAINT "hrm_time_clock_device_sync_status_chk" CHECK ("hrm_time_clock_device"."syncStatus" IN ('idle', 'syncing', 'failed', 'ok'))
);
--> statement-breakpoint
CREATE TABLE "hrm_time_clock_employee_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"deviceId" text NOT NULL,
	"employeeId" text NOT NULL,
	"clockUserId" text,
	"badgeId" text,
	"biometricRef" text,
	"state" text DEFAULT 'active' NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_time_clock_mapping_state_chk" CHECK ("hrm_time_clock_employee_mapping"."state" IN ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "hrm_time_clock_punch_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"deviceId" text,
	"syncBatchId" text,
	"state" text DEFAULT 'submitted' NOT NULL,
	"eventType" text NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"detectionOutcome" text NOT NULL,
	"reason" text NOT NULL,
	"rawPayloadHash" text,
	"sourceRef" text,
	"resolvedEventId" text,
	"decidedAt" timestamp,
	"decidedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_time_clock_punch_exception_state_chk" CHECK ("hrm_time_clock_punch_exception"."state" IN ('submitted', 'approved', 'rejected', 'cancelled')),
	CONSTRAINT "hrm_time_clock_punch_exception_event_type_chk" CHECK ("hrm_time_clock_punch_exception"."eventType" IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'correction'))
);
--> statement-breakpoint
CREATE TABLE "hrm_time_clock_sync_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"deviceId" text,
	"sourceKind" text NOT NULL,
	"state" text DEFAULT 'running' NOT NULL,
	"receivedCount" integer DEFAULT 0 NOT NULL,
	"acceptedCount" integer DEFAULT 0 NOT NULL,
	"duplicateCount" integer DEFAULT 0 NOT NULL,
	"rejectedCount" integer DEFAULT 0 NOT NULL,
	"errorSummary" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"finishedAt" timestamp,
	"createdByUserId" text,
	CONSTRAINT "hrm_time_clock_sync_batch_source_chk" CHECK ("hrm_time_clock_sync_batch"."sourceKind" IN ('api', 'manual_import', 'scheduled', 'offline_replay')),
	CONSTRAINT "hrm_time_clock_sync_batch_state_chk" CHECK ("hrm_time_clock_sync_batch"."state" IN ('running', 'completed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "hrm_time_clock_employee_mapping" ADD CONSTRAINT "hrm_time_clock_employee_mapping_deviceId_hrm_time_clock_device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."hrm_time_clock_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_clock_employee_mapping" ADD CONSTRAINT "hrm_time_clock_employee_mapping_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_clock_punch_exception" ADD CONSTRAINT "hrm_time_clock_punch_exception_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_clock_punch_exception" ADD CONSTRAINT "hrm_time_clock_punch_exception_deviceId_hrm_time_clock_device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."hrm_time_clock_device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_clock_punch_exception" ADD CONSTRAINT "hrm_time_clock_punch_exception_syncBatchId_hrm_time_clock_sync_batch_id_fk" FOREIGN KEY ("syncBatchId") REFERENCES "public"."hrm_time_clock_sync_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_time_clock_sync_batch" ADD CONSTRAINT "hrm_time_clock_sync_batch_deviceId_hrm_time_clock_device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."hrm_time_clock_device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_time_clock_device_org_external_uidx" ON "hrm_time_clock_device" USING btree ("organizationId","externalDeviceId");--> statement-breakpoint
CREATE INDEX "hrm_time_clock_device_org_state_idx" ON "hrm_time_clock_device" USING btree ("organizationId","state");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_time_clock_mapping_org_device_clock_user_uidx" ON "hrm_time_clock_employee_mapping" USING btree ("organizationId","deviceId","clockUserId");--> statement-breakpoint
CREATE INDEX "hrm_time_clock_mapping_org_employee_idx" ON "hrm_time_clock_employee_mapping" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_time_clock_punch_exception_org_state_idx" ON "hrm_time_clock_punch_exception" USING btree ("organizationId","state","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_time_clock_sync_batch_org_started_idx" ON "hrm_time_clock_sync_batch" USING btree ("organizationId","startedAt");