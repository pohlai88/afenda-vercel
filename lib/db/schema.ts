import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  decimal,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core"

/**
 * IAM / security audit trail (org-scoped where applicable).
 * Append-only; writers live in `lib/auth/audit.server.ts` and Neon Auth hooks. Action strings: see IAM audit policy in `AGENTS.md` (`erp.*`, `org.*`, `iam.session.*`).
 * FK references to user/organization are intentionally omitted — IDs come from `neon_auth.*` which is managed by Neon Auth and does not expose cross-schema FK constraints.
 */
export const iamAuditEvent = pgTable(
  "iam_audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    action: text("action").notNull(),
    actorUserId: text("actorUserId"),
    actorSessionId: text("actorSessionId"),
    organizationId: text("organizationId"),
    resourceType: text("resourceType"),
    resourceId: text("resourceId"),
    path: text("path"),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    /** JSON object serialized with `JSON.stringify` */
    metadata: text("metadata"),
    /**
     * Row provenance — `simulation` rows are authored only via operational simulation replay.
     * Compliance exports default to `production` only.
     */
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
    auditActorMode: text("auditActorMode").notNull().default("user"),
  },
  (t) => [
    index("iam_audit_event_organizationId_auditOrigin_createdAt_idx").on(
      t.organizationId,
      t.auditOrigin,
      t.createdAt
    ),
    index("iam_audit_event_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("iam_audit_event_actorUserId_createdAt_idx").on(
      t.actorUserId,
      t.createdAt
    ),
    index("iam_audit_event_action_createdAt_idx").on(t.action, t.createdAt),
  ]
)

/** ERP sample domain — scoped by organization (organizationId from neon_auth.organization). */
export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("customers_organization_id_idx").on(t.organizationId)]
)

/**
 * Outbound event delivery — endpoint configuration (per organization).
 * `signingKeyEncoded` stores the base64-encoded HMAC signing key. The
 * plaintext is shown only once at create/rotate (UI never re-renders it; the
 * column is intentionally never returned to the browser). `events` is a JSONB
 * array of canonical namespaced event types (see `ORG_ADMIN_EVENT_NAMESPACES`).
 * `signatureVersion` future-proofs the HMAC algorithm; bump on rotation.
 *
 * Encryption-at-rest (KMS / pgcrypto) is a follow-up; tracked in AGENTS.md
 * §5 → Organizational control plane.
 */
export const orgEventEndpoint = pgTable(
  "org_event_endpoint",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    signingKeyEncoded: text("signingKeyEncoded").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    signatureVersion: text("signatureVersion").notNull().default("v1"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("org_event_endpoint_organization_id_idx").on(t.organizationId)]
)

/**
 * Outbound event delivery — per-attempt record with full audit lineage.
 * `payloadHash` is the sha-256 hex of canonical JSON (sorted keys) for the
 * delivered envelope, captured at enqueue time. `state` follows the canonical
 * lifecycle: queued | sending | delivered | failed | expired | disabled
 * (see `EVENT_DELIVERY_STATES` in `lib/features/org-admin/constants.ts`).
 */
export const orgEventDelivery = pgTable(
  "org_event_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    endpointId: text("endpointId")
      .notNull()
      .references(() => orgEventEndpoint.id, { onDelete: "cascade" }),
    eventType: text("eventType").notNull(),
    payloadHash: text("payloadHash").notNull(),
    signatureVersion: text("signatureVersion").notNull(),
    state: text("state").notNull(),
    attempts: integer("attempts").notNull().default(0),
    httpStatus: integer("httpStatus"),
    errorMessage: text("errorMessage"),
    durationMs: integer("durationMs"),
    nextAttemptAt: timestamp("nextAttemptAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (t) => [
    index("org_event_delivery_endpointId_createdAt_idx").on(
      t.endpointId,
      t.createdAt
    ),
    index("org_event_delivery_state_createdAt_idx").on(t.state, t.createdAt),
  ]
)

/**
 * Organizational ingestion jobs — generic primitive used by adapters that
 * stage rows from external sources (CSV first; vendors / SKUs / contracts
 * later). One job → many rows → many failures. `inputDigest` (sha-256 hex of
 * canonical input) gives idempotency once enforcement lands. `metadata`
 * captures adapter-specific options (filename, original row count, …).
 */
export const importJob = pgTable(
  "import_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    adapter: text("adapter").notNull(),
    state: text("state").notNull(),
    totalRows: integer("totalRows").notNull().default(0),
    successCount: integer("successCount").notNull().default(0),
    failureCount: integer("failureCount").notNull().default(0),
    inputDigest: text("inputDigest").notNull(),
    /** userId from neon_auth.user */
    createdByUserId: text("createdByUserId"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (t) => [
    index("import_job_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("import_job_state_idx").on(t.state),
  ]
)

/**
 * Staged input row for an `import_job`. `payload` is the parsed adapter row
 * (jsonb); `state` follows: pending → applied | failed | skipped. When the
 * adapter creates a downstream resource (invitation, contact, …) it captures
 * the `resourceType` / `resourceId` here for the governance ledger.
 */
export const importJobRow = pgTable(
  "import_job_row",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("jobId")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    rowIndex: integer("rowIndex").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    state: text("state").notNull(),
    resourceType: text("resourceType"),
    resourceId: text("resourceId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("import_job_row_jobId_rowIndex_idx").on(t.jobId, t.rowIndex),
    index("import_job_row_jobId_state_idx").on(t.jobId, t.state),
  ]
)

/**
 * Failure detail for an `import_job_row` (or job-level when `rowId` is null).
 * `code` is a short stable string (e.g. `validation`, `rate_limit`,
 * `duplicate`). `field` optionally names the offending payload column.
 */
export const importJobFailure = pgTable(
  "import_job_failure",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("jobId")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    rowId: text("rowId").references(() => importJobRow.id, {
      onDelete: "cascade",
    }),
    code: text("code").notNull(),
    message: text("message").notNull(),
    field: text("field"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("import_job_failure_jobId_createdAt_idx").on(t.jobId, t.createdAt),
  ]
)

/** Orbit attention primitive — operational pressure detected before it becomes executable work. */
export const plannerSignal = pgTable(
  "planner_signal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    title: text("title").notNull(),
    description: text("description"),
    signalClass: text("signalClass").notNull().default("manual_capture"),
    lifecycle: text("lifecycle").notNull().default("detected"),
    originatingSystem: text("originatingSystem"),
    correlationKey: text("correlationKey"),
    correlationGroup: text("correlationGroup"),
    urgency: integer("urgency").notNull().default(2),
    impact: integer("impact").notNull().default(2),
    severity: integer("severity").notNull().default(2),
    confidence: integer("confidence").notNull().default(3),
    effort: integer("effort").notNull().default(2),
    escalationLevel: integer("escalationLevel").notNull().default(1),
    temporalProximity: integer("temporalProximity").notNull().default(1),
    ownershipPressure: integer("ownershipPressure").notNull().default(1),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    detectedAt: timestamp("detectedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    promotedAt: timestamp("promotedAt", { mode: "date" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    auditOrigin: text("auditOrigin").notNull().default("production"),
  },
  (t) => [
    index("planner_signal_organization_lifecycle_idx").on(
      t.organizationId,
      t.lifecycle
    ),
    index("planner_signal_owner_lifecycle_idx").on(t.ownerUserId, t.lifecycle),
    index("planner_signal_detected_at_idx").on(t.detectedAt),
    index("planner_signal_correlation_key_idx").on(t.correlationKey),
  ]
)

/** Orbit execution primitive — durable operational work object. */
export const plannerItem = pgTable(
  "planner_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    sourceSignalId: text("sourceSignalId").references(() => plannerSignal.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    lifecycle: text("lifecycle").notNull().default("triaged"),
    urgency: integer("urgency").notNull().default(2),
    impact: integer("impact").notNull().default(2),
    severity: integer("severity").notNull().default(2),
    confidence: integer("confidence").notNull().default(3),
    effort: integer("effort").notNull().default(2),
    escalationLevel: integer("escalationLevel").notNull().default(1),
    temporalProximity: integer("temporalProximity").notNull().default(1),
    ownershipPressure: integer("ownershipPressure").notNull().default(1),
    scheduleStartAt: timestamp("scheduleStartAt", { mode: "date" }),
    dueAt: timestamp("dueAt", { mode: "date" }),
    endAt: timestamp("endAt", { mode: "date" }),
    blockedAt: timestamp("blockedAt", { mode: "date" }),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    deprecatedAt: timestamp("deprecatedAt", { mode: "date" }),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    auditOrigin: text("auditOrigin").notNull().default("production"),
  },
  (t) => [
    index("planner_item_organization_lifecycle_idx").on(
      t.organizationId,
      t.lifecycle
    ),
    index("planner_item_owner_lifecycle_idx").on(t.ownerUserId, t.lifecycle),
    index("planner_item_due_at_idx").on(t.dueAt),
    index("planner_item_schedule_start_at_idx").on(t.scheduleStartAt),
    index("planner_item_source_signal_id_idx").on(t.sourceSignalId),
  ]
)

export const plannerAssignment = pgTable(
  "planner_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    subjectUserId: text("subjectUserId"),
    subjectLabel: text("subjectLabel"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_assignment_item_id_idx").on(t.itemId),
    index("planner_assignment_role_subject_idx").on(t.role, t.subjectUserId),
  ]
)

export const plannerSchedule = pgTable(
  "planner_schedule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    scheduledStartAt: timestamp("scheduledStartAt", { mode: "date" }),
    scheduledEndAt: timestamp("scheduledEndAt", { mode: "date" }),
    snoozedUntil: timestamp("snoozedUntil", { mode: "date" }),
    timeZone: text("timeZone"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_schedule_item_id_idx").on(t.itemId),
    index("planner_schedule_start_idx").on(t.scheduledStartAt),
  ]
)

export const plannerRelation = pgTable(
  "planner_relation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    relatedItemId: text("relatedItemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    relatedSignalId: text("relatedSignalId").references(
      () => plannerSignal.id,
      {
        onDelete: "cascade",
      }
    ),
    relationType: text("relationType").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_relation_item_id_idx").on(t.itemId),
    index("planner_relation_related_item_id_idx").on(t.relatedItemId),
    index("planner_relation_related_signal_id_idx").on(t.relatedSignalId),
  ]
)

export const plannerLink = pgTable(
  "planner_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    module: text("module").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    displayLabel: text("displayLabel").notNull(),
    href: text("href"),
    causalityReason: text("causalityReason"),
    temporalContext: jsonb("temporalContext"),
    auditContext: jsonb("auditContext"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_link_organization_idx").on(t.organizationId),
    index("planner_link_owner_idx").on(t.ownerUserId),
    index("planner_link_item_id_idx").on(t.itemId),
    index("planner_link_signal_id_idx").on(t.signalId),
    index("planner_link_module_entity_idx").on(
      t.module,
      t.entityType,
      t.entityId
    ),
  ]
)

export const plannerReminder = pgTable(
  "planner_reminder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    remindAt: timestamp("remindAt", { mode: "date" }).notNull(),
    status: text("status").notNull().default("pending"),
    snoozedUntil: timestamp("snoozedUntil", { mode: "date" }),
    deliveredAt: timestamp("deliveredAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_reminder_item_id_idx").on(t.itemId),
    index("planner_reminder_status_remind_at_idx").on(t.status, t.remindAt),
  ]
)

export const plannerRecurrence = pgTable(
  "planner_recurrence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    rrule: text("rrule").notNull(),
    timeZone: text("timeZone"),
    nextRunAt: timestamp("nextRunAt", { mode: "date" }),
    lastRunAt: timestamp("lastRunAt", { mode: "date" }),
    pausedAt: timestamp("pausedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_recurrence_item_id_idx").on(t.itemId),
    index("planner_recurrence_next_run_at_idx").on(t.nextRunAt),
  ]
)

export const plannerSession = pgTable(
  "planner_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    summary: text("summary"),
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    endedAt: timestamp("endedAt", { mode: "date" }),
    pausedAt: timestamp("pausedAt", { mode: "date" }),
    durationMinutes: integer("durationMinutes"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_session_organization_status_idx").on(
      t.organizationId,
      t.status
    ),
    index("planner_session_owner_status_idx").on(t.ownerUserId, t.status),
    index("planner_session_item_id_idx").on(t.itemId),
    index("planner_session_started_at_idx").on(t.startedAt),
  ]
)

export const plannerActivity = pgTable(
  "planner_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    activityType: text("activityType").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata"),
    authorUserId: text("authorUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_activity_item_id_created_at_idx").on(t.itemId, t.createdAt),
    index("planner_activity_signal_id_created_at_idx").on(
      t.signalId,
      t.createdAt
    ),
  ]
)

export const plannerComment = pgTable(
  "planner_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_comment_item_id_created_at_idx").on(t.itemId, t.createdAt),
  ]
)

export const plannerAttachment = pgTable(
  "planner_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    contentSha256: text("contentSha256").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("planner_attachment_item_id_idx").on(t.itemId)]
)

export const plannerView = pgTable(
  "planner_view",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    surface: text("surface").notNull(),
    filterState: jsonb("filterState"),
    sortMode: text("sortMode"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("planner_view_org_slug_uidx")
      .on(t.organizationId, t.slug)
      .where(sql`${t.organizationId} IS NOT NULL`),
    uniqueIndex("planner_view_owner_slug_uidx")
      .on(t.ownerUserId, t.slug)
      .where(sql`${t.ownerUserId} IS NOT NULL`),
  ]
)

export const plannerRankingSnapshot = pgTable(
  "planner_ranking_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    displayPriority: text("displayPriority").notNull(),
    pressureScore: integer("pressureScore").notNull(),
    dimensions: jsonb("dimensions"),
    snapshotAt: timestamp("snapshotAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("planner_ranking_snapshot_item_idx").on(t.itemId, t.snapshotAt),
    index("planner_ranking_snapshot_signal_idx").on(t.signalId, t.snapshotAt),
  ]
)

export const plannerPressureSnapshot = pgTable(
  "planner_pressure_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    summary: jsonb("summary"),
    snapshotAt: timestamp("snapshotAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("planner_pressure_snapshot_organization_idx").on(
      t.organizationId,
      t.snapshotAt
    ),
    index("planner_pressure_snapshot_owner_idx").on(
      t.ownerUserId,
      t.snapshotAt
    ),
  ]
)

/** Knowledge ingestion sources (`0010_knowledge_sources_and_evals.sql`). */
export const knowledgeSource = pgTable(
  "knowledge_source",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_source_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("knowledge_source_organization_id_enabled_idx").on(
      t.organizationId,
      t.enabled
    ),
  ]
)

export const knowledgeDocument = pgTable(
  "knowledge_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    sourceId: text("sourceId")
      .notNull()
      .references(() => knowledgeSource.id, { onDelete: "cascade" }),
    externalId: text("externalId").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    inputDigest: text("inputDigest").notNull(),
    tokenCount: integer("tokenCount").notNull().default(0),
    embeddingModelVersion: text("embeddingModelVersion"),
    lastEmbeddedAt: timestamp("lastEmbeddedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_document_source_external_uidx").on(
      t.sourceId,
      t.externalId
    ),
    index("knowledge_document_organization_id_source_id_idx").on(
      t.organizationId,
      t.sourceId
    ),
    index("knowledge_document_organization_id_updatedAt_idx").on(
      t.organizationId,
      t.updatedAt
    ),
  ]
)

export const knowledgeOrgSetting = pgTable(
  "knowledge_org_setting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    retrievalHybridEnabled: boolean("retrievalHybridEnabled")
      .notNull()
      .default(false),
    retrievalRerankEnabled: boolean("retrievalRerankEnabled")
      .notNull()
      .default(false),
    enforceZdr: boolean("enforceZdr").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_org_setting_organization_uidx").on(t.organizationId),
  ]
)

export const knowledgeEvalSet = pgTable(
  "knowledge_eval_set",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_set_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
  ]
)

export const knowledgeEvalCase = pgTable(
  "knowledge_eval_case",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    evalSetId: text("evalSetId")
      .notNull()
      .references(() => knowledgeEvalSet.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    expectedEvidenceIds: jsonb("expectedEvidenceIds")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    expectedAnswerSubstring: text("expectedAnswerSubstring"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_case_eval_set_id_created_at_idx").on(
      t.evalSetId,
      t.createdAt
    ),
  ]
)

export const knowledgeOrgCredential = pgTable(
  "knowledge_org_credential",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    provider: text("provider").notNull(),
    cipherText: text("cipherText").notNull(),
    cipherIv: text("cipherIv").notNull(),
    cipherTag: text("cipherTag").notNull(),
    keyVersion: integer("keyVersion").notNull().default(1),
    state: text("state").notNull().default("active"),
    enabled: boolean("enabled").notNull().default(true),
    lastRotatedAt: timestamp("lastRotatedAt", { mode: "date" }),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_org_credential_org_provider_uidx").on(
      t.organizationId,
      t.provider
    ),
  ]
)

