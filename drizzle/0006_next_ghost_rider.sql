CREATE TABLE "hrm_geofence" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"scopeKind" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"radiusMeters" integer NOT NULL,
	"bufferMeters" integer DEFAULT 0 NOT NULL,
	"countryCode" text,
	"legalEntityCode" text,
	"notes" text,
	"archivedAt" timestamp,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_geofence_scope_kind_chk" CHECK ("hrm_geofence"."scopeKind" IN ('office', 'branch', 'project_site', 'client_site', 'field_site', 'home_office')),
	CONSTRAINT "hrm_geofence_radius_chk" CHECK ("hrm_geofence"."radiusMeters" > 0 AND "hrm_geofence"."radiusMeters" <= 50000),
	CONSTRAINT "hrm_geofence_buffer_chk" CHECK ("hrm_geofence"."bufferMeters" >= 0 AND "hrm_geofence"."bufferMeters" <= 5000)
);
--> statement-breakpoint
CREATE TABLE "hrm_remote_checkin_device" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"deviceLabel" text NOT NULL,
	"deviceFingerprint" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"lastSeenAt" timestamp,
	"lastIpAddress" text,
	"registeredByUserId" text,
	"revokedByUserId" text,
	"revokedAt" timestamp,
	"revokedReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_remote_checkin_device_state_chk" CHECK ("hrm_remote_checkin_device"."state" IN ('pending', 'active', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "hrm_remote_checkin_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"eventType" text NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"gpsAccuracyMeters" integer,
	"deviceId" text,
	"remoteLocationLabel" text,
	"geofenceId" text,
	"selfieBlobUrl" text,
	"detectionOutcome" text NOT NULL,
	"reason" text NOT NULL,
	"decisionReason" text,
	"correctedLatitude" numeric(10, 6),
	"correctedLongitude" numeric(10, 6),
	"correctedEventType" text,
	"correctedOccurredAt" timestamp,
	"decidedAt" timestamp,
	"decidedByUserId" text,
	"resolvedEventId" text,
	"spoofingSignals" jsonb,
	"capturedClientIp" text,
	"submittedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_remote_checkin_exception_state_chk" CHECK ("hrm_remote_checkin_exception"."state" IN ('submitted', 'approved', 'rejected', 'returned', 'corrected', 'cancelled')),
	CONSTRAINT "hrm_remote_checkin_exception_event_type_chk" CHECK ("hrm_remote_checkin_exception"."eventType" IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
	CONSTRAINT "hrm_remote_checkin_exception_corrected_event_type_chk" CHECK ("hrm_remote_checkin_exception"."correctedEventType" IS NULL OR "hrm_remote_checkin_exception"."correctedEventType" IN ('clock_in', 'clock_out', 'break_start', 'break_end'))
);
--> statement-breakpoint
CREATE TABLE "hrm_remote_checkin_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"scopeKind" text NOT NULL,
	"scopeRef" text,
	"minGpsAccuracyMeters" integer DEFAULT 100 NOT NULL,
	"allowedRadiusBufferMeters" integer DEFAULT 50 NOT NULL,
	"shiftWindowMinutes" integer DEFAULT 60 NOT NULL,
	"breakWindowMinutes" integer DEFAULT 30 NOT NULL,
	"requireRegisteredDevice" boolean DEFAULT true NOT NULL,
	"requireSelfie" boolean DEFAULT false NOT NULL,
	"detectSpoofing" boolean DEFAULT true NOT NULL,
	"allowEligibilityException" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_remote_checkin_policy_scope_kind_chk" CHECK ("hrm_remote_checkin_policy"."scopeKind" IN ('org', 'department', 'position', 'employment_type', 'policy_group', 'employee')),
	CONSTRAINT "hrm_remote_checkin_policy_thresholds_chk" CHECK ("hrm_remote_checkin_policy"."minGpsAccuracyMeters" > 0 AND "hrm_remote_checkin_policy"."allowedRadiusBufferMeters" >= 0 AND "hrm_remote_checkin_policy"."shiftWindowMinutes" >= 0 AND "hrm_remote_checkin_policy"."breakWindowMinutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "hrm_attendance_event" ADD COLUMN "geofenceId" text;--> statement-breakpoint
ALTER TABLE "hrm_attendance_event" ADD COLUMN "gpsAccuracyMeters" integer;--> statement-breakpoint
ALTER TABLE "hrm_attendance_event" ADD COLUMN "selfieBlobUrl" text;--> statement-breakpoint
ALTER TABLE "hrm_attendance_event" ADD COLUMN "locationVerificationOutcome" text;--> statement-breakpoint
ALTER TABLE "hrm_remote_checkin_device" ADD CONSTRAINT "hrm_remote_checkin_device_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_remote_checkin_exception" ADD CONSTRAINT "hrm_remote_checkin_exception_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_geofence_org_code_uidx" ON "hrm_geofence" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_geofence_org_scope_active_idx" ON "hrm_geofence" USING btree ("organizationId","scopeKind","archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_remote_checkin_device_org_fingerprint_uidx" ON "hrm_remote_checkin_device" USING btree ("organizationId","deviceFingerprint");--> statement-breakpoint
CREATE INDEX "hrm_remote_checkin_device_org_employee_state_idx" ON "hrm_remote_checkin_device" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_remote_checkin_exception_org_state_created_idx" ON "hrm_remote_checkin_exception" USING btree ("organizationId","state","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_remote_checkin_exception_org_employee_created_idx" ON "hrm_remote_checkin_exception" USING btree ("organizationId","employeeId","createdAt");--> statement-breakpoint
CREATE INDEX "hrm_remote_checkin_exception_org_outcome_idx" ON "hrm_remote_checkin_exception" USING btree ("organizationId","detectionOutcome");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_remote_checkin_policy_org_scope_uidx" ON "hrm_remote_checkin_policy" USING btree ("organizationId","scopeKind","scopeRef");--> statement-breakpoint
CREATE INDEX "hrm_remote_checkin_policy_org_active_idx" ON "hrm_remote_checkin_policy" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_geofence_idx" ON "hrm_attendance_event" USING btree ("organizationId","geofenceId");