-- Phase 2C: Attendance event stream (immutable) + computed daily aggregate
-- Naming: camelCase SQL column names (aligned with all existing HRM tables in this repo)

-- E. hrm_attendance_event — immutable raw event stream
CREATE TABLE "hrm_attendance_event" (
  "id"                   text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId"       text NOT NULL,
  "employeeId"           text NOT NULL,
  "eventType"            text NOT NULL,   -- clock_in | clock_out | break_start | break_end | correction
  "occurredAt"           timestamp NOT NULL,
  "source"               text NOT NULL,   -- manual | csv_import | mobile | device
  "sourceRef"            text,            -- import_job_row.id or device receipt
  "correctionOfEventId"  text,            -- self-FK; set when eventType = 'correction'
  "correctionReason"     text,
  "latitude"             numeric(10,6),
  "longitude"            numeric(10,6),
  "deviceId"             text,
  "importBatchId"        text,            -- fk-style to import_job.id
  "rawPayloadHash"       text,
  "metadata"             jsonb,
  "createdByUserId"      text,
  "createdAt"            timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_emp_occurredAt_idx"
  ON "hrm_attendance_event" ("organizationId", "employeeId", "occurredAt" DESC);
--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_source_batchId_idx"
  ON "hrm_attendance_event" ("organizationId", "source", "importBatchId");
--> statement-breakpoint
CREATE INDEX "hrm_attendance_event_org_correctionOf_idx"
  ON "hrm_attendance_event" ("organizationId", "correctionOfEventId")
  WHERE "correctionOfEventId" IS NOT NULL;
--> statement-breakpoint
-- F. hrm_attendance_day — computed daily aggregate (rebuildable from events)
CREATE TABLE "hrm_attendance_day" (
  "id"                         text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId"             text NOT NULL,
  "employeeId"                 text NOT NULL,
  "attendanceDate"             date NOT NULL,
  "firstClockInAt"             timestamp,
  "lastClockOutAt"             timestamp,
  "scheduledMinutes"           integer NOT NULL DEFAULT 0,
  "workedMinutes"              integer NOT NULL DEFAULT 0,
  "breakMinutes"               integer NOT NULL DEFAULT 0,
  "lateMinutes"                integer NOT NULL DEFAULT 0,
  "earlyOutMinutes"            integer NOT NULL DEFAULT 0,
  "overtimeMinutes"            integer NOT NULL DEFAULT 0,
  "absenceCode"                text,                -- populated from leave engine
  "state"                      text NOT NULL DEFAULT 'open',  -- open | computed | locked
  "lockedByPayrollPeriodId"    text,
  "derivedFromEventChecksum"   text,                -- sha-256 of sorted contributing event ids
  "calculationSnapshot"        jsonb,               -- preserved for payroll evidence
  "createdByUserId"            text,
  "updatedByUserId"            text,
  "createdAt"                  timestamp NOT NULL DEFAULT now(),
  "updatedAt"                  timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_attendance_day_org_emp_date_uidx"
  ON "hrm_attendance_day" ("organizationId", "employeeId", "attendanceDate");
--> statement-breakpoint
CREATE INDEX "hrm_attendance_day_org_date_state_idx"
  ON "hrm_attendance_day" ("organizationId", "attendanceDate", "state");