export const orgBotLink = pgTable(
  "org_bot_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    platform: text("platform").notNull(),
    externalWorkspaceId: text("externalWorkspaceId"),
    externalRepository: text("externalRepository"),
    externalInstallationId: text("externalInstallationId"),
    enabled: boolean("enabled").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    displayName: text("displayName"),
    lastTestedAt: timestamp("lastTestedAt", { mode: "date" }),
    lastTestStatus: text("lastTestStatus"),
    lastTestError: text("lastTestError"),
  },
  (t) => [
    index("org_bot_link_organization_id_platform_idx").on(
      t.organizationId,
      t.platform
    ),
  ]
)

export const knowledgeEvalRun = pgTable(
  "knowledge_eval_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    evalSetId: text("evalSetId")
      .notNull()
      .references(() => knowledgeEvalSet.id, { onDelete: "cascade" }),
    topK: integer("topK").notNull(),
    retrievalMode: text("retrievalMode").notNull(),
    totalCases: integer("totalCases").notNull().default(0),
    recallAtK: decimal("recallAtK", { precision: 5, scale: 4 }).notNull(),
    meanReciprocalRank: decimal("meanReciprocalRank", {
      precision: 5,
      scale: 4,
    }).notNull(),
    evidenceOverlap: decimal("evidenceOverlap", {
      precision: 5,
      scale: 4,
    }).notNull(),
    durationMs: integer("durationMs").notNull().default(0),
    createdByUserId: text("createdByUserId"),
    judgeModel: text("judgeModel"),
    judgeScore: decimal("judgeScore", { precision: 5, scale: 4 }),
    judgeMetadata: jsonb("judgeMetadata").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_run_organization_eval_set_createdAt_idx").on(
      t.organizationId,
      t.evalSetId,
      t.createdAt
    ),
  ]
)

/** Org-scoped knowledge chunks with pgvector embeddings (+ optional document lineage). */
export const knowledgeChunk = pgTable(
  "knowledge_chunk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    documentId: text("documentId").references(() => knowledgeDocument.id, {
      onDelete: "set null",
    }),
    chunkIndex: integer("chunkIndex"),
    tokenCount: integer("tokenCount"),
    embeddingModelVersion: text("embeddingModelVersion"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
  },
  (t) => [
    index("knowledge_chunk_organization_id_idx").on(t.organizationId),
    index("knowledge_chunk_organization_document_idx").on(
      t.organizationId,
      t.documentId
    ),
    index("knowledge_chunk_embedding_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  ]
)

/** Append-only operator product feedback per organization (L1 utility bar). */
export const orgFeedbackEvent = pgTable(
  "org_feedback_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    organizationId: text("organizationId").notNull(),
    actorUserId: text("actorUserId").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull().default("normal"),
    message: text("message").notNull(),
    path: text("path"),
    userAgent: text("userAgent"),
    metadata: text("metadata"),
    /** Inbox lifecycle: new → acknowledged → resolved | rejected */
    state: text("state").notNull().default("new"),
    acknowledgedByUserId: text("acknowledgedByUserId"),
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    resolvedByUserId: text("resolvedByUserId"),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    resolutionNote: text("resolutionNote"),
  },
  (t) => [
    index("org_feedback_event_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("org_feedback_event_organizationId_state_createdAt_idx").on(
      t.organizationId,
      t.state,
      t.createdAt
    ),
    index("org_feedback_event_actorUserId_createdAt_idx").on(
      t.actorUserId,
      t.createdAt
    ),
  ]
)

/** Org-wide broadcast notice for the Nexus notifications center. */
export const orgNotificationNotice = pgTable(
  "org_notification_notice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    source: text("source").notNull().default("admin"),
    createdByUserId: text("createdByUserId"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity").notNull().default("info"),
    targetUserId: text("targetUserId"),
    linkedEntityType: text("linkedEntityType"),
    linkedEntityId: text("linkedEntityId"),
    linkedEntityLabel: text("linkedEntityLabel"),
    linkedPath: text("linkedPath"),
    publishedAt: timestamp("publishedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_notification_notice_organization_publishedAt_idx").on(
      t.organizationId,
      t.publishedAt
    ),
    index("org_notification_notice_organization_closedAt_idx").on(
      t.organizationId,
      t.closedAt
    ),
    index("org_notification_notice_targetUser_publishedAt_idx").on(
      t.organizationId,
      t.targetUserId,
      t.publishedAt
    ),
    index("org_notification_notice_linkedEntity_idx").on(
      t.organizationId,
      t.linkedEntityType,
      t.linkedEntityId
    ),
  ]
)

/** Per-operator read and acknowledgement state for org notifications. */
export const orgNotificationReceipt = pgTable(
  "org_notification_receipt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    noticeId: text("noticeId")
      .notNull()
      .references(() => orgNotificationNotice.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    readAt: timestamp("readAt", { mode: "date" }),
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_notification_receipt_notice_user_uidx").on(
      t.noticeId,
      t.userId
    ),
    index("org_notification_receipt_user_createdAt_idx").on(
      t.userId,
      t.createdAt
    ),
  ]
)

/** Operational coordination context — org-scoped discussion attached to work. */
export const orgCoordinationContext = pgTable(
  "org_coordination_context",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    subject: text("subject"),
    linkedEntityType: text("linkedEntityType"),
    linkedEntityId: text("linkedEntityId"),
    linkedEntityLabel: text("linkedEntityLabel"),
    linkedEntityPath: text("linkedEntityPath"),
    lastActivityAt: timestamp("lastActivityAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_coordination_context_organization_lastActivityAt_idx").on(
      t.organizationId,
      t.lastActivityAt
    ),
    index("org_coordination_context_createdByUserId_createdAt_idx").on(
      t.createdByUserId,
      t.createdAt
    ),
    index("org_coordination_context_linkedEntity_idx").on(
      t.organizationId,
      t.linkedEntityType,
      t.linkedEntityId
    ),
  ]
)

/** Per-operator membership + unread/read state for an org coordination context. */
export const orgCoordinationOperator = pgTable(
  "org_coordination_operator",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextId: text("contextId")
      .notNull()
      .references(() => orgCoordinationContext.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    lastReadAt: timestamp("lastReadAt", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("org_coordination_operator_context_user_uidx").on(
      t.contextId,
      t.userId
    ),
    index("org_coordination_operator_user_joinedAt_idx").on(
      t.userId,
      t.joinedAt
    ),
  ]
)

/** Activity stream for a coordination context — comments, evidence, and status notes. */
export const orgCoordinationActivity = pgTable(
  "org_coordination_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextId: text("contextId")
      .notNull()
      .references(() => orgCoordinationContext.id, { onDelete: "cascade" }),
    organizationId: text("organizationId").notNull(),
    authorUserId: text("authorUserId").notNull(),
    kind: text("kind").notNull().default("comment"),
    body: text("body").notNull().default(""),
    evidence: jsonb("evidence")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_coordination_activity_contextId_createdAt_idx").on(
      t.contextId,
      t.createdAt
    ),
    index("org_coordination_activity_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
  ]
)

/** Org-scoped chat rooms (direct or group) — durable source of truth; realtime fan-out via Ably. */
export const messengerRoom = pgTable(
  "messenger_room",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    lastMessageAt: timestamp("lastMessageAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messenger_room_organizationId_lastMessageAt_idx").on(
      t.organizationId,
      t.lastMessageAt
    ),
    check("messenger_room_kind_chk", sql`${t.kind} IN ('direct', 'group')`),
  ]
)

export const messengerRoomMember = pgTable(
  "messenger_room_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text("roomId")
      .notNull()
      .references(() => messengerRoom.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    lastReadAt: timestamp("lastReadAt", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("messenger_room_member_roomId_userId_uidx").on(
      t.roomId,
      t.userId
    ),
    index("messenger_room_member_userId_lastReadAt_idx").on(
      t.userId,
      t.lastReadAt
    ),
  ]
)

export const messengerMessage = pgTable(
  "messenger_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text("roomId")
      .notNull()
      .references(() => messengerRoom.id, { onDelete: "cascade" }),
    organizationId: text("organizationId").notNull(),
    authorUserId: text("authorUserId").notNull(),
    body: text("body").notNull().default(""),
    editedAt: timestamp("editedAt", { mode: "date" }),
    deletedAt: timestamp("deletedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    ablyMessageSerial: text("ablyMessageSerial"),
  },
  (t) => [
    index("messenger_message_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("messenger_message_roomId_createdAt_idx").on(t.roomId, t.createdAt),
  ]
)

/**
 * Demo dataset for Lynx **natural language → SQL** (Vercel Labs pattern).
 * Org-scoped only; guarded execution allowlists this table in `nl-sql-demo-guard`.
 */
export const lynxDemoUnicorn = pgTable(
  "lynx_demo_unicorn",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    company: text("company").notNull(),
    valuation: decimal("valuation", { precision: 10, scale: 2 }).notNull(),
    dateJoined: date("dateJoined", { mode: "date" }),
    country: text("country").notNull(),
    city: text("city").notNull(),
    industry: text("industry").notNull(),
    selectInvestors: text("selectInvestors").notNull(),
  },
  (t) => [
    index("lynx_demo_unicorn_organization_id_idx").on(t.organizationId),
    uniqueIndex("lynx_demo_unicorn_org_company_uidx").on(
      t.organizationId,
      t.company
    ),
  ]
)

/** Job grade ladder — Phase 1A workforce scaffolding (`erp.hrm.*` mutations ship in later slices for catalog CRUD). */
export const hrmJobGrade = pgTable(
  "hrm_job_grade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ordinal: integer("ordinal").notNull().default(0),
    minSalaryAmount: decimal("minSalaryAmount", { precision: 15, scale: 2 }),
    maxSalaryAmount: decimal("maxSalaryAmount", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("MYR"),
    benefitTierCode: text("benefitTierCode"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_job_grade_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_job_grade_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
    index("hrm_job_grade_organizationId_ordinal_idx").on(
      t.organizationId,
      t.ordinal
    ),
  ]
)

/** Department tree — `headEmployeeId` intentionally has no FK until workforce graph is fully wired (avoids circular DDL). */
export const hrmDepartment = pgTable(
  "hrm_department",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    orgUnitType: text("orgUnitType").notNull().default("department"),
    parentDepartmentId: text("parentDepartmentId"),
    headEmployeeId: text("headEmployeeId"),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    foreignKey({
      columns: [t.parentDepartmentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_department_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_department_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
    index("hrm_department_organizationId_parentDepartmentId_idx").on(
      t.organizationId,
      t.parentDepartmentId
    ),
  ]
)

export const hrmPosition = pgTable(
  "hrm_position",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    departmentId: text("departmentId")
      .notNull()
      .references(() => hrmDepartment.id),
    defaultGradeId: text("defaultGradeId").references(() => hrmJobGrade.id),
    reportsToPositionId: text("reportsToPositionId"),
    employmentType: text("employmentType").notNull().default("permanent"),
    headcountBudget: integer("headcountBudget"),
    /** Lifecycle: active | planned | frozen | closed (HRM-ORG-010). */
    positionStatus: text("positionStatus").notNull().default("active"),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    foreignKey({
      columns: [t.reportsToPositionId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_position_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_position_organizationId_departmentId_idx").on(
      t.organizationId,
      t.departmentId
    ),
    index("hrm_position_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
    index("hrm_position_organizationId_reportsToPositionId_idx").on(
      t.organizationId,
      t.reportsToPositionId
    ),
  ]
)

/**
 * Workforce master — Phase 1A CRUD surface (contracts / payroll profile / documents ship in 1B).
 * PII columns exist for operational truth; never copy raw identifiers into IAM audit `metadata`.
 */
export const hrmEmployee = pgTable(
  "hrm_employee",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeNumber: text("employeeNumber").notNull(),
    legalName: text("legalName").notNull(),
    preferredName: text("preferredName"),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    gender: text("gender"),
    nationality: text("nationality"),
    idDocumentType: text("idDocumentType"),
    idDocumentNumber: text("idDocumentNumber"),
    email: text("email"),
    phone: text("phone"),
    address: jsonb("address"),
    countryCode: text("countryCode"),
    workStateCode: text("workStateCode"),
    linkedUserId: text("linkedUserId"),
    employmentStatus: text("employmentStatus").notNull().default("active"),
    employmentStartDate: date("employmentStartDate", { mode: "date" }),
    probationEndDate: date("probationEndDate", { mode: "date" }),
    confirmationDate: date("confirmationDate", { mode: "date" }),
    currentDepartmentId: text("currentDepartmentId").references(
      () => hrmDepartment.id
    ),
    currentPositionId: text("currentPositionId").references(
      () => hrmPosition.id
    ),
    currentJobGradeId: text("currentJobGradeId").references(
      () => hrmJobGrade.id
    ),
    managerEmployeeId: text("managerEmployeeId"),
    /** Secondary reporting line — dotted-line/matrix manager. */
    dottedLineManagerId: text("dottedLineManagerId"),
    /** Cached pointer — updated with {@link hrmEmploymentContract} activation (same transaction). No Drizzle FK (avoids circular init); enforced in SQL migration. */
    currentEmploymentContractId: text("currentEmploymentContractId"),
    /** Classification of the working arrangement. HRM-EMP-REC-007. */
    employmentType: text("employmentType"),
    /** HR business partner / HR owner. HRM-EMP-REC-010. */
    hrOwnerEmployeeId: text("hrOwnerEmployeeId"),
    /** Workforce classification. HRM-EMP-REC-008. */
    workerCategory: text("workerCategory"),
    /** Grading level within the job family. HRM-EMP-REC-008. */
    employeeLevel: text("employeeLevel"),
    suspendedAt: timestamp("suspendedAt", { mode: "date" }),
    suspensionReason: text("suspensionReason"),
    suspensionApprovalReference: text("suspensionApprovalReference"),
    resignationDate: date("resignationDate", { mode: "date" }),
    lastWorkingDate: date("lastWorkingDate", { mode: "date" }),
    retirementDate: date("retirementDate", { mode: "date" }),
    audit7w1h: jsonb("audit7w1h"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    archivedByUserId: text("archivedByUserId"),
    archivedReason: text("archivedReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    foreignKey({
      columns: [t.managerEmployeeId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    foreignKey({
      columns: [t.dottedLineManagerId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_employee_organizationId_employeeNumber_uidx").on(
      t.organizationId,
      t.employeeNumber
    ),
    index("hrm_employee_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
    index("hrm_employee_organizationId_email_idx").on(
      t.organizationId,
      t.email
    ),
    index("hrm_employee_organizationId_currentDepartmentId_idx").on(
      t.organizationId,
      t.currentDepartmentId
    ),
    index("hrm_employee_organizationId_managerEmployeeId_idx").on(
      t.organizationId,
      t.managerEmployeeId
    ),
    index("hrm_employee_organizationId_dottedLineManagerId_idx").on(
      t.organizationId,
      t.dottedLineManagerId
    ),
    index("hrm_employee_organizationId_hrOwnerEmployeeId_idx").on(
      t.organizationId,
      t.hrOwnerEmployeeId
    ),
    index("hrm_employee_organizationId_employmentStatus_idx").on(
      t.organizationId,
      t.employmentStatus
    ),
    index("hrm_employee_organizationId_employmentType_idx").on(
      t.organizationId,
      t.employmentType
    ),
  ]
)

/**
 * Effective-dated employee placement history. The `hrm_employee.current*`
 * columns remain cached compatibility projections during the org-structure
 * remodel; this table becomes the auditable source for placement changes.
 */
export const hrmEmployeeAssignment = pgTable(
  "hrm_employee_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    positionId: text("positionId").references(() => hrmPosition.id, {
      onDelete: "set null",
    }),
    jobGradeId: text("jobGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    managerEmployeeId: text("managerEmployeeId").references(
      () => hrmEmployee.id,
      { onDelete: "set null" }
    ),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    status: text("status").notNull().default("active"),
    reason: text("reason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_employee_assignment_org_employee_effective_idx").on(
      t.organizationId,
      t.employeeId,
      t.effectiveFrom
    ),
    index("hrm_employee_assignment_org_active_idx").on(
      t.organizationId,
      t.status,
      t.effectiveTo
    ),
    index("hrm_employee_assignment_org_department_idx").on(
      t.organizationId,
      t.departmentId
    ),
    index("hrm_employee_assignment_org_position_idx").on(
      t.organizationId,
      t.positionId
    ),
  ]
)

/** Normalized employee personal profile. `hrm_employee` keeps compatibility mirrors during cutover. */
export const hrmEmployeePersonalProfile = pgTable(
  "hrm_employee_personal_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    gender: text("gender"),
    nationality: text("nationality"),
    maritalStatus: text("maritalStatus"),
    /** IETF language tag (e.g. "en", "ms"). HRM-EMP-REC-004. */
    languagePreference: text("languagePreference"),
    primaryIdentityDocumentId: text("primaryIdentityDocumentId"),
    /** Vercel Blob URL for profile photo. HRM-EMP-REC-003. */
    profilePhotoBlobUrl: text("profilePhotoBlobUrl"),
    profilePhotoUpdatedAt: timestamp("profilePhotoUpdatedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_employee_personal_profile_org_employee_uidx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_employee_personal_profile_org_nationality_idx").on(
      t.organizationId,
      t.nationality
    ),
  ]
)

/** Normalized employee contact profile. Sensitive values are redacted in history/audit. */
export const hrmEmployeeContactProfile = pgTable(
  "hrm_employee_contact_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    workEmail: text("workEmail"),
    workPhone: text("workPhone"),
    personalEmail: text("personalEmail"),
    personalPhone: text("personalPhone"),
    address: jsonb("address").$type<Record<string, unknown>>(),
    /** Mailing address when different from residential. HRM-EMP-REC-005. */
    mailingAddress: jsonb("mailingAddress").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_employee_contact_profile_org_employee_uidx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_employee_contact_profile_org_workEmail_idx").on(
      t.organizationId,
      t.workEmail
    ),
    index("hrm_employee_contact_profile_org_personalEmail_idx").on(
      t.organizationId,
      t.personalEmail
    ),
    index("hrm_employee_contact_profile_org_personalPhone_idx").on(
      t.organizationId,
      t.personalPhone
    ),
  ]
)

/** Multi-document employee identity register. Stores raw statutory identifiers; audit callers must redact. */
export const hrmEmployeeIdentityDocument = pgTable(
  "hrm_employee_identity_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    documentType: text("documentType").notNull(),
    documentNumber: text("documentNumber").notNull(),
    issuingCountry: text("issuingCountry").notNull(),
    issuedAt: date("issuedAt", { mode: "date" }),
    expiresAt: date("expiresAt", { mode: "date" }),
    isPrimary: boolean("isPrimary").notNull().default(false),
    verificationStatus: text("verificationStatus")
      .notNull()
      .default("unverified"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_employee_identity_document_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_employee_identity_document_org_document_number_idx").on(
      t.organizationId,
      t.documentNumber
    ),
    uniqueIndex("hrm_employee_identity_document_org_employee_primary_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.isPrimary} = true`),
  ]
)

/** Employee work authorization register for country-specific right-to-work evidence. */
export const hrmEmployeeWorkAuthorization = pgTable(
  "hrm_employee_work_authorization",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    countryCode: text("countryCode").notNull(),
    authorizationType: text("authorizationType").notNull(),
    documentNumber: text("documentNumber"),
    issuedAt: date("issuedAt", { mode: "date" }),
    expiresAt: date("expiresAt", { mode: "date" }),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_employee_work_authorization_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_employee_work_authorization_org_country_status_idx").on(
      t.organizationId,
      t.countryCode,
      t.status
    ),
  ]
)

/** HR document vault — Blob URL + payload hash (Phase 1B). */
export const hrmDocument = pgTable(
  "hrm_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId").references(() => hrmEmployee.id, {
      onDelete: "set null",
    }),
    documentType: text("documentType").notNull(),
    subjectKind: text("subjectKind"),
    subjectId: text("subjectId"),
    title: text("title").notNull(),
    blobUrl: text("blobUrl").notNull(),
    payloadHash: text("payloadHash").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    classification: text("classification").notNull().default("internal"),
    retentionPolicyCode: text("retentionPolicyCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    signedByUserId: text("signedByUserId"),
    signedAt: timestamp("signedAt", { mode: "date" }),
    replacedByDocumentId: text("replacedByDocumentId"),
    uploadedByUserId: text("uploadedByUserId"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    /** pending | verified | rejected */
    verificationStatus: text("verificationStatus").notNull().default("pending"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    rejectionReason: text("rejectionReason"),
    versionNumber: integer("versionNumber"),
    isMandatory: boolean("isMandatory").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.replacedByDocumentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    index("hrm_document_organizationId_employeeId_documentType_idx").on(
      t.organizationId,
      t.employeeId,
      t.documentType
    ),
    index("hrm_document_organizationId_subjectKind_subjectId_idx").on(
      t.organizationId,
      t.subjectKind,
      t.subjectId
    ),
    index("hrm_document_organizationId_effectiveTo_idx").on(
      t.organizationId,
      t.effectiveTo
    ),
  ]
)

/** Versioned employment relationship — Phase 1B (draft → signed doc → activate). */
export const hrmEmploymentContract = pgTable(
  "hrm_employment_contract",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    versionNumber: integer("versionNumber").notNull(),
    contractType: text("contractType").notNull(),
    state: text("state").notNull(),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    probationEndDate: date("probationEndDate", { mode: "date" }),
    confirmationDate: date("confirmationDate", { mode: "date" }),
    terminationDate: date("terminationDate", { mode: "date" }),
    terminationReason: text("terminationReason"),
    terminationNoticeDays: integer("terminationNoticeDays"),
    /** Optional checklist progress for onboarding/offboarding milestones (JSON). */
    onboardingChecklist: jsonb("onboardingChecklist"),
    positionId: text("positionId").references(() => hrmPosition.id, {
      onDelete: "set null",
    }),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    jobGradeId: text("jobGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    workingPatternId: text("workingPatternId"),
    baseSalaryAmount: decimal("baseSalaryAmount", { precision: 15, scale: 2 }),
    baseSalaryCurrency: text("baseSalaryCurrency").notNull().default("MYR"),
    payFrequency: text("payFrequency").notNull().default("monthly"),
    normalWorkingHoursPerWeek: decimal("normalWorkingHoursPerWeek", {
      precision: 5,
      scale: 2,
    }),
    signedDocumentId: text("signedDocumentId").references(
      () => hrmDocument.id,
      {
        onDelete: "set null",
      }
    ),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    predictions: jsonb("predictions"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
    /** Contract annex slots (ADR-0015). */
    annexSlots: jsonb("annexSlots"),
  },
  (t) => [
    uniqueIndex(
      "hrm_employment_contract_organizationId_employeeId_version_uidx"
    ).on(t.organizationId, t.employeeId, t.versionNumber),
    uniqueIndex("hrm_employment_contract_org_employee_active_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.state} = 'active'`),
    index(
      "hrm_employment_contract_organizationId_employeeId_effectiveFrom_idx"
    ).on(t.organizationId, t.employeeId, t.effectiveFrom),
    index("hrm_employment_contract_organizationId_state_idx").on(
      t.organizationId,
      t.state
    ),
  ]
)

/** Per-org compensation component catalog (ADR-0015). */
export const hrmCompensationComponent = pgTable(
  "hrm_compensation_component",
  {
    id: text("id").primaryKey().notNull(),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    taxTreatment: text("taxTreatment").notNull().default("taxable"),
    statutoryBaseTreatment: text("statutoryBaseTreatment")
      .notNull()
      .default("included"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_compensation_component_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_compensation_component_organizationId_idx").on(t.organizationId),
  ]
)

/** Per-contract compensation line amounts (ADR-0015). */
export const hrmContractCompensationLine = pgTable(
  "hrm_contract_compensation_line",
  {
    id: text("id").primaryKey().notNull(),
    organizationId: text("organizationId").notNull(),
    contractId: text("contractId")
      .notNull()
      .references(() => hrmEmploymentContract.id, { onDelete: "cascade" }),
    componentId: text("componentId")
      .notNull()
      .references(() => hrmCompensationComponent.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_contract_compensation_line_contract_component_uidx").on(
      t.contractId,
      t.componentId
    ),
    index("hrm_contract_compensation_line_contractId_idx").on(t.contractId),
    index("hrm_contract_compensation_line_organizationId_idx").on(
      t.organizationId
    ),
  ]
)

/** Performance review cycle (org-scoped). */
export const hrmReviewCycle = pgTable(
  "hrm_review_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    periodStart: date("periodStart", { mode: "date" }).notNull(),
    periodEnd: date("periodEnd", { mode: "date" }).notNull(),
    state: text("state").notNull().default("draft"),
    /** `single` = one reviewer submit; `three_stage` = self → manager → HR before final submit. */
    reviewPipeline: text("reviewPipeline").notNull().default("single"),
    activatedAt: timestamp("activatedAt", { mode: "date" }),
    activatedByUserId: text("activatedByUserId"),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [index("hrm_review_cycle_organizationId_idx").on(t.organizationId)]
)

/** Individual performance review row within a cycle. */
export const hrmReview = pgTable(
  "hrm_review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmReviewCycle.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    reviewerId: text("reviewerId").notNull(),
    state: text("state").notNull().default("manager_pending"),
    rating: text("rating"),
    notes: text("notes"),
    selfRating: text("selfRating"),
    selfNotes: text("selfNotes"),
    selfSubmittedAt: timestamp("selfSubmittedAt", { mode: "date" }),
    managerRating: text("managerRating"),
    managerNotes: text("managerNotes"),
    managerSubmittedAt: timestamp("managerSubmittedAt", { mode: "date" }),
    hrRating: text("hrRating"),
    hrNotes: text("hrNotes"),
    hrSubmittedAt: timestamp("hrSubmittedAt", { mode: "date" }),
    /** e.g. text | stars_5 — governs UI copy for staged reviews. */
    ratingScale: text("ratingScale").notNull().default("text"),
    competencyScoresJson: jsonb("competencyScoresJson"),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    cancelledByUserId: text("cancelledByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_review_cycleId_employeeId_uidx").on(
      t.cycleId,
      t.employeeId
    ),
    index("hrm_review_organizationId_cycleId_idx").on(
      t.organizationId,
      t.cycleId
    ),
  ]
)

/** Emergency contacts for an employee. HRM-EMP-REC-006. */
export const hrmEmployeeEmergencyContact = pgTable(
  "hrm_employee_emergency_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    legalName: text("legalName").notNull(),
    relationship: text("relationship").notNull(),
    phone: text("phone").notNull(),
    alternatePhone: text("alternatePhone"),
    email: text("email"),
    isPrimary: boolean("isPrimary").notNull().default(false),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_employee_emergency_contact_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    uniqueIndex("hrm_employee_emergency_contact_org_employee_primary_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.isPrimary} = true AND ${t.archivedAt} IS NULL`),
  ]
)

/** Employee dependents — payroll tax context + HR records (Viet-ERP parity slice). */
export const hrmDependent = pgTable(
  "hrm_dependent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    legalName: text("legalName").notNull(),
    relationship: text("relationship").notNull(),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    taxDependent: boolean("taxDependent").notNull().default(false),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_dependent_organizationId_employeeId_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_dependent_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/** Field-level employee edits — complements IAM audit (structured diff). */
export const hrmEmployeeChangeHistory = pgTable(
  "hrm_employee_change_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    fieldName: text("fieldName").notNull(),
    oldValue: jsonb("oldValue"),
    newValue: jsonb("newValue"),
    changedByUserId: text("changedByUserId").notNull(),
    changedAt: timestamp("changedAt", { mode: "date" }).notNull().defaultNow(),
    effectiveDate: date("effectiveDate", { mode: "date" }),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
  },
  (t) => [
    index("hrm_employee_change_history_org_employee_changedAt_idx").on(
      t.organizationId,
      t.employeeId,
      t.changedAt
    ),
  ]
)

/** Field-level org unit / position edits — complements IAM audit (HRM-ORG-025). */
export const hrmOrgStructureChangeHistory = pgTable(
  "hrm_org_structure_change_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    resourceType: text("resourceType").notNull(),
    resourceId: text("resourceId").notNull(),
    fieldName: text("fieldName").notNull(),
    oldValue: jsonb("oldValue"),
    newValue: jsonb("newValue"),
    changedByUserId: text("changedByUserId").notNull(),
    changedAt: timestamp("changedAt", { mode: "date" }).notNull().defaultNow(),
    effectiveDate: date("effectiveDate", { mode: "date" }),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
  },
  (t) => [
    index("hrm_org_structure_change_history_org_resource_changedAt_idx").on(
      t.organizationId,
      t.resourceType,
      t.resourceId,
      t.changedAt
    ),
  ]
)

/**
 * Authoritative lifecycle history for employment events (HRM-LCY-025/028).
 * Complements field-level {@link hrmEmployeeChangeHistory} for EMP-REC-011/012.
 */
export const hrmLifecycleEvent = pgTable(
  "hrm_lifecycle_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    previousStatus: text("previousStatus"),
    newStatus: text("newStatus"),
    effectiveDate: date("effectiveDate", { mode: "date" }),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    iamAuditEventId: text("iamAuditEventId"),
    actorUserId: text("actorUserId"),
    isEffectiveDated: boolean("isEffectiveDated").notNull().default(false),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
  },
  (t) => [
    index("hrm_lifecycle_event_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_lifecycle_event_org_employee_kind_idx").on(
      t.organizationId,
      t.employeeId,
      t.kind
    ),
    index("hrm_lifecycle_event_org_effective_date_idx").on(
      t.organizationId,
      t.effectiveDate
    ),
  ]
)

/** KPI metric catalog — canonical metric definitions for typed employee scores. */
export const hrmKpiMetric = pgTable(
  "hrm_kpi_metric",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    unit: text("unit").notNull().default("count"),
    valueType: text("valueType").notNull().default("decimal"),
    direction: text("direction").notNull().default("higher_is_better"),
    aggregation: text("aggregation").notNull().default("sum"),
    defaultWeight: decimal("defaultWeight", { precision: 9, scale: 4 })
      .notNull()
      .default("1.0000"),
    state: text("state").notNull().default("active"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    archivedByUserId: text("archivedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_kpi_metric_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_kpi_metric_org_state_idx").on(t.organizationId, t.state),
  ]
)

/** KPI planning period (org-scoped). */
export const hrmKpiPeriod = pgTable(
  "hrm_kpi_period",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    periodStart: date("periodStart", { mode: "date" }).notNull(),
    periodEnd: date("periodEnd", { mode: "date" }).notNull(),
    state: text("state").notNull().default("draft"),
    activatedAt: timestamp("activatedAt", { mode: "date" }),
    activatedByUserId: text("activatedByUserId"),
    lockedAt: timestamp("lockedAt", { mode: "date" }),
    lockedByUserId: text("lockedByUserId"),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    evidenceSnapshot: jsonb("evidenceSnapshot"),
    evidenceHash: text("evidenceHash"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [index("hrm_kpi_period_organizationId_idx").on(t.organizationId)]
)

/** KPI score per employee + metric within a period. */
export const hrmKpiScore = pgTable(
  "hrm_kpi_score",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodId: text("periodId")
      .notNull()
      .references(() => hrmKpiPeriod.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    metricId: text("metricId").references(() => hrmKpiMetric.id, {
      onDelete: "restrict",
    }),
    metricCode: text("metricCode").notNull(),
    targetValue: text("targetValue"),
    achievedValue: text("achievedValue"),
    targetNumeric: decimal("targetNumeric", { precision: 18, scale: 6 }),
    achievedNumeric: decimal("achievedNumeric", { precision: 18, scale: 6 }),
    varianceNumeric: decimal("varianceNumeric", { precision: 18, scale: 6 }),
    scorePercent: decimal("scorePercent", { precision: 9, scale: 4 }),
    weight: decimal("weight", { precision: 9, scale: 4 }),
    weightedScore: decimal("weightedScore", { precision: 18, scale: 6 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_kpi_score_org_period_employee_metric_uidx").on(
      t.organizationId,
      t.periodId,
      t.employeeId,
      t.metricCode
    ),
    index("hrm_kpi_score_organizationId_periodId_idx").on(
      t.organizationId,
      t.periodId
    ),
    index("hrm_kpi_score_org_period_metricId_idx").on(
      t.organizationId,
      t.periodId,
      t.metricId
    ),
  ]
)

/**
 * KPI personal goals (BambooHR-style) — parallel ledger to quantitative KPI scores.
 * Milestones and comments are child rows; `hrm_kpi_metric` / `hrm_kpi_score` remain the scorecard.
 */
export const hrmKpiGoal = pgTable(
  "hrm_kpi_goal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    ownerEmployeeId: text("ownerEmployeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("in_progress"),
    percentComplete: integer("percentComplete").notNull().default(0),
    dueDate: date("dueDate", { mode: "date" }).notNull(),
    completionDate: date("completionDate", { mode: "date" }),
    alignsWithGoalId: text("alignsWithGoalId"),
    sharedWithEmployeeIds: jsonb("sharedWithEmployeeIds")
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId").notNull(),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    foreignKey({
      columns: [t.alignsWithGoalId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    check(
      "hrm_kpi_goal_status_chk",
      sql`${t.status} IN ('in_progress', 'completed', 'closed')`
    ),
    check(
      "hrm_kpi_goal_percent_chk",
      sql`${t.percentComplete} >= 0 AND ${t.percentComplete} <= 100`
    ),
    index("hrm_kpi_goal_org_owner_idx").on(t.organizationId, t.ownerEmployeeId),
    index("hrm_kpi_goal_org_status_idx").on(t.organizationId, t.status),
    index("hrm_kpi_goal_org_dueDate_idx").on(t.organizationId, t.dueDate),
  ]
)

export const hrmKpiGoalMilestone = pgTable(
  "hrm_kpi_goal_milestone",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    goalId: text("goalId")
      .notNull()
      .references(() => hrmKpiGoal.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    startValue: decimal("startValue", { precision: 18, scale: 6 }),
    endValue: decimal("endValue", { precision: 18, scale: 6 }),
    currentValue: decimal("currentValue", { precision: 18, scale: 6 }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_kpi_goal_milestone_org_goal_idx").on(t.organizationId, t.goalId),
  ]
)

export const hrmKpiGoalComment = pgTable(
  "hrm_kpi_goal_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    goalId: text("goalId")
      .notNull()
      .references(() => hrmKpiGoal.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull(),
    commentText: text("commentText").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_kpi_goal_comment_org_goal_createdAt_idx").on(
      t.organizationId,
      t.goalId,
      t.createdAt
    ),
  ]
)

/** Salary advance — repaid via payroll deduction line on period lock. */
export const hrmSalaryAdvance = pgTable(
  "hrm_salary_advance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    reason: text("reason"),
    state: text("state").notNull().default("pending"),
    requestedByUserId: text("requestedByUserId").notNull(),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    decidedByUserId: text("decidedByUserId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    decisionNote: text("decisionNote"),
    repaidAt: timestamp("repaidAt", { mode: "date" }),
    repaidByPayrollLineId: text("repaidByPayrollLineId"),
    /** When set, approval materializes this many installments from `firstPeriodEndIso`. */
    installmentCount: integer("installmentCount"),
    firstPeriodEndIso: date("firstPeriodEndIso"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_advance_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_salary_advance_org_state_idx").on(t.organizationId, t.state),
  ]
)

/** Scheduled repayment slice for an approved salary advance (payroll engine consumes pending rows). */
export const hrmSalaryAdvanceInstallment = pgTable(
  "hrm_salary_advance_installment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    advanceId: text("advanceId")
      .notNull()
      .references(() => hrmSalaryAdvance.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    /** ISO date YYYY-MM-DD — due when periodEnd <= this value. */
    dueAfterPeriodEndIso: date("dueAfterPeriodEndIso").notNull(),
    plannedAmount: decimal("plannedAmount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    /** pending | deducted | cancelled */
    state: text("state").notNull().default("pending"),
    deductedByPayrollLineId: text("deductedByPayrollLineId"),
    deductedAt: timestamp("deductedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_salary_advance_installment_advance_seq_uidx").on(
      t.advanceId,
      t.sequence
    ),
    index("hrm_salary_advance_installment_org_state_idx").on(
      t.organizationId,
      t.state
    ),
    index("hrm_salary_advance_installment_org_advance_due_idx").on(
      t.organizationId,
      t.advanceId,
      t.dueAfterPeriodEndIso
    ),
  ]
)

/** Optional grouping for competency catalog rows. */
export const hrmSkillCategory = pgTable(
  "hrm_skill_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_skill_category_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
  ]
)

/** Org competency catalog — recruitment and performance consume via employee_skill. */
export const hrmSkill = pgTable(
  "hrm_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    categoryId: text("categoryId").references(() => hrmSkillCategory.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_skill_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_skill_org_archived_idx").on(t.organizationId, t.archivedAt),
  ]
)

/** Employee proficiency on a catalog skill (1–5 scale). */
export const hrmEmployeeSkill = pgTable(
  "hrm_employee_skill",
  {
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    skillId: text("skillId")
      .notNull()
      .references(() => hrmSkill.id, { onDelete: "cascade" }),
    proficiency: integer("proficiency").notNull(),
    validityFrom: date("validityFrom").notNull(),
    validityTo: date("validityTo"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.employeeId, t.skillId] }),
    index("hrm_employee_skill_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_employee_skill_org_skill_idx").on(t.organizationId, t.skillId),
    check(
      "hrm_employee_skill_proficiency_range",
      sql`${t.proficiency} >= 1 AND ${t.proficiency} <= 5`
    ),
  ]
)

/**
 * Leave type catalog — org-scoped with Malaysia EA 2023 tier columns (Phase 2A).
 * accrualMethod: 'annual_grant' | 'monthly_accrual' | 'fixed_grant'
 * Three-tier EA shape: tier1Days/tier1MaxYears, tier2Days/tier2MaxYears, tier3Days.
 * Fixed types (hospital, maternity, paternity): use fixedDaysPerYear only.
 */
export const hrmLeaveType = pgTable(
  "hrm_leave_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    accrualMethod: text("accrualMethod").notNull().default("annual_grant"),
    paid: boolean("paid").notNull().default(true),
    genderRestriction: text("genderRestriction"),
    tier1Days: integer("tier1Days"),
    tier1MaxYears: integer("tier1MaxYears"),
    tier2Days: integer("tier2Days"),
    tier2MaxYears: integer("tier2MaxYears"),
    tier3Days: integer("tier3Days"),
    fixedDaysPerYear: integer("fixedDaysPerYear"),
    maxCarryForwardDays: integer("maxCarryForwardDays").notNull().default(0),
    carryForwardExpiryMonths: integer("carryForwardExpiryMonths"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_leave_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_leave_type_org_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/**
 * Effective-dated policy overlay per leave type — org-scoped, admin-gated (Phase 2A).
 * policyVersion is snapshotted onto hrm_leave_entitlement so past computations
 * are not silently mutated when the policy changes.
 */
export const hrmLeavePolicy = pgTable(
  "hrm_leave_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    overrideTier1Days: integer("overrideTier1Days"),
    overrideTier2Days: integer("overrideTier2Days"),
    overrideTier3Days: integer("overrideTier3Days"),
    overrideFixedDays: integer("overrideFixedDays"),
    overrideMaxCarryForward: integer("overrideMaxCarryForward"),
    notes: text("notes"),
    policyVersion: text("policyVersion").notNull().default("custom"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_leave_policy_org_leaveTypeId_idx").on(
      t.organizationId,
      t.leaveTypeId
    ),
    index("hrm_leave_policy_org_effectiveFrom_idx").on(
      t.organizationId,
      t.effectiveFrom
    ),
  ]
)

/**
 * Computed annual leave entitlement per employee (Phase 2A).
 * Written by leave-entitlement-engine; read by leave request actions (Phase 2B).
 * Unique per (org, employee, leave type, year) so the engine can upsert safely.
 * engineInputSnapshot preserves the computation inputs for traceability.
 */
export const hrmLeaveEntitlement = pgTable(
  "hrm_leave_entitlement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    leavePolicyId: text("leavePolicyId").references(() => hrmLeavePolicy.id, {
      onDelete: "set null",
    }),
    entitlementYear: integer("entitlementYear").notNull(),
    daysGranted: decimal("daysGranted", { precision: 6, scale: 2 }).notNull(),
    daysProrated: decimal("daysProrated", { precision: 6, scale: 2 }).notNull(),
    yearsOfServiceAtGrant: decimal("yearsOfServiceAtGrant", {
      precision: 5,
      scale: 2,
    }),
    prorataNumerator: integer("prorataNumerator").notNull().default(12),
    prorataDenominator: integer("prorataDenominator").notNull().default(12),
    basis: text("basis").notNull(),
    engineVersion: text("engineVersion").notNull(),
    engineInputSnapshot: jsonb("engineInputSnapshot"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_leave_entitlement_org_employee_type_year_uidx").on(
      t.organizationId,
      t.employeeId,
      t.leaveTypeId,
      t.entitlementYear
    ),
    index("hrm_leave_entitlement_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_leave_entitlement_org_year_idx").on(
      t.organizationId,
      t.entitlementYear
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 2B — leave request, approval, balance
// ---------------------------------------------------------------------------

/**
 * Generic single-step HR approval record (Phase 2B).
 * subject_kind + subject_id discriminates the domain (leave_request | claim | …).
 * snapshot is immutable — approvers decide on what they saw, not a mutable live record.
 * Deferred: routeCode, routeVersion, currentStep, totalSteps, currentRunId (multi-step only).
 */
export const hrmApproval = pgTable(
  "hrm_approval",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    subjectKind: text("subjectKind").notNull(),
    subjectId: text("subjectId").notNull(),
    state: text("state").notNull().default("pending"),
    requestedByUserId: text("requestedByUserId").notNull(),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    currentApproverUserId: text("currentApproverUserId"),
    decisionByUserId: text("decisionByUserId"),
    decisionAt: timestamp("decisionAt", { mode: "date" }),
    decisionNote: text("decisionNote"),
    snapshot: jsonb("snapshot").notNull().default({}),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_approval_org_state_approver_idx").on(
      t.organizationId,
      t.state,
      t.currentApproverUserId
    ),
    index("hrm_approval_org_subject_idx").on(
      t.organizationId,
      t.subjectKind,
      t.subjectId
    ),
  ]
)

// ---------------------------------------------------------------------------
// Viet-ERP parity: recruitment, offboarding, import sessions, time reports
// (see drizzle/0033_hrm_viet_erp_plan_0033.sql, 0032_hrm_time_report.sql)
// ---------------------------------------------------------------------------

export const hrmJobRequisition = pgTable(
  "hrm_job_requisition",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    title: text("title").notNull(),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    positionId: text("positionId").references(() => hrmPosition.id, {
      onDelete: "set null",
    }),
    headcount: integer("headcount").notNull().default(1),
    status: text("status").notNull().default("draft"),
    approverUserId: text("approverUserId"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_job_requisition_org_status_idx").on(t.organizationId, t.status),
    index("hrm_job_requisition_org_department_idx").on(
      t.organizationId,
      t.departmentId
    ),
    index("hrm_job_requisition_org_position_idx").on(
      t.organizationId,
      t.positionId
    ),
  ]
)

export const hrmCandidate = pgTable(
  "hrm_candidate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    legalName: text("legalName").notNull(),
    email: text("email"),
    phone: text("phone"),
    resumeUrl: text("resumeUrl"),
    source: text("source"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_candidate_org_email_idx").on(t.organizationId, t.email),
    index("hrm_candidate_org_archived_idx").on(t.organizationId, t.archivedAt),
  ]
)

export const hrmApplication = pgTable(
  "hrm_application",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    candidateId: text("candidateId")
      .notNull()
      .references(() => hrmCandidate.id, { onDelete: "restrict" }),
    requisitionId: text("requisitionId")
      .notNull()
      .references(() => hrmJobRequisition.id, { onDelete: "restrict" }),
    stage: text("stage").notNull().default("applied"),
    convertedEmployeeId: text("convertedEmployeeId").references(
      () => hrmEmployee.id,
      { onDelete: "set null" }
    ),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_application_org_candidate_requisition_uidx").on(
      t.organizationId,
      t.candidateId,
      t.requisitionId
    ),
    index("hrm_application_org_stage_idx").on(t.organizationId, t.stage),
    index("hrm_application_org_requisition_idx").on(
      t.organizationId,
      t.requisitionId
    ),
    index("hrm_application_org_converted_employee_idx").on(
      t.organizationId,
      t.convertedEmployeeId
    ),
  ]
)

export const hrmInterview = pgTable(
  "hrm_interview",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    interviewerUserId: text("interviewerUserId").notNull(),
    scheduledAt: timestamp("scheduledAt", { mode: "date" }).notNull(),
    feedback: jsonb("feedback"),
    outcome: text("outcome"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_interview_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
    index("hrm_interview_org_scheduled_idx").on(
      t.organizationId,
      t.scheduledAt
    ),
  ]
)

export const hrmJobOffer = pgTable(
  "hrm_job_offer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    compensationAmount: decimal("compensationAmount", {
      precision: 15,
      scale: 2,
    }),
    compensationCurrency: text("compensationCurrency").notNull().default("MYR"),
    proposedStartDate: date("proposedStartDate", { mode: "date" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    notes: text("notes"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_job_offer_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
    index("hrm_job_offer_org_status_idx").on(t.organizationId, t.status),
    index("hrm_job_offer_org_expires_idx").on(t.organizationId, t.expiresAt),
  ]
)

export const hrmRecruitmentEvent = pgTable(
  "hrm_recruitment_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    subjectKind: text("subjectKind").notNull(),
    subjectId: text("subjectId").notNull(),
    eventType: text("eventType").notNull(),
    fromState: text("fromState"),
    toState: text("toState"),
    actorUserId: text("actorUserId"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_recruitment_event_org_subject_idx").on(
      t.organizationId,
      t.subjectKind,
      t.subjectId
    ),
    index("hrm_recruitment_event_org_created_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("hrm_recruitment_event_org_type_idx").on(
      t.organizationId,
      t.eventType
    ),
  ]
)

export const hrmOffboardingInstance = pgTable(
  "hrm_offboarding_instance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    terminationDate: date("terminationDate", { mode: "date" }).notNull(),
    checklist: jsonb("checklist").notNull(),
    status: text("status").notNull().default("open"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_offboarding_instance_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_offboarding_instance_org_status_idx").on(
      t.organizationId,
      t.status
    ),
  ]
)

export const hrmBoardingTemplate = pgTable(
  "hrm_boarding_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    versionNumber: integer("versionNumber").notNull().default(1),
    appliesTo: jsonb("appliesTo")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_boarding_template_org_kind_code_uidx").on(
      t.organizationId,
      t.kind,
      t.code
    ),
    index("hrm_boarding_template_org_kind_status_idx").on(
      t.organizationId,
      t.kind,
      t.status
    ),
  ]
)

export const hrmBoardingTemplateTask = pgTable(
  "hrm_boarding_template_task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    templateId: text("templateId")
      .notNull()
      .references(() => hrmBoardingTemplate.id, { onDelete: "cascade" }),
    taskKey: text("taskKey").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ownerRole: text("ownerRole"),
    ownerUserId: text("ownerUserId"),
    dueOffsetDays: integer("dueOffsetDays").notNull().default(0),
    required: boolean("required").notNull().default(true),
    category: text("category").notNull().default("hr"),
    sortOrder: integer("sortOrder").notNull().default(0),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_boarding_template_task_org_template_key_uidx").on(
      t.organizationId,
      t.templateId,
      t.taskKey
    ),
    index("hrm_boarding_template_task_org_template_idx").on(
      t.organizationId,
      t.templateId
    ),
  ]
)

export const hrmBoardingInstance = pgTable(
  "hrm_boarding_instance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    contractId: text("contractId").references(() => hrmEmploymentContract.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    templateId: text("templateId").references(() => hrmBoardingTemplate.id, {
      onDelete: "set null",
    }),
    sourceTemplateCode: text("sourceTemplateCode"),
    sourceTemplateVersion: integer("sourceTemplateVersion")
      .notNull()
      .default(1),
    startedAt: timestamp("startedAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_boarding_instance_org_kind_status_idx").on(
      t.organizationId,
      t.kind,
      t.status
    ),
    index("hrm_boarding_instance_org_employee_kind_idx").on(
      t.organizationId,
      t.employeeId,
      t.kind
    ),
    index("hrm_boarding_instance_org_contract_kind_idx").on(
      t.organizationId,
      t.contractId,
      t.kind
    ),
    uniqueIndex("hrm_boarding_instance_org_kind_employee_contract_open_uidx")
      .on(t.organizationId, t.kind, t.employeeId, t.contractId)
      .where(sql`"status" in ('pending', 'in_progress', 'blocked')`),
  ]
)

export const hrmBoardingTask = pgTable(
  "hrm_boarding_task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    instanceId: text("instanceId")
      .notNull()
      .references(() => hrmBoardingInstance.id, { onDelete: "cascade" }),
    templateTaskId: text("templateTaskId").references(
      () => hrmBoardingTemplateTask.id,
      { onDelete: "set null" }
    ),
    taskKey: text("taskKey").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("pending"),
    ownerRole: text("ownerRole"),
    ownerUserId: text("ownerUserId"),
    dueAt: date("dueAt", { mode: "date" }),
    required: boolean("required").notNull().default(true),
    category: text("category").notNull().default("hr"),
    sortOrder: integer("sortOrder").notNull().default(0),
    blockedReason: text("blockedReason"),
    blockedAt: timestamp("blockedAt", { mode: "date" }),
    blockedByUserId: text("blockedByUserId"),
    completedAt: timestamp("completedAt", { mode: "date" }),
    completedByUserId: text("completedByUserId"),
    waivedAt: timestamp("waivedAt", { mode: "date" }),
    waivedByUserId: text("waivedByUserId"),
    waiverReason: text("waiverReason"),
    evidenceDocumentId: text("evidenceDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    evidenceNote: text("evidenceNote"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_boarding_task_org_instance_key_uidx").on(
      t.organizationId,
      t.instanceId,
      t.taskKey
    ),
    index("hrm_boarding_task_org_instance_status_idx").on(
      t.organizationId,
      t.instanceId,
      t.status
    ),
    index("hrm_boarding_task_org_owner_role_status_idx").on(
      t.organizationId,
      t.ownerRole,
      t.status
    ),
    index("hrm_boarding_task_org_due_status_idx").on(
      t.organizationId,
      t.dueAt,
      t.status
    ),
  ]
)

// ---------------------------------------------------------------------------
// HRM Learning & Development (training records — P2-05)
// ---------------------------------------------------------------------------

export const hrmTrainingCategory = pgTable(
  "hrm_training_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_training_category_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
  ]
)

export const hrmTrainingCourse = pgTable(
  "hrm_training_course",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: text("categoryId").references(() => hrmTrainingCategory.id, {
      onDelete: "set null",
    }),
    deliveryMode: text("deliveryMode").notNull().default("classroom"),
    defaultDurationHours: decimal("defaultDurationHours", {
      precision: 9,
      scale: 2,
    }),
    defaultCreditUnits: decimal("defaultCreditUnits", {
      precision: 9,
      scale: 2,
    }),
    statutoryFlag: boolean("statutoryFlag").notNull().default(false),
    statutoryAuthorityCode: text("statutoryAuthorityCode"),
    recertificationIntervalMonths: integer("recertificationIntervalMonths"),
    defaultRequired: boolean("defaultRequired").notNull().default(true),
    state: text("state").notNull().default("draft"),
    grantsSkillId: text("grantsSkillId"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_training_course_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_training_course_org_statutory_idx").on(
      t.organizationId,
      t.statutoryFlag,
      t.statutoryAuthorityCode
    ),
    check(
      "hrm_training_course_delivery_mode_chk",
      sql`${t.deliveryMode} IN ('classroom', 'online', 'external', 'self_paced', 'virtual')`
    ),
    check(
      "hrm_training_course_state_chk",
      sql`${t.state} IN ('draft', 'active', 'archived')`
    ),
  ]
)

/** Ordered prerequisite chain for a course (must complete prereq before assign). */
export const hrmTrainingPrerequisite = pgTable(
  "hrm_training_prerequisite",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    courseId: text("courseId")
      .notNull()
      .references(() => hrmTrainingCourse.id, { onDelete: "cascade" }),
    prerequisiteCourseId: text("prerequisiteCourseId")
      .notNull()
      .references(() => hrmTrainingCourse.id, { onDelete: "restrict" }),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_training_prerequisite_org_course_prereq_uidx").on(
      t.organizationId,
      t.courseId,
      t.prerequisiteCourseId
    ),
    index("hrm_training_prerequisite_org_course_idx").on(
      t.organizationId,
      t.courseId
    ),
  ]
)

export const hrmTrainingSession = pgTable(
  "hrm_training_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    courseId: text("courseId")
      .notNull()
      .references(() => hrmTrainingCourse.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    scheduledStartAt: timestamp("scheduledStartAt", { mode: "date" }).notNull(),
    scheduledEndAt: timestamp("scheduledEndAt", { mode: "date" }).notNull(),
    location: text("location").notNull().default(""),
    meetingUrl: text("meetingUrl"),
    trainerName: text("trainerName"),
    trainerEmail: text("trainerEmail"),
    vendorOrgId: text("vendorOrgId"),
    capacity: integer("capacity"),
    state: text("state").notNull().default("scheduled"),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_training_session_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_training_session_org_course_start_idx").on(
      t.organizationId,
      t.courseId,
      t.scheduledStartAt
    ),
    index("hrm_training_session_org_open_state_idx")
      .on(t.organizationId, t.state)
      .where(sql`"state" IN ('scheduled', 'in_progress')`),
    check(
      "hrm_training_session_end_after_start_chk",
      sql`"scheduledEndAt" > "scheduledStartAt"`
    ),
    check(
      "hrm_training_session_state_chk",
      sql`${t.state} IN ('scheduled', 'in_progress', 'completed', 'cancelled')`
    ),
  ]
)

export const hrmTrainingAssignment = pgTable(
  "hrm_training_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    courseId: text("courseId")
      .notNull()
      .references(() => hrmTrainingCourse.id, { onDelete: "restrict" }),
    sessionId: text("sessionId").references(() => hrmTrainingSession.id, {
      onDelete: "set null",
    }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assignedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    dueAt: timestamp("dueAt", { mode: "date" }),
    required: boolean("required").notNull().default(true),
    state: text("state").notNull().default("assigned"),
    attendance: text("attendance"),
    priority: text("priority").notNull().default("normal"),
    sourceKind: text("sourceKind").notNull().default("manual"),
    sourceReference: text("sourceReference"),
    createdByUserId: text("createdByUserId"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_training_assignment_org_course_emp_assigned_uidx").on(
      t.organizationId,
      t.courseId,
      t.employeeId,
      t.assignedAt
    ),
    index("hrm_training_assignment_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_training_assignment_org_course_state_idx").on(
      t.organizationId,
      t.courseId,
      t.state
    ),
    index("hrm_training_assignment_org_session_idx").on(
      t.organizationId,
      t.sessionId
    ),
    index("hrm_training_assignment_org_due_assigned_idx")
      .on(t.organizationId, t.dueAt)
      .where(sql`"state" = 'assigned'`),
    check(
      "hrm_training_assignment_state_chk",
      sql`${t.state} IN ('assigned', 'completed', 'waived', 'cancelled', 'overdue')`
    ),
    check(
      "hrm_training_assignment_attendance_chk",
      sql`${t.attendance} IS NULL OR ${t.attendance} IN ('present', 'absent', 'excused')`
    ),
    check(
      "hrm_training_assignment_priority_chk",
      sql`${t.priority} IN ('low', 'normal', 'high', 'statutory')`
    ),
    check(
      "hrm_training_assignment_source_kind_chk",
      sql`${t.sourceKind} IN ('manual', 'onboarding', 'recertification', 'compliance_cycle', 'session_roster')`
    ),
  ]
)

export const hrmTrainingRecord = pgTable(
  "hrm_training_record",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    assignmentId: text("assignmentId").references(
      () => hrmTrainingAssignment.id,
      {
        onDelete: "set null",
      }
    ),
    sessionId: text("sessionId").references(() => hrmTrainingSession.id, {
      onDelete: "set null",
    }),
    courseId: text("courseId")
      .notNull()
      .references(() => hrmTrainingCourse.id, { onDelete: "restrict" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    completedAt: date("completedAt", { mode: "date" }).notNull(),
    expiresAt: date("expiresAt", { mode: "date" }),
    instructor: text("instructor"),
    hoursCompleted: decimal("hoursCompleted", { precision: 9, scale: 2 }),
    creditUnits: decimal("creditUnits", { precision: 9, scale: 2 }),
    costAmount: decimal("costAmount", { precision: 15, scale: 2 }),
    costCurrency: text("costCurrency").notNull().default("MYR"),
    certificateDocumentId: text("certificateDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    verificationState: text("verificationState")
      .notNull()
      .default("self_attested"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    feedbackRating: integer("feedbackRating"),
    feedbackText: text("feedbackText"),
    notes: text("notes"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_training_record_org_employee_completed_idx").on(
      t.organizationId,
      t.employeeId,
      t.completedAt
    ),
    index("hrm_training_record_org_expires_idx")
      .on(t.organizationId, t.expiresAt)
      .where(sql`"expiresAt" IS NOT NULL`),
    check(
      "hrm_training_record_verification_state_chk",
      sql`${t.verificationState} IN ('self_attested', 'hr_verified', 'external_verified')`
    ),
    check(
      "hrm_training_record_feedback_rating_chk",
      sql`${t.feedbackRating} IS NULL OR (${t.feedbackRating} >= 1 AND ${t.feedbackRating} <= 5)`
    ),
  ]
)

export const hrmTrainingEvent = pgTable(
  "hrm_training_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    action: text("action").notNull(),
    recordId: text("recordId").references(() => hrmTrainingRecord.id, {
      onDelete: "set null",
    }),
    assignmentId: text("assignmentId").references(
      () => hrmTrainingAssignment.id,
      {
        onDelete: "set null",
      }
    ),
    sessionId: text("sessionId").references(() => hrmTrainingSession.id, {
      onDelete: "set null",
    }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurredAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    actorUserId: text("actorUserId"),
  },
  (t) => [
    index("hrm_training_event_org_employee_occurred_idx").on(
      t.organizationId,
      t.employeeId,
      t.occurredAt
    ),
    uniqueIndex("hrm_training_event_daily_idempotency_uidx")
      .on(
        t.organizationId,
        t.employeeId,
        t.assignmentId,
        t.action,
        sql`date_trunc('day', ${t.occurredAt})`
      )
      .where(sql`"assignmentId" IS NOT NULL`),
    check(
      "hrm_training_event_action_chk",
      sql`${t.action} IN ('assigned', 'completed', 'verified', 'waived', 'expired', 'reassigned', 'cancelled', 'session_closed')`
    ),
  ]
)

export const hrmImportSession = pgTable(
  "hrm_import_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    importType: text("importType").notNull(),
    status: text("status").notNull().default("pending"),
    rowCount: integer("rowCount").notNull().default(0),
    errorJson: jsonb("errorJson"),
    rollbackJson: jsonb("rollbackJson"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_import_session_org_status_idx").on(t.organizationId, t.status),
    index("hrm_import_session_org_type_idx").on(t.organizationId, t.importType),
  ]
)

/**
 * HRM eSignature ceremony header (contract / boarding_task subjects).
 * Phase 2: `mode = provider` + `providerEndpointId` for DocuSign-style adapters.
 */
export const hrmSignatureRequest = pgTable(
  "hrm_signature_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    publicSlug: text("publicSlug").notNull(),
    organizationId: text("organizationId").notNull(),
    schemaVersion: integer("schemaVersion").notNull().default(1),
    kind: text("kind").notNull(),
    subjectType: text("subjectType").notNull(),
    subjectId: text("subjectId").notNull(),
    signingOrder: text("signingOrder").notNull().default("parallel"),
    documentId: text("documentId")
      .notNull()
      .references(() => hrmDocument.id, { onDelete: "restrict" }),
    signedEnvelopeDocumentId: text("signedEnvelopeDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    derivedStatus: text("derivedStatus").notNull().default("draft"),
    mode: text("mode").notNull().default("in_app"),
    providerEndpointId: text("providerEndpointId").references(
      () => orgEventEndpoint.id,
      { onDelete: "set null" }
    ),
    externalReference: text("externalReference"),
    declarationTextHash: text("declarationTextHash").notNull(),
    expirationPeriodDays: integer("expirationPeriodDays"),
    sentAt: timestamp("sentAt", { mode: "date" }),
    lastEventAt: timestamp("lastEventAt", { mode: "date" }),
    voidedAt: timestamp("voidedAt", { mode: "date" }),
    voidReason: text("voidReason"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_signature_request_public_slug_uidx").on(t.publicSlug),
    index("hrm_signature_request_org_derived_status_idx").on(
      t.organizationId,
      t.derivedStatus
    ),
    index("hrm_signature_request_org_kind_subject_idx").on(
      t.organizationId,
      t.kind,
      t.subjectId
    ),
    uniqueIndex("hrm_signature_request_org_kind_subject_open_uidx")
      .on(t.organizationId, t.kind, t.subjectId)
      .where(sql`"derivedStatus" in ('draft', 'sent', 'partially_signed')`),
  ]
)

/** Append-only signature ceremony audit ledger (witness trail). */
export const hrmSignatureEvent = pgTable(
  "hrm_signature_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requestId: text("requestId")
      .notNull()
      .references(() => hrmSignatureRequest.id, { onDelete: "cascade" }),
    partyId: text("partyId"),
    type: text("type").notNull(),
    actorType: text("actorType").notNull(),
    actorUserId: text("actorUserId"),
    actorEmail: text("actorEmail"),
    actorName: text("actorName"),
    userAgent: text("userAgent"),
    ipAddress: text("ipAddress"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    dataHash: text("dataHash").notNull(),
    occurredAt: timestamp("occurredAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("hrm_signature_event_request_occurred_idx").on(
      t.requestId,
      t.occurredAt
    ),
    index("hrm_signature_event_org_occurred_idx").on(
      t.organizationId,
      t.occurredAt
    ),
    index("hrm_signature_event_type_idx").on(t.type),
  ]
)

/** One signer row per ceremony party (token-gated portal access). */
export const hrmSignatureParty = pgTable(
  "hrm_signature_party",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requestId: text("requestId")
      .notNull()
      .references(() => hrmSignatureRequest.id, { onDelete: "cascade" }),
    signerOrder: integer("signerOrder").notNull(),
    signerEmployeeId: text("signerEmployeeId").references(
      () => hrmEmployee.id,
      {
        onDelete: "set null",
      }
    ),
    signerEmail: text("signerEmail").notNull(),
    signerName: text("signerName").notNull(),
    role: text("role").notNull().default("signer"),
    token: text("token").notNull(),
    readStatus: text("readStatus").notNull().default("not_opened"),
    sendStatus: text("sendStatus").notNull().default("not_sent"),
    signingStatus: text("signingStatus").notNull().default("not_signed"),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    sentAt: timestamp("sentAt", { mode: "date" }),
    firstOpenedAt: timestamp("firstOpenedAt", { mode: "date" }),
    signedAt: timestamp("signedAt", { mode: "date" }),
    lastReminderSentAt: timestamp("lastReminderSentAt", { mode: "date" }),
    nextReminderAt: timestamp("nextReminderAt", { mode: "date" }),
    rejectionReason: text("rejectionReason"),
    /** Logical FK to hrm_signature_event.id (set after sign; no DB FK — avoids cycle). */
    signedProofEventId: text("signedProofEventId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_signature_party_token_uidx").on(t.token),
    uniqueIndex("hrm_signature_party_request_signer_order_uidx").on(
      t.requestId,
      t.signerOrder
    ),
    uniqueIndex("hrm_signature_party_request_employee_uidx")
      .on(t.requestId, t.signerEmployeeId)
      .where(sql`"signerEmployeeId" is not null`),
    index("hrm_signature_party_next_reminder_idx").on(t.nextReminderAt),
    index("hrm_signature_party_expires_at_idx").on(t.expiresAt),
    index("hrm_signature_party_request_signing_status_idx").on(
      t.requestId,
      t.signingStatus
    ),
  ]
)

export const hrmTimeReport = pgTable(
  "hrm_time_report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    reportKind: text("reportKind").notNull(),
    workDate: date("workDate", { mode: "string" }),
    overtimeMinutes: integer("overtimeMinutes"),
    tripStartDate: date("tripStartDate", { mode: "string" }),
    tripEndDate: date("tripEndDate", { mode: "string" }),
    destination: text("destination"),
    reason: text("reason"),
    state: text("state").notNull().default("submitted"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      {
        onDelete: "set null",
      }
    ),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_time_report_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_time_report_org_state_kind_idx").on(
      t.organizationId,
      t.state,
      t.reportKind
    ),
  ]
)

/**
 * Leave application state machine (Phase 2B).
 * states: draft → submitted → approved | rejected; approved → taken | cancelled.
 * current_approval_run_id: reserved for Workflow DevKit (Phase 3+) — nullable.
 */
export const hrmLeaveRequest = pgTable(
  "hrm_leave_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }).notNull(),
    durationDays: decimal("durationDays", { precision: 5, scale: 2 }).notNull(),
    halfDay: text("halfDay").notNull().default("none"),
    reason: text("reason"),
    evidenceDocumentId: text("evidenceDocumentId"),
    state: text("state").notNull().default("submitted"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    currentApprovalRunId: text("currentApprovalRunId"),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    policyVersion: text("policyVersion"),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_leave_request_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_leave_request_org_state_start_idx").on(
      t.organizationId,
      t.state,
      t.startDate
    ),
    index("hrm_leave_request_org_leave_type_idx").on(
      t.organizationId,
      t.leaveTypeId
    ),
  ]
)

/**
 * Denormalised leave balance cache per (employee, leave type, year) (Phase 2B).
 * formula: available = opening + entitled + adjusted + carried_forward − taken − pending.
 * Recomputed from scratch on every leave request state change — idempotent.
 */
export const hrmLeaveBalance = pgTable(
  "hrm_leave_balance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    entitlementYear: integer("entitlementYear").notNull(),
    daysEntitled: decimal("daysEntitled", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    daysTaken: decimal("daysTaken", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    daysPending: decimal("daysPending", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    openingDays: decimal("openingDays", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    adjustedDays: decimal("adjustedDays", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    carriedForwardDays: decimal("carriedForwardDays", {
      precision: 6,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lastRecomputedAt: timestamp("lastRecomputedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_leave_balance_unique_idx").on(
      t.organizationId,
      t.employeeId,
      t.leaveTypeId,
      t.entitlementYear
    ),
    index("hrm_leave_balance_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

/** Statutory payroll identifiers — effective-dated rows (Phase 1B). */
export const hrmPayrollProfile = pgTable(
  "hrm_payroll_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    countryCode: text("countryCode").notNull().default("MY"),
    taxResidencyCountry: text("taxResidencyCountry"),
    taxIdentifierType: text("taxIdentifierType"),
    taxIdentifierNumber: text("taxIdentifierNumber"),
    epfNumber: text("epfNumber"),
    socsoNumber: text("socsoNumber"),
    eisEligible: boolean("eisEligible").notNull().default(true),
    pcbCategory: text("pcbCategory"),
    hrdfApplicable: boolean("hrdfApplicable").notNull().default(false),
    bankCode: text("bankCode"),
    bankAccountTokenized: text("bankAccountTokenized"),
    bankAccountHolderName: text("bankAccountHolderName"),
    paySchedule: text("paySchedule").notNull().default("monthly"),
    payCurrency: text("payCurrency").notNull().default("MYR"),
    payrollGroupCode: text("payrollGroupCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    statutoryProfileExtras: jsonb("statutoryProfileExtras"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    uniqueIndex("hrm_payroll_profile_org_employee_current_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.effectiveTo} IS NULL`),
    index("hrm_payroll_profile_organizationId_employeeId_effectiveFrom_idx").on(
      t.organizationId,
      t.employeeId,
      t.effectiveFrom
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 2C: Attendance event stream + daily aggregate
// ---------------------------------------------------------------------------

/** Reusable org-scoped shift policy/catalog. Assignments copy the policy snapshot for payroll-stable history. */
export const hrmShiftTemplate = pgTable(
  "hrm_shift_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** HH:mm, interpreted against the explicit attendanceDate when assigned. */
    defaultStartTime: text("defaultStartTime").notNull(),
    /** HH:mm, end <= start is treated as next-day end when assigned. */
    defaultEndTime: text("defaultEndTime").notNull(),
    unpaidBreakMinutes: integer("unpaidBreakMinutes").notNull().default(0),
    paidBreakMinutes: integer("paidBreakMinutes").notNull().default(0),
    lateGraceMinutes: integer("lateGraceMinutes").notNull().default(0),
    earlyOutGraceMinutes: integer("earlyOutGraceMinutes").notNull().default(0),
    overtimeGraceMinutes: integer("overtimeGraceMinutes").notNull().default(0),
    maxContinuousClockMinutes: integer("maxContinuousClockMinutes")
      .notNull()
      .default(960),
    /** scheduled | skip | paid_holiday */
    holidayBehavior: text("holidayBehavior").notNull().default("scheduled"),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_template_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_shift_template_org_active_idx").on(
      t.organizationId,
      t.isActive,
      t.code
    ),
    check(
      "hrm_shift_template_code_format_chk",
      sql`${t.code} ~ '^[A-Z0-9_]{1,24}$'`
    ),
    check(
      "hrm_shift_template_start_time_format_chk",
      sql`${t.defaultStartTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`
    ),
    check(
      "hrm_shift_template_end_time_format_chk",
      sql`${t.defaultEndTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`
    ),
    check(
      "hrm_shift_template_nonnegative_minutes_chk",
      sql`${t.unpaidBreakMinutes} >= 0 AND ${t.paidBreakMinutes} >= 0 AND ${t.lateGraceMinutes} >= 0 AND ${t.earlyOutGraceMinutes} >= 0 AND ${t.overtimeGraceMinutes} >= 0`
    ),
    check(
      "hrm_shift_template_positive_max_duration_chk",
      sql`${t.maxContinuousClockMinutes} > 0`
    ),
    check(
      "hrm_shift_template_holiday_behavior_chk",
      sql`${t.holidayBehavior} IN ('scheduled', 'skip', 'paid_holiday')`
    ),
  ]
)

/** Exact per-employee shift assignment for one attendance date. */
export const hrmShiftAssignment = pgTable(
  "hrm_shift_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    shiftTemplateId: text("shiftTemplateId")
      .notNull()
      .references(() => hrmShiftTemplate.id, { onDelete: "restrict" }),
    attendanceDate: date("attendanceDate").notNull(),
    scheduledStartAt: timestamp("scheduledStartAt", {
      mode: "date",
    }).notNull(),
    scheduledEndAt: timestamp("scheduledEndAt", { mode: "date" }).notNull(),
    templateCode: text("templateCode").notNull(),
    templateName: text("templateName").notNull(),
    unpaidBreakMinutes: integer("unpaidBreakMinutes").notNull().default(0),
    paidBreakMinutes: integer("paidBreakMinutes").notNull().default(0),
    lateGraceMinutes: integer("lateGraceMinutes").notNull().default(0),
    earlyOutGraceMinutes: integer("earlyOutGraceMinutes").notNull().default(0),
    overtimeGraceMinutes: integer("overtimeGraceMinutes").notNull().default(0),
    maxContinuousClockMinutes: integer("maxContinuousClockMinutes")
      .notNull()
      .default(960),
    holidayBehavior: text("holidayBehavior").notNull().default("scheduled"),
    policySnapshot: jsonb("policySnapshot").notNull(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_assignment_org_employee_date_uidx").on(
      t.organizationId,
      t.employeeId,
      t.attendanceDate
    ),
    index("hrm_shift_assignment_org_date_idx").on(
      t.organizationId,
      t.attendanceDate
    ),
    index("hrm_shift_assignment_org_template_idx").on(
      t.organizationId,
      t.shiftTemplateId
    ),
    check(
      "hrm_shift_assignment_window_order_chk",
      sql`${t.scheduledEndAt} > ${t.scheduledStartAt}`
    ),
    check(
      "hrm_shift_assignment_nonnegative_minutes_chk",
      sql`${t.unpaidBreakMinutes} >= 0 AND ${t.paidBreakMinutes} >= 0 AND ${t.lateGraceMinutes} >= 0 AND ${t.earlyOutGraceMinutes} >= 0 AND ${t.overtimeGraceMinutes} >= 0`
    ),
    check(
      "hrm_shift_assignment_positive_max_duration_chk",
      sql`${t.maxContinuousClockMinutes} > 0`
    ),
    check(
      "hrm_shift_assignment_holiday_behavior_chk",
      sql`${t.holidayBehavior} IN ('scheduled', 'skip', 'paid_holiday')`
    ),
  ]
)

/** Immutable raw attendance event stream. Corrections create new rows (never update). */
export const hrmAttendanceEvent = pgTable(
  "hrm_attendance_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** clock_in | clock_out | break_start | break_end | correction */
    eventType: text("eventType").notNull(),
    occurredAt: timestamp("occurredAt", { mode: "date" }).notNull(),
    /** manual | csv_import | mobile | device */
    source: text("source").notNull(),
    /** import_job_row.id or device receipt */
    sourceRef: text("sourceRef"),
    /** Self-FK; set when eventType = 'correction'. Never updated on the original row. */
    correctionOfEventId: text("correctionOfEventId"),
    correctionReason: text("correctionReason"),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    deviceId: text("deviceId"),
    /** FK-style reference to import_job.id */
    importBatchId: text("importBatchId"),
    rawPayloadHash: text("rawPayloadHash"),
    metadata: jsonb("metadata"),
    checkInIp: text("checkInIp"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_attendance_event_org_emp_occurredAt_idx").on(
      t.organizationId,
      t.employeeId,
      t.occurredAt
    ),
    index("hrm_attendance_event_org_source_batchId_idx").on(
      t.organizationId,
      t.source,
      t.importBatchId
    ),
    index("hrm_attendance_event_org_correctionOf_idx").on(
      t.organizationId,
      t.correctionOfEventId
    ),
  ]
)

/** Computed daily attendance summary — rebuildable from raw events via `attendance-aggregator.server.ts`. */
export const hrmAttendanceDay = pgTable(
  "hrm_attendance_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    attendanceDate: date("attendanceDate").notNull(),
    firstClockInAt: timestamp("firstClockInAt", { mode: "date" }),
    lastClockOutAt: timestamp("lastClockOutAt", { mode: "date" }),
    scheduledMinutes: integer("scheduledMinutes").notNull().default(0),
    workedMinutes: integer("workedMinutes").notNull().default(0),
    breakMinutes: integer("breakMinutes").notNull().default(0),
    lateMinutes: integer("lateMinutes").notNull().default(0),
    earlyOutMinutes: integer("earlyOutMinutes").notNull().default(0),
    overtimeMinutes: integer("overtimeMinutes").notNull().default(0),
    /** Absence code from the leave engine (e.g. "annual", "sick"). */
    absenceCode: text("absenceCode"),
    /** open | computed | locked */
    state: text("state").notNull().default("open"),
    /** FK-style to hrm_payroll_period — set when the day is locked for payroll. */
    lockedByPayrollPeriodId: text("lockedByPayrollPeriodId"),
    /** SHA-256 of sorted contributing event IDs — used for idempotent re-aggregation. */
    derivedFromEventChecksum: text("derivedFromEventChecksum"),
    /** Full snapshot preserved for payroll evidence. */
    calculationSnapshot: jsonb("calculationSnapshot"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_attendance_day_org_emp_date_uidx").on(
      t.organizationId,
      t.employeeId,
      t.attendanceDate
    ),
    index("hrm_attendance_day_org_date_state_idx").on(
      t.organizationId,
      t.attendanceDate,
      t.state
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 3A — Payroll preparation
// ---------------------------------------------------------------------------

/** Monthly payroll cycle envelope. Snapshots rulePackVersion at lock so past periods
 *  recompute identically. State machine: open → preparing → locked → finalized → posted.
 */
export const hrmPayrollPeriod = pgTable(
  "hrm_payroll_period",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** ISO date string "YYYY-MM-DD" — first day of the pay period. */
    periodStart: date("periodStart").notNull(),
    /** ISO date string "YYYY-MM-DD" — last day of the pay period. */
    periodEnd: date("periodEnd").notNull(),
    /** ISO date string "YYYY-MM-DD" — intended payment date. */
    paymentDate: date("paymentDate").notNull(),
    currency: text("currency").notNull().default("MYR"),
    /** open | preparing | locked | finalized | posted */
    state: text("state").notNull().default("open"),
    lockedByUserId: text("lockedByUserId"),
    lockedAt: timestamp("lockedAt", { mode: "date" }),
    /** Workflow DevKit run id set when finalization durable run starts. */
    finalizedRunId: text("finalizedRunId"),
    /** Composite rule pack version snapshot — e.g. "MY-2026-01". Null until period locks. */
    rulePackVersion: text("rulePackVersion"),
    postedByUserId: text("postedByUserId"),
    postedAt: timestamp("postedAt", { mode: "date" }),
    postedJournalBatchId: text("postedJournalBatchId"),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_period_org_start_end_uidx").on(
      t.organizationId,
      t.periodStart,
      t.periodEnd
    ),
    index("hrm_payroll_period_org_state_idx").on(t.organizationId, t.state),
    index("hrm_payroll_period_org_start_idx").on(
      t.organizationId,
      t.periodStart
    ),
  ]
)

/** One payroll computation run per (period, employee). Idempotent via inputDigest.
 *  State: draft → computed → locked. overridden = bureau import path (Phase 4+).
 */
export const hrmPayrollRun = pgTable(
  "hrm_payroll_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodId: text("periodId")
      .notNull()
      .references(() => hrmPayrollPeriod.id, { onDelete: "restrict" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** Contract version active at period end — snapshotted for re-runnable history. */
    contractId: text("contractId").references(() => hrmEmploymentContract.id, {
      onDelete: "restrict",
    }),
    /** Payroll profile active at period end — snapshotted for re-runnable history. */
    profileId: text("profileId").references(() => hrmPayrollProfile.id, {
      onDelete: "restrict",
    }),
    /** draft | computed | locked | overridden */
    state: text("state").notNull().default("draft"),
    grossPay: decimal("grossPay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netPay: decimal("netPay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    employerCost: decimal("employerCost", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    /** SHA-256 of all inputs — recompute only when digest changes. */
    inputDigest: text("inputDigest"),
    computedAt: timestamp("computedAt", { mode: "date" }),
    computedByUserId: text("computedByUserId"),
    /** True when lines were imported from an external bureau rather than computed. */
    overriddenFromBureau: boolean("overriddenFromBureau")
      .notNull()
      .default(false),
    bureauReference: text("bureauReference"),
    /** Array of ValidationIssue objects from rule-pack validateProfile(). */
    validationIssues: jsonb("validationIssues")
      .$type<Array<{ code: string; message: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    compensationSnapshot: jsonb("compensationSnapshot")
      .notNull()
      .default(sql`'[]'::jsonb`),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_run_org_period_employee_uidx").on(
      t.organizationId,
      t.periodId,
      t.employeeId
    ),
    index("hrm_payroll_run_org_period_state_idx").on(
      t.organizationId,
      t.periodId,
      t.state
    ),
    index("hrm_payroll_run_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

/** Granular earning / deduction line for per-line rule-pack traceability.
 *  Provenance field cites the exact composite manifest + per-statutory sub-version
 *  that produced each line — enables byte-identical historical re-runs.
 */
export const hrmPayrollLine = pgTable(
  "hrm_payroll_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    runId: text("runId")
      .notNull()
      .references(() => hrmPayrollRun.id, { onDelete: "cascade" }),
    /** earning | employee_deduction | employer_contribution | tax | adjustment | validation_issue */
    lineKind: text("lineKind").notNull(),
    /** Canonical code: BASIC, EPF_EE, EPF_ER, SOCSO_EE, SOCSO_ER, EIS_EE, EIS_ER, PCB, etc. */
    code: text("code").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    /** Rule-pack provenance: { compositePack, subVersion, table, rowId, categoryCode }. */
    rulePackProvenance:
      jsonb("rulePackProvenance").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    /**
     * Phase 4: optional FK to the `hrm_claim` row this earning settled.
     * Populated by `payroll-finalize.workflow.ts` when an approved unpaid
     * claim falls inside the period — payroll-line carries the claimId so
     * idempotent re-finalization can detect already-paid claims and skip
     * them. Nullable because most lines (BASIC, EPF_EE, PCB, …) have no
     * claim provenance. ON DELETE SET NULL preserves the audit ledger.
     */
    claimId: text("claimId"),
    /** Optional FK when this deduction line repays an approved salary advance. */
    salaryAdvanceId: text("salaryAdvanceId").references(
      () => hrmSalaryAdvance.id,
      { onDelete: "set null" }
    ),
    salaryAdvanceInstallmentId: text("salaryAdvanceInstallmentId").references(
      () => hrmSalaryAdvanceInstallment.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_payroll_line_run_id_idx").on(t.runId),
    index("hrm_payroll_line_org_run_kind_idx").on(
      t.organizationId,
      t.runId,
      t.lineKind
    ),
    index("hrm_payroll_line_org_run_code_idx").on(
      t.organizationId,
      t.runId,
      t.code
    ),
    index("hrm_payroll_line_claim_id_idx").on(t.claimId),
    index("hrm_payroll_line_salary_advance_id_idx").on(t.salaryAdvanceId),
  ]
)

// ---------------------------------------------------------------------------
// Payroll-originated accounting posting foundation
// ---------------------------------------------------------------------------

/**
 * Narrow accounting journal foundation for governed source posting.
 *
 * First slice is intentionally limited to payroll-period posting
 * (`sourceModule=hrm`, `sourceObject=payroll_period`). Lines are stored as a
 * typed JSON payload so one row is sufficient for idempotent serverless
 * posting with Neon HTTP.
 */
export const accountingJournalBatch = pgTable(
  "accounting_journal_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    sourceModule: text("sourceModule").notNull(),
    sourceObject: text("sourceObject").notNull(),
    sourceId: text("sourceId").notNull(),
    reference: text("reference").notNull(),
    currency: text("currency").notNull(),
    sourceHash: text("sourceHash").notNull(),
    closeSnapshotHash: text("closeSnapshotHash").notNull(),
    totalDebits: decimal("totalDebits", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalCredits: decimal("totalCredits", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netBalance: decimal("netBalance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    journalLines: jsonb("journalLines")
      .$type<
        Array<{
          lineNumber: number
          accountCode: string
          accountName: string
          side: "debit" | "credit"
          amount: string
          source: string
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    postedByUserId: text("postedByUserId"),
    postedAt: timestamp("postedAt", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("accounting_journal_batch_org_source_uidx").on(
      t.organizationId,
      t.sourceModule,
      t.sourceObject,
      t.sourceId
    ),
    index("accounting_journal_batch_org_postedAt_idx").on(
      t.organizationId,
      t.postedAt
    ),
    index("accounting_journal_batch_source_idx").on(
      t.sourceModule,
      t.sourceObject,
      t.sourceId
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 4 — Claims (reimbursable expense workflow)
//
// Tables:
//   hrm_claim_type        per-org claim catalog (Travel / Medical / Phone / …)
//   hrm_claim             one claim row per submission (state machine)
//   hrm_claim_evidence    claim ↔ hrm_document linkage with evidence type
//
// State machine:
//   draft → submitted → approved | rejected     (single-step approval reuses
//                                                hrm_approval(subjectKind=claim))
//   submitted → cancelled                       (employee withdraws)
//   approved → paid                             (payroll-finalize.workflow.ts
//                                                writes hrm_payroll_line.claimId
//                                                + flips claim.state = paid)
//
// Audit grammar: erp.hrm.claim.{submit|cancel|approve|reject|attach_evidence|paid}
// ---------------------------------------------------------------------------

/** Per-org reimbursable claim catalog. Owners pin a default payroll-line code
 *  (e.g. ALLOWANCE_TRAVEL) so payroll-finalize knows where to attach the
 *  earnings line; rule-packs can override per country. */
export const hrmClaimType = pgTable(
  "hrm_claim_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** Stable internal code (UPPER_SNAKE_CASE), e.g. TRAVEL, MEDICAL_OUTPATIENT. */
    code: text("code").notNull(),
    /** Operator-facing label. */
    name: text("name").notNull(),
    description: text("description"),
    /** Default payroll-line code emitted when this claim is paid. */
    defaultPayrollLineCode: text("defaultPayrollLineCode")
      .notNull()
      .default("ALLOWANCE_CLAIM"),
    /** ISO-4217 currency for limits + claim amounts (claim row may override). */
    currency: text("currency").notNull().default("MYR"),
    /** Optional per-claim cap; null = no limit. */
    perClaimLimit: decimal("perClaimLimit", { precision: 15, scale: 2 }),
    /** Optional per-calendar-month cap; null = no limit. */
    periodLimit: decimal("periodLimit", { precision: 15, scale: 2 }),
    /** Optional per-calendar-year cap; null = no limit. */
    annualLimit: decimal("annualLimit", { precision: 15, scale: 2 }),
    /** Require evidence when the claim amount is at or above this amount. */
    evidenceRequiredAboveAmount: decimal("evidenceRequiredAboveAmount", {
      precision: 15,
      scale: 2,
    }),
    /** Whether claims of this type require at least one evidence document. */
    requiresEvidence: boolean("requiresEvidence").notNull().default(true),
    /** payroll | ap — payroll remains the default reimbursement path. */
    defaultPayoutMethod: text("defaultPayoutMethod")
      .notNull()
      .default("payroll"),
    defaultFinanceAccountCode: text("defaultFinanceAccountCode"),
    defaultCostCenterCode: text("defaultCostCenterCode"),
    defaultTaxTreatment: text("defaultTaxTreatment")
      .notNull()
      .default("non_taxable_reimbursement"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_claim_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_claim_type_org_active_idx").on(t.organizationId, t.isActive),
  ]
)

export const hrmClaim = pgTable(
  "hrm_claim",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** Human-stable claim reference for audit and finance review. */
    claimNumber: text("claimNumber"),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    claimTypeId: text("claimTypeId")
      .notNull()
      .references(() => hrmClaimType.id, { onDelete: "restrict" }),
    /** Date the expense was incurred (drives payroll-period inclusion). */
    claimDate: date("claimDate", { mode: "string" }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    /** ISO-4217; may diverge from the type default for foreign expenses. */
    currency: text("currency").notNull().default("MYR"),
    description: text("description"),
    /** draft | submitted | approved | rejected | cancelled | paid */
    state: text("state").notNull().default("draft"),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
    submittedByUserId: text("submittedByUserId"),
    /** FK to hrm_approval — single-step approval reuses the generic primitive. */
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    decidedByUserId: text("decidedByUserId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    /** Set by payroll-finalize when claim is paid; FK to the earnings line. */
    paidByPayrollLineId: text("paidByPayrollLineId"),
    paidAt: timestamp("paidAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    cancelledReason: text("cancelledReason"),
    /** Pinned policy version (claim-type snapshot) for re-runnable audits. */
    policyVersion: text("policyVersion"),
    policySnapshot: jsonb("policySnapshot"),
    /** payroll | ap. Payroll-paid claims continue to use hrm_payroll_line.claimId. */
    payoutMethod: text("payoutMethod").notNull().default("payroll"),
    financeAccountCode: text("financeAccountCode"),
    costCenterCode: text("costCenterCode"),
    projectCode: text("projectCode"),
    taxTreatment: text("taxTreatment")
      .notNull()
      .default("non_taxable_reimbursement"),
    expenseFundId: text("expenseFundId"),
    reimbursementMode: text("reimbursementMode"),
    requestedAmount: decimal("requestedAmount", { precision: 15, scale: 2 }),
    approvedAmount: decimal("approvedAmount", { precision: 15, scale: 2 }),
    rejectedAmount: decimal("rejectedAmount", { precision: 15, scale: 2 }),
    offsetAmount: decimal("offsetAmount", { precision: 15, scale: 2 }),
    claimCurrency: text("claimCurrency"),
    reimbursementCurrency: text("reimbursementCurrency"),
    fxRate: decimal("fxRate", { precision: 18, scale: 8 }),
    fxRateAsOf: timestamp("fxRateAsOf", { mode: "date" }),
    fxRateSource: text("fxRateSource"),
    fxSnapshot: jsonb("fxSnapshot"),
    eligibilitySnapshot: jsonb("eligibilitySnapshot"),
    validationFlags: jsonb("validationFlags").$type<string[]>(),
    requiresExceptionApproval: boolean("requiresExceptionApproval")
      .notNull()
      .default(false),
    exceptionApprovedByUserId: text("exceptionApprovedByUserId"),
    exceptionApprovedAt: timestamp("exceptionApprovedAt", { mode: "date" }),
    exceptionReason: text("exceptionReason"),
    duplicateReviewStatus: text("duplicateReviewStatus"),
    returnedReason: text("returnedReason"),
    paymentReference: text("paymentReference"),
    /** Operational temporal spine (Past · Now · Next). */
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_claim_org_claim_number_uidx").on(
      t.organizationId,
      t.claimNumber
    ),
    index("hrm_claim_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_claim_org_submitter_idx").on(
      t.organizationId,
      t.submittedByUserId
    ),
    index("hrm_claim_org_payout_state_idx").on(
      t.organizationId,
      t.payoutMethod,
      t.state
    ),
    index("hrm_claim_org_state_claim_date_idx").on(
      t.organizationId,
      t.state,
      t.claimDate
    ),
    index("hrm_claim_org_paid_line_idx").on(
      t.organizationId,
      t.paidByPayrollLineId
    ),
  ]
)

/** Receipts / invoices / photos attached to a claim. Each row links one claim
 *  to one hrm_document; multiple evidence rows per claim are allowed. */
export const hrmClaimEvidence = pgTable(
  "hrm_claim_evidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    claimId: text("claimId")
      .notNull()
      .references(() => hrmClaim.id, { onDelete: "cascade" }),
    documentId: text("documentId")
      .notNull()
      .references(() => hrmDocument.id, { onDelete: "restrict" }),
    /** receipt | invoice | photo | other */
    evidenceType: text("evidenceType").notNull().default("receipt"),
    notes: text("notes"),
    uploadedByUserId: text("uploadedByUserId"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_claim_evidence_claim_document_uidx").on(
      t.claimId,
      t.documentId
    ),
    index("hrm_claim_evidence_org_claim_idx").on(t.organizationId, t.claimId),
  ]
)

// ---------------------------------------------------------------------------
// Phase 4–5 — Benefits catalog + enrollment + qualifying life events
//
// `hrm_benefit` is a per-org catalog row; `hrm_benefit_enrollment` links an
// employee to a benefit. Payroll-line wiring for benefit deductions remains
// a follow-up once payroll preview absorbs recurring benefit costs.
//
// Audit grammar: erp.hrm.benefit.{create|update|archive|enroll} +
// erp.hrm.benefit.enrollment.{activate|waive|terminate} +
// erp.hrm.benefit.life_event.{record|verify}
// ---------------------------------------------------------------------------

export const hrmBenefit = pgTable(
  "hrm_benefit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** medical | dental | optical | wellness | retirement | other */
    benefitKind: text("benefitKind").notNull().default("other"),
    /** Optional granular subtype (e.g. health_insurance, meal_allowance). */
    benefitType: text("benefitType"),
    benefitCategory: text("benefitCategory"),
    providerId: text("providerId"),
    scopeCountryCodes: jsonb("scopeCountryCodes").$type<string[]>(),
    scopeLegalEntityCodes: jsonb("scopeLegalEntityCodes").$type<string[]>(),
    /** Enterprise plan-year/version metadata; null for legacy/simple plans. */
    planYear: integer("planYear"),
    carrierName: text("carrierName"),
    providerName: text("providerName"),
    policyReference: text("policyReference"),
    eligibilityRules:
      jsonb("eligibilityRules").$type<Record<string, unknown>>(),
    rateTableVersion: text("rateTableVersion"),
    rateTable: jsonb("rateTable").$type<Record<string, unknown>>(),
    employerContributionType: text("employerContributionType")
      .notNull()
      .default("none"),
    employerContributionValue: decimal("employerContributionValue", {
      precision: 15,
      scale: 4,
    }),
    employeeContributionType: text("employeeContributionType")
      .notNull()
      .default("none"),
    employeeContributionValue: decimal("employeeContributionValue", {
      precision: 15,
      scale: 4,
    }),
    /** Allowed coverage levels for enrollments (subset of BENEFIT_COVERAGE_LEVELS). */
    coverageLevels: jsonb("coverageLevels").$type<string[]>(),
    waitingPeriodDays: integer("waitingPeriodDays").notNull().default(0),
    maxAnnualAmount: decimal("maxAnnualAmount", {
      precision: 15,
      scale: 2,
    }),
    effectiveFrom: timestamp("effectiveFrom", { mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_benefit_org_active_idx").on(t.organizationId, t.isActive),
  ]
)

export const hrmBenefitEnrollment = pgTable(
  "hrm_benefit_enrollment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    benefitId: text("benefitId")
      .notNull()
      .references(() => hrmBenefit.id, { onDelete: "restrict" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** pending | active | waived | terminated */
    state: text("state").notNull().default("pending"),
    coverageLevel: text("coverageLevel"),
    effectiveFrom: timestamp("effectiveFrom", { mode: "date" }),
    effectiveTo: timestamp("effectiveTo", { mode: "date" }),
    documentIds: jsonb("documentIds").$type<string[]>().notNull().default([]),
    eligibilityOverrideApprovedByUserId: text(
      "eligibilityOverrideApprovedByUserId"
    ),
    eligibilityOverrideReason: text("eligibilityOverrideReason"),
    employerContributionAmount: decimal("employerContributionAmount", {
      precision: 15,
      scale: 2,
    }),
    employeeContributionAmount: decimal("employeeContributionAmount", {
      precision: 15,
      scale: 2,
    }),
    waivedReason: text("waivedReason"),
    enrolledAt: timestamp("enrolledAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    terminatedAt: timestamp("terminatedAt", { mode: "date" }),
    terminationReason: text("terminationReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_enrollment_org_benefit_employee_active_uidx")
      .on(t.organizationId, t.benefitId, t.employeeId)
      .where(sql`${t.state} in ('pending', 'active')`),
    index("hrm_benefit_enrollment_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_benefit_enrollment_org_state_idx").on(t.organizationId, t.state),
  ]
)

export const hrmBenefitLifeEvent = pgTable(
  "hrm_benefit_life_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    eventType: text("eventType").notNull(),
    eventDate: timestamp("eventDate", { mode: "date" }).notNull(),
    notes: text("notes"),
    /** pending | verified | rejected */
    verificationStatus: text("verificationStatus").notNull().default("pending"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    verificationNote: text("verificationNote"),
    documentIds: jsonb("documentIds").$type<string[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_benefit_life_event_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_benefit_life_event_org_type_idx").on(
      t.organizationId,
      t.eventType
    ),
  ]
)

/** Global registry of composite payroll rule-pack versions.
 *  No organizationId — global across all tenants.
 *  The actual rule code lives in TypeScript files under
 *  data/rule-packs/<country>/ (PR-reviewed, type-checked, append-only).
 */
/**
 * One row per (org, period, countryCode, packType).
 * Generated by payroll-finalize workflow; reproducible from inputHash + rulePackVersion.
 * Tracks submission state through the statutory delivery pipeline.
 */
export const hrmComplianceEvidence = pgTable(
  "hrm_compliance_evidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** FK to payroll period; null for non-period packs (e.g. annual EA). */
    periodId: text("periodId").references(() => hrmPayrollPeriod.id, {
      onDelete: "restrict",
    }),
    /** ISO-2 country code: MY, SG, ID, TH, VN, PH. */
    countryCode: text("countryCode").notNull(),
    /** Pack type discriminator. */
    packType: text("packType").notNull(),
    /** SHA-256 hex of all input run lines that produced this pack. */
    inputHash: text("inputHash").notNull(),
    /** SHA-256 hex of the generated payload bytes. */
    outputHash: text("outputHash").notNull(),
    /** FK to hrm_document where the payload blob is stored. */
    payloadDocumentId: text("payloadDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    /** Pinned composite rule-pack version for re-runnable history. */
    rulePackVersion: text("rulePackVersion").notNull(),
    generatedAt: timestamp("generatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    generatedByUserId: text("generatedByUserId"),
    /** Workflow DevKit run id for durable finalize runs. */
    generatedByRunId: text("generatedByRunId"),
    /** draft | queued | submitted | acknowledged | failed */
    submissionState: text("submissionState").notNull().default("draft"),
    /** FK to org_event_delivery when submitted via outbox. */
    submissionDeliveryId: text("submissionDeliveryId"),
    /** External bureau receipt id (e.g. KWSP acknowledgement number). */
    externalReference: text("externalReference"),
    // ----- Phase 3I: acknowledgement provenance (first-class temporal authority
    // metadata). Populated only on the `submitted -> acknowledged` transition.
    // Future Phase 3J webhook receiver writes the same columns with
    // `acknowledgementSource = 'webhook'` and `acknowledgedByUserId = null`.
    /** When the bureau receipt was recorded (null until acknowledged). */
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    /** Actor who recorded the receipt; null for webhook / system. */
    acknowledgedByUserId: text("acknowledgedByUserId"),
    /** 'manual' | 'webhook' | 'api' | 'import'. App-level enum. */
    acknowledgementSource: text("acknowledgementSource"),
    /**
     * Phase 3J: SHA-256 hex of the bureau's incoming webhook body
     * (canonicalized exactly the way `computePayloadHash` produces it). NULL
     * for manual / future API acknowledgements where there is no bureau-
     * supplied payload to hash. Establishes integrity lineage for disputes.
     */
    authorityPayloadHash: text("authorityPayloadHash"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_compliance_evidence_org_period_country_type_uidx").on(
      t.organizationId,
      t.periodId,
      t.countryCode,
      t.packType
    ),
    index("hrm_compliance_evidence_org_state_generated_idx").on(
      t.organizationId,
      t.submissionState,
      t.generatedAt
    ),
  ]
)

export const hrmComplianceFiling = pgTable(
  "hrm_compliance_filing",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    title: text("title").notNull(),
    filingCategory: text("filingCategory").notNull(),
    countryCode: text("countryCode"),
    legalEntityName: text("legalEntityName"),
    filingAuthority: text("filingAuthority"),
    referenceCode: text("referenceCode"),
    dueDate: date("dueDate", { mode: "date" }).notNull(),
    coveragePeriod: text("coveragePeriod"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
    submittedByUserId: text("submittedByUserId"),
    confirmedAt: timestamp("confirmedAt", { mode: "date" }),
    confirmationReference: text("confirmationReference"),
    evidenceDocumentId: text("evidenceDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    waiverReason: text("waiverReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_compliance_filing_org_status_due_idx").on(
      t.organizationId,
      t.status,
      t.dueDate
    ),
  ]
)

export const hrmComplianceException = pgTable(
  "hrm_compliance_exception",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId").references(() => hrmEmployee.id, {
      onDelete: "set null",
    }),
    complianceArea: text("complianceArea").notNull(),
    itemType: text("itemType").notNull(),
    sourceReferenceId: text("sourceReferenceId"),
    title: text("title").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("open"),
    correctiveActionOwnerUserId: text("correctiveActionOwnerUserId"),
    correctiveActionDueDate: date("correctiveActionDueDate", { mode: "date" }),
    correctiveActionDescription: text("correctiveActionDescription"),
    isAutoGenerated: boolean("isAutoGenerated").notNull().default(false),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    resolvedByUserId: text("resolvedByUserId"),
    waivedAt: timestamp("waivedAt", { mode: "date" }),
    waivedByUserId: text("waivedByUserId"),
    waiverReason: text("waiverReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_compliance_exception_org_status_idx").on(
      t.organizationId,
      t.status
    ),
    index("hrm_compliance_exception_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

export const hrmPolicyAcknowledgement = pgTable(
  "hrm_policy_acknowledgement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    policyId: text("policyId").notNull(),
    policyVersion: text("policyVersion").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_policy_ack_org_employee_policy_version_uidx").on(
      t.organizationId,
      t.employeeId,
      t.policyId,
      t.policyVersion
    ),
  ]
)

export const hrmExpenseFund = pgTable(
  "hrm_expense_fund",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("MYR"),
    fundKind: text("fundKind").notNull().default("petty_cash"),
    state: text("state").notNull().default("active"),
    custodianEmployeeId: text("custodianEmployeeId").references(
      () => hrmEmployee.id,
      { onDelete: "set null" }
    ),
    floatLimit: decimal("floatLimit", { precision: 15, scale: 2 }),
    currentBalance: decimal("currentBalance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    defaultCostCenterCode: text("defaultCostCenterCode"),
    defaultFinanceAccountCode: text("defaultFinanceAccountCode"),
    defaultProjectCode: text("defaultProjectCode"),
    defaultTaxTreatment: text("defaultTaxTreatment")
      .notNull()
      .default("non_taxable_reimbursement"),
    eligibilityRules: jsonb("eligibilityRules").$type<Record<string, unknown>>(),
    policyRules: jsonb("policyRules").$type<Record<string, unknown>>(),
    policyVersion: text("policyVersion"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_expense_fund_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_expense_fund_org_state_idx").on(t.organizationId, t.state),
  ]
)

export const hrmClaimDuplicateSignal = pgTable(
  "hrm_claim_duplicate_signal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    claimId: text("claimId")
      .notNull()
      .references(() => hrmClaim.id, { onDelete: "cascade" }),
    signalKind: text("signalKind").notNull(),
    matchedClaimId: text("matchedClaimId").references(() => hrmClaim.id, {
      onDelete: "set null",
    }),
    score: decimal("score", { precision: 8, scale: 4 }).notNull(),
    signalPayload: jsonb("signalPayload"),
    reviewDecision: text("reviewDecision").notNull().default("pending"),
    overrideReason: text("overrideReason"),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_claim_duplicate_signal_org_claim_idx").on(
      t.organizationId,
      t.claimId
    ),
  ]
)

export const hrmCountryRulePack = pgTable(
  "hrm_country_rule_pack",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** ISO-2 country code: MY, SG, ID, TH, VN, PH. */
    countryCode: text("countryCode").notNull(),
    /** Composite rule-pack version, e.g. "MY-2026-01". */
    version: text("version").notNull(),
    /** Calendar date from which this composite pack is effective. */
    effectiveFrom: text("effectiveFrom").notNull(), // ISO "YYYY-MM-DD"
    /** Calendar date until which this pack is effective (null = current). */
    effectiveTo: text("effectiveTo"),
    /** Per-statutory sub-versions for audit traceability. */
    manifest: jsonb("manifest")
      .$type<{
        epfVersion: string
        socsoVersion: string
        eisVersion: string
        pcbVersion: string
        hrdfVersion: string | null
        holidayVersion: string
        eaLeaveVersion: string
      }>()
      .notNull(),
    publishedByUserId: text("publishedByUserId"),
    publishedAt: timestamp("publishedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_country_rule_pack_country_version_uidx").on(
      t.countryCode,
      t.version
    ),
    index("hrm_country_rule_pack_country_effective_from_idx").on(
      t.countryCode,
      t.effectiveFrom
    ),
  ]
)

/** Vietnam e-invoice persistence (drizzle/0035_erp_vietnam_einvoice.sql). */
export const eInvoice = pgTable(
  "e_invoice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    status: text("status").notNull().default("draft"),
    provider: text("provider").notNull().default("mock"),
    templateCode: text("templateCode").notNull(),
    series: text("series").notNull(),
    invoiceNumber: text("invoiceNumber").notNull(),
    issueDate: date("issueDate", { mode: "date" }).notNull(),
    buyerName: text("buyerName").notNull(),
    buyerTaxCode: text("buyerTaxCode"),
    currency: text("currency").notNull().default("VND"),
    totalAmountVnd: decimal("totalAmountVnd", {
      precision: 18,
      scale: 0,
    }).notNull(),
    vatRateBps: integer("vatRateBps").notNull().default(0),
    xmlPayload: text("xmlPayload").notNull(),
    providerReference: text("providerReference"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("e_invoice_org_status_idx").on(t.organizationId, t.status),
    index("e_invoice_org_issue_date_idx").on(t.organizationId, t.issueDate),
  ]
)

export const eInvoiceTransmission = pgTable(
  "e_invoice_transmission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    eInvoiceId: text("eInvoiceId")
      .notNull()
      .references(() => eInvoice.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("mock"),
    state: text("state").notNull().default("queued"),
    requestXml: text("requestXml"),
    responseXml: text("responseXml"),
    errorCode: text("errorCode"),
    errorMessage: text("errorMessage"),
    attemptCount: integer("attemptCount").notNull().default(0),
    lastAttemptAt: timestamp("lastAttemptAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("e_invoice_transmission_org_invoice_idx").on(
      t.organizationId,
      t.eInvoiceId
    ),
  ]
)

/** Durable org-scoped domain signal outbox (`#features/execution`). */
export const orgDomainSignalOutbox = pgTable(
  "org_domain_signal_outbox",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    signalKey: text("signalKey").notNull(),
    payload: jsonb("payload").notNull(),
    actorUserId: text("actorUserId").notNull(),
    actorSessionId: text("actorSessionId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_domain_signal_outbox_org_created_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("org_domain_signal_outbox_org_key_idx").on(
      t.organizationId,
      t.signalKey
    ),
  ]
)

// ---------------------------------------------------------------------------
// Working Memory Rail (Phase 3a)
//
// Operator memory inside each workbench: pinned records, saved filtered URLs,
// and activity-derived recents. Org-scoped + user-scoped + workbench-scoped.
//
// FK references to `neon_auth.organization` / `neon_auth.user` are omitted
// per the repo convention (see `iamAuditEvent`, `plannerSignal`): cross-schema
// CASCADE is not part of Neon Auth's contract. Application-layer cleanup
// (Phase 3b) ensures consistency when an org or membership is removed.
// ---------------------------------------------------------------------------

/**
 * Per-user pinned record reference shown in the rail's `pinned` slot.
 * One row per (organization, user, workbench, resource) — enforced by
 * `rail_pinned_item_user_resource_uidx`. `resourceType` is a free-form
 * stable tag (e.g. `"hrm_employee"`, `"org_member"`); validation lives
 * at the application layer.
 */
export const railPinnedItem = pgTable(
  "rail_pinned_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    /**
     * Stable workbench identifier (matches the Zod
     * `WorkbenchRailIdentifier` typed union). Free-form `text` at the DB
     * boundary so adding a new workbench is migration-free.
     */
    workbenchId: text("workbenchId").notNull(),
    resourceType: text("resourceType").notNull(),
    resourceId: text("resourceId").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    /** Optional `WorkbenchRailNavIconId` token (validated client-side). */
    icon: text("icon"),
    /**
     * Memory lane bucket. Application-layer enum: "pinned" | "urgent" | "todo".
     * Stored as free-form text so adding a lane is migration-free at the DB boundary;
     * Zod input schemas enforce the closed set at the trust boundary.
     * Existing rows default to "pinned" automatically.
     */
    lane: text("lane").notNull().default("pinned"),
    /** Drag-to-reorder rank (lower = higher in the list). */
    rank: integer("rank").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rail_pinned_item_user_resource_uidx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.resourceType,
      t.resourceId
    ),
    index("rail_pinned_item_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.rank
    ),
  ]
)

/**
 * Per-user saved view shown in the rail's `views` slot. The `href` is a
 * filtered URL inside the workbench (e.g.
 * `/o/acme/dashboard/hrm/employees?status=active&grade=L3`).
 */
export const railSavedView = pgTable(
  "rail_saved_view",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    workbenchId: text("workbenchId").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    rank: integer("rank").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("rail_saved_view_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.rank
    ),
  ]
)

/**
 * Activity-derived recents shown in the rail's `recents` slot. Writes are
 * high-frequency and **not** audited via `iam_audit_event` — observability
 * is handled by OTEL counters in the `rail-memory` server module. App-side
 * queries cap surfacing to 5; a nightly cron prunes per-(org,user,workbench)
 * beyond 25.
 */
export const railRecentItem = pgTable(
  "rail_recent_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    workbenchId: text("workbenchId").notNull(),
    resourceType: text("resourceType").notNull(),
    /** Optional — list-level surfaces (e.g. "Members") have no record id. */
    resourceId: text("resourceId"),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    occurredAt: timestamp("occurredAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rail_recent_item_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.occurredAt
    ),
  ]
)

/**
 * Per-org capability policy — Capability Registry governance layer.
 * One row per (organization, capability, audience). `state` is one of
 * `allowed | blocked | mandatory`; `mandatory` and `blocked` are terminal in
 * `resolveCapabilitiesForViewer`. `audience` collapses the role-policy layer:
 * `all` applies to every member, `admin` only to admins/owners, `member` only
 * to non-admins. `capabilityId` is free-form `text` so the catalog can grow
 * without migrations; the application layer validates against the live
 * `CAPABILITY_DEFINITIONS` registry at write time.
 *
 * IDs are FK-less to neon_auth.* for the same reason as `iam_audit_event`.
 */
export const orgCapabilityPolicy = pgTable(
  "org_capability_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    capabilityId: text("capabilityId").notNull(),
    /** `allowed | blocked | mandatory` — validated by Zod at the action boundary. */
    state: text("state").notNull(),
    /** `all | admin | member` — collapses role policy into a single audience filter. */
    audience: text("audience").notNull().default("all"),
    /** User who last set the policy (audit lineage; FK-less per repo convention). */
    updatedBy: text("updatedBy").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_capability_policy_org_capability_audience_uidx").on(
      t.organizationId,
      t.capabilityId,
      t.audience
    ),
    index("org_capability_policy_org_idx").on(t.organizationId),
  ]
)

/**
 * Per-(org, user) capability preference — replaces the previous
 * `localStorage`-only utility-bar visibility persistence with a DB-backed
 * source of truth resolved server-side. `state` is `visible | hidden`;
 * absence means "follow system default". `displayOrder` is reserved for
 * future drag-to-reorder UI (v1 only ships visibility toggles).
 *
 * Unique on (organization, user, capability). IDs are FK-less to neon_auth.*
 * per the same convention as `iam_audit_event` and `rail_pinned_item`.
 */
export const userCapabilityPreference = pgTable(
  "user_capability_preference",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    capabilityId: text("capabilityId").notNull(),
    /** `visible | hidden` — validated by Zod at the action boundary. */
    state: text("state").notNull(),
    displayOrder: integer("displayOrder").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_capability_preference_org_user_capability_uidx").on(
      t.organizationId,
      t.userId,
      t.capabilityId
    ),
    index("user_capability_preference_org_user_idx").on(
      t.organizationId,
      t.userId
    ),
  ]
)

/**
 * Org-owned external portal registry.
 *
 * Portal slugs are globally unique URL identifiers for `/p/{portalSlug}`.
 * IDs are FK-less to `neon_auth.*`; organizationId is resolved against the
 * Neon Auth organization mirror at read time.
 */
export const organizationPortal = pgTable(
  "organization_portal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    slug: text("slug").notNull(),
    audience: text("audience").notNull(),
    status: text("status").notNull().default("active"),
    displayName: text("displayName").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("organization_portal_slug_uidx").on(t.slug),
    uniqueIndex("organization_portal_org_audience_active_uidx")
      .on(t.organizationId, t.audience)
      .where(sql`${t.status} = 'active'`),
    index("organization_portal_org_idx").on(t.organizationId),
    index("organization_portal_org_audience_status_idx").on(
      t.organizationId,
      t.audience,
      t.status
    ),
  ]
)

/**
 * User access grants for an org-owned portal.
 *
 * `subjectId` is reserved for audience-specific identity binding, such as an
 * employee, supplier, customer, or investor record. Absence means the current
 * audience has not attached a subject model yet.
 */
export const organizationPortalAccess = pgTable(
  "organization_portal_access",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    portalId: text("portalId")
      .notNull()
      .references(() => organizationPortal.id, { onDelete: "cascade" }),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    audience: text("audience").notNull(),
    subjectId: text("subjectId"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("organization_portal_access_portal_user_audience_uidx").on(
      t.portalId,
      t.userId,
      t.audience
    ),
    uniqueIndex("organization_portal_access_employee_subject_active_uidx")
      .on(t.portalId, t.subjectId)
      .where(
        sql`${t.status} = 'active' AND ${t.audience} = 'employee' AND ${t.subjectId} IS NOT NULL`
      ),
    index("organization_portal_access_org_user_status_idx").on(
      t.organizationId,
      t.userId,
      t.status
    ),
    index("organization_portal_access_portal_user_status_idx").on(
      t.portalId,
      t.userId,
      t.status
    ),
    index("organization_portal_access_portal_subject_idx").on(
      t.portalId,
      t.subjectId
    ),
  ]
)

/**
 * Per-org operational scope policy — governs which scope types are available,
 * mandatory, or blocked for each audience (all / admin / member).
 *
 * One row per (organizationId, scopeType, audience). `scopeType` is free-form
 * text validated against the live `OperationalScopeRegistry` at write time —
 * same pattern as `org_capability_policy.capabilityId`. IDs are FK-less to
 * neon_auth.* per repo convention.
 *
 * See ADR-0019.
 */
export const orgOperationalScopePolicy = pgTable(
  "org_operational_scope_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** Registry-validated scope type: 'project' | 'team' | 'period' | 'warehouse' … */
    scopeType: text("scopeType").notNull(),
    /** `allowed | mandatory | blocked` — validated by Zod at the action boundary. */
    policy: text("policy").notNull(),
    /** `all | admin | member` — collapses role-policy layer. */
    audience: text("audience").notNull().default("all"),
    displayOrder: integer("displayOrder").notNull().default(0),
    /** User who last changed the policy (audit lineage; FK-less per convention). */
    updatedByUserId: text("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_operational_scope_policy_org_scope_audience_uidx").on(
      t.organizationId,
      t.scopeType,
      t.audience
    ),
    index("org_operational_scope_policy_org_idx").on(t.organizationId),
  ]
)

/**
 * Per-(org, user) operational scope preference and current selection.
 *
 * One row per (organizationId, userId, scopeType). Slot position is determined
 * at render time from `displayOrder` — the DB does not encode visual slots.
 * `pinned = true` means the scope always appears in the rail even when the
 * route does not auto-resolve it. `selectedId = null` means pinned but no
 * entity chosen yet.
 *
 * IDs are FK-less to neon_auth.* per the established convention.
 *
 * See ADR-0019.
 */
export const userOperationalScope = pgTable(
  "user_operational_scope",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    /** Registry-validated scope type — validated by Zod at write. */
    scopeType: text("scopeType").notNull(),
    /** Null = pinned but no entity selected yet. */
    selectedId: text("selectedId"),
    /** Denormalised display label — avoids extra join on render. */
    selectedLabel: text("selectedLabel"),
    /** Optional URL-safe reference for route matching. */
    selectedSlug: text("selectedSlug"),
    displayOrder: integer("displayOrder").notNull().default(0),
    /** True = always show in the rail regardless of route context. */
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_operational_scope_org_user_scope_uidx").on(
      t.organizationId,
      t.userId,
      t.scopeType
    ),
    index("user_operational_scope_org_user_idx").on(t.organizationId, t.userId),
  ]
)

/**
 * Tenant-governance overlays — separate from Better Auth organization roles.
 *
 * These rows define who governs the tenant itself (owner, key admin,
 * support admin). They are FK-less to `neon_auth.*` per repo convention.
 */
export const tenantAuthority = pgTable(
  "tenant_authority",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    appointedByUserId: text("appointedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tenant_authority_org_user_role_uidx").on(
      t.organizationId,
      t.userId,
      t.role
    ),
    index("tenant_authority_org_role_idx").on(
      t.organizationId,
      t.role,
      t.status
    ),
    index("tenant_authority_org_user_idx").on(
      t.organizationId,
      t.userId,
      t.status
    ),
  ]
)

/**
 * Tenant-defined ERP role catalog. Roles own permission grants; members are
 * assigned separately via `erp_role_member`.
 */
export const erpRole = pgTable(
  "erp_role",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("erp_role_org_name_uidx").on(t.organizationId, t.name),
    index("erp_role_org_status_idx").on(t.organizationId, t.status),
  ]
)

/**
 * Org member → ERP role assignments.
 */
export const erpRoleMember = pgTable(
  "erp_role_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    roleId: text("roleId")
      .notNull()
      .references(() => erpRole.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    status: text("status").notNull().default("active"),
    assignedByUserId: text("assignedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("erp_role_member_role_user_uidx").on(t.roleId, t.userId),
    index("erp_role_member_org_user_idx").on(
      t.organizationId,
      t.userId,
      t.status
    ),
    index("erp_role_member_org_role_idx").on(
      t.organizationId,
      t.roleId,
      t.status
    ),
  ]
)

/**
 * ERP role permission grants. Permissions are canonical `(module, object,
 * function)` tuples resolved against the ERP RBAC registry at the action
 * boundary.
 */
export const erpRolePermission = pgTable(
  "erp_role_permission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    roleId: text("roleId")
      .notNull()
      .references(() => erpRole.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    object: text("object").notNull(),
    function: text("function").notNull(),
    status: text("status").notNull().default("active"),
    grantedByUserId: text("grantedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("erp_role_permission_role_module_object_function_uidx").on(
      t.roleId,
      t.module,
      t.object,
      t.function
    ),
    index("erp_role_permission_org_role_idx").on(
      t.organizationId,
      t.roleId,
      t.status
    ),
    index("erp_role_permission_org_module_object_idx").on(
      t.organizationId,
      t.module,
      t.object,
      t.status
    ),
  ]
)

/** Public ask-docs page feedback (anonymous or optional signed-in context). */
export const askDocsFeedback = pgTable(
  "ask_docs_feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id"),
    userId: text("user_id"),
    sessionId: text("session_id"),
    locale: text("locale").notNull(),
    pagePath: text("page_path").notNull(),
    rating: integer("rating").notNull(),
    message: text("message"),
    source: text("source").notNull().default("ask-docs"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ask_docs_feedback_locale_created_idx").on(t.locale, t.createdAt),
    check("ask_docs_feedback_rating_chk", sql`${t.rating} IN (-1, 1)`),
  ]
)
