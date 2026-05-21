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

/** Browser Web Push subscription for org-scoped ERP notifications (HRM-OTM-026). */
export const orgPushSubscription = pgTable(
  "org_push_subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_push_subscription_endpoint_uidx").on(t.endpoint),
    index("org_push_subscription_org_user_idx").on(t.organizationId, t.userId),
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
    /** Lifecycle: active | planned | frozen | closed (HRM-ORG-010/012/014). */
    orgUnitStatus: text("orgUnitStatus").notNull().default("active"),
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
    index("hrm_department_organizationId_orgUnitStatus_idx").on(
      t.organizationId,
      t.orgUnitStatus
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
    positionOwnerEmployeeId: text("positionOwnerEmployeeId"),
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
    index("hrm_position_organizationId_positionOwnerEmployeeId_idx").on(
      t.organizationId,
      t.positionOwnerEmployeeId
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

/** Effective-dated org unit source of truth; `hrm_department` remains the current projection. */
export const hrmOrgUnitVersion = pgTable(
  "hrm_org_unit_version",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    orgUnitId: text("orgUnitId")
      .notNull()
      .references(() => hrmDepartment.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    orgUnitType: text("orgUnitType").notNull().default("department"),
    parentOrgUnitId: text("parentOrgUnitId").references(
      () => hrmDepartment.id,
      {
        onDelete: "set null",
      }
    ),
    managerEmployeeId: text("managerEmployeeId").references(
      () => hrmEmployee.id,
      {
        onDelete: "set null",
      }
    ),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    status: text("status").notNull().default("active"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_org_unit_version_org_unit_effective_idx").on(
      t.organizationId,
      t.orgUnitId,
      t.effectiveFrom
    ),
    uniqueIndex("hrm_org_unit_version_org_unit_effective_uidx").on(
      t.organizationId,
      t.orgUnitId,
      t.effectiveFrom
    ),
    index("hrm_org_unit_version_org_parent_idx").on(
      t.organizationId,
      t.parentOrgUnitId
    ),
    index("hrm_org_unit_version_org_status_idx").on(t.organizationId, t.status),
    index("hrm_org_unit_version_org_manager_idx").on(
      t.organizationId,
      t.managerEmployeeId
    ),
  ]
)

/** Effective-dated position source of truth; `hrm_position` remains the current projection. */
export const hrmPositionVersion = pgTable(
  "hrm_position_version",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    positionId: text("positionId")
      .notNull()
      .references(() => hrmPosition.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    orgUnitId: text("orgUnitId")
      .notNull()
      .references(() => hrmDepartment.id, { onDelete: "restrict" }),
    positionOwnerEmployeeId: text("positionOwnerEmployeeId").references(
      () => hrmEmployee.id,
      { onDelete: "set null" }
    ),
    reportsToPositionId: text("reportsToPositionId").references(
      () => hrmPosition.id,
      { onDelete: "set null" }
    ),
    defaultGradeId: text("defaultGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    employmentType: text("employmentType").notNull().default("permanent"),
    headcountBudget: integer("headcountBudget"),
    positionStatus: text("positionStatus").notNull().default("active"),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_position_version_org_position_effective_idx").on(
      t.organizationId,
      t.positionId,
      t.effectiveFrom
    ),
    uniqueIndex("hrm_position_version_org_position_effective_uidx").on(
      t.organizationId,
      t.positionId,
      t.effectiveFrom
    ),
    index("hrm_position_version_org_unit_idx").on(
      t.organizationId,
      t.orgUnitId
    ),
    index("hrm_position_version_org_reports_to_idx").on(
      t.organizationId,
      t.reportsToPositionId
    ),
    index("hrm_position_version_org_owner_idx").on(
      t.organizationId,
      t.positionOwnerEmployeeId
    ),
    index("hrm_position_version_org_status_idx").on(
      t.organizationId,
      t.positionStatus
    ),
  ]
)

/** Effective-dated employee reporting lines: direct, dotted-line, and matrix. */
export const hrmEmployeeReportingRelationship = pgTable(
  "hrm_employee_reporting_relationship",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    managerEmployeeId: text("managerEmployeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    relationshipType: text("relationshipType").notNull(),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    status: text("status").notNull().default("active"),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_employee_reporting_org_employee_type_effective_idx").on(
      t.organizationId,
      t.employeeId,
      t.relationshipType,
      t.effectiveFrom
    ),
    uniqueIndex(
      "hrm_employee_reporting_org_employee_manager_type_effective_uidx"
    ).on(
      t.organizationId,
      t.employeeId,
      t.managerEmployeeId,
      t.relationshipType,
      t.effectiveFrom
    ),
    index("hrm_employee_reporting_org_manager_type_idx").on(
      t.organizationId,
      t.managerEmployeeId,
      t.relationshipType
    ),
    index("hrm_employee_reporting_org_status_idx").on(
      t.organizationId,
      t.status
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
    documentSetId: text("documentSetId"),
    previousDocumentId: text("previousDocumentId"),
    employeeId: text("employeeId").references(() => hrmEmployee.id, {
      onDelete: "set null",
    }),
    legalEntityId: text("legalEntityId"),
    documentType: text("documentType").notNull(),
    documentGroup: text("documentGroup"),
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
    documentLifecycleStatus: text("documentLifecycleStatus")
      .notNull()
      .default("active"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    rejectionReason: text("rejectionReason"),
    versionNumber: integer("versionNumber"),
    isLatestVersion: boolean("isLatestVersion").notNull().default(true),
    isMandatory: boolean("isMandatory").notNull().default(false),
    retentionUntil: date("retentionUntil", { mode: "date" }),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    archivedByUserId: text("archivedByUserId"),
    deletedAt: timestamp("deletedAt", { mode: "date" }),
    deletedByUserId: text("deletedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.replacedByDocumentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    foreignKey({
      columns: [t.previousDocumentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    index("hrm_document_organizationId_employeeId_documentType_idx").on(
      t.organizationId,
      t.employeeId,
      t.documentType
    ),
    uniqueIndex("hrm_document_org_set_version_uidx").on(
      t.organizationId,
      t.documentSetId,
      t.versionNumber
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
    index("hrm_document_org_employee_latest_idx").on(
      t.organizationId,
      t.employeeId,
      t.isLatestVersion
    ),
    index("hrm_document_org_lifecycle_status_idx").on(
      t.organizationId,
      t.documentLifecycleStatus,
      t.verificationStatus
    ),
    index("hrm_document_org_group_type_idx").on(
      t.organizationId,
      t.documentGroup,
      t.documentType
    ),
    index("hrm_document_org_legal_entity_idx").on(
      t.organizationId,
      t.legalEntityId
    ),
    index("hrm_document_org_uploadedAt_idx").on(t.organizationId, t.uploadedAt),
    index("hrm_document_org_retentionUntil_idx").on(
      t.organizationId,
      t.retentionUntil
    ),
  ]
)

export const hrmDocumentRequirement = pgTable(
  "hrm_document_requirement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    documentType: text("documentType").notNull(),
    documentGroup: text("documentGroup").notNull(),
    legalEntityId: text("legalEntityId"),
    employmentType: text("employmentType"),
    isMandatory: boolean("isMandatory").notNull().default(true),
    allowEmployeeSubmission: boolean("allowEmployeeSubmission")
      .notNull()
      .default(false),
    allowEmployeeAccess: boolean("allowEmployeeAccess")
      .notNull()
      .default(false),
    requiresExpiryDate: boolean("requiresExpiryDate").notNull().default(false),
    retentionPolicyCode: text("retentionPolicyCode"),
    status: text("status").notNull().default("active"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_document_requirement_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_document_requirement_org_type_status_idx").on(
      t.organizationId,
      t.documentType,
      t.status
    ),
    index("hrm_document_requirement_org_group_status_idx").on(
      t.organizationId,
      t.documentGroup,
      t.status
    ),
    index("hrm_document_requirement_org_legal_entity_idx").on(
      t.organizationId,
      t.legalEntityId
    ),
  ]
)

export const hrmDocumentRetentionRule = pgTable(
  "hrm_document_retention_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    documentGroup: text("documentGroup"),
    documentType: text("documentType"),
    retentionPeriodDays: integer("retentionPeriodDays").notNull(),
    archiveAfterSeparation: boolean("archiveAfterSeparation")
      .notNull()
      .default(true),
    deleteAfterRetention: boolean("deleteAfterRetention")
      .notNull()
      .default(false),
    anonymizeAfterRetention: boolean("anonymizeAfterRetention")
      .notNull()
      .default(false),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_document_retention_rule_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_document_retention_rule_org_status_idx").on(
      t.organizationId,
      t.status
    ),
    index("hrm_document_retention_rule_org_group_type_idx").on(
      t.organizationId,
      t.documentGroup,
      t.documentType
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

/**
 * Effective-dated lifecycle transition work queue.
 *
 * Immediate lifecycle actions update `hrm_employee` and write
 * `hrm_lifecycle_event` in the same transaction. Future-dated actions are
 * stored here first, then applied by the lifecycle due-transition cron when
 * their effective date is reached.
 */
export const hrmLifecycleTransition = pgTable(
  "hrm_lifecycle_transition",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    transitionKind: text("transitionKind").notNull(),
    fromStatus: text("fromStatus"),
    toStatus: text("toStatus"),
    effectiveDate: date("effectiveDate", { mode: "date" }).notNull(),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    reason: text("reason"),
    approvalReference: text("approvalReference"),
    lifecycleEventId: text("lifecycleEventId").references(
      () => hrmLifecycleEvent.id,
      { onDelete: "set null" }
    ),
    iamAuditEventId: text("iamAuditEventId"),
    actorUserId: text("actorUserId"),
    actorSessionId: text("actorSessionId"),
    appliedAt: timestamp("appliedAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    rejectedAt: timestamp("rejectedAt", { mode: "date" }),
    failureReason: text("failureReason"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_lifecycle_transition_org_status_effective_idx").on(
      t.organizationId,
      t.status,
      t.effectiveDate
    ),
    index("hrm_lifecycle_transition_org_employee_status_idx").on(
      t.organizationId,
      t.employeeId,
      t.status
    ),
    index("hrm_lifecycle_transition_org_kind_status_idx").on(
      t.organizationId,
      t.transitionKind,
      t.status
    ),
    uniqueIndex("hrm_lifecycle_transition_org_emp_kind_eff_status_uidx").on(
      t.organizationId,
      t.employeeId,
      t.transitionKind,
      t.effectiveDate,
      t.status
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
    minNoticeDays: integer("minNoticeDays"),
    maxConsecutiveDays: integer("maxConsecutiveDays"),
    requiresAttachment: boolean("requiresAttachment").notNull().default(false),
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

/** Org-owned company holiday (LAM calendar reference). */
export const hrmOrgHoliday = pgTable(
  "hrm_org_holiday",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    holidayDate: date("holidayDate", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    regionCode: text("regionCode"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_org_holiday_org_date_uidx").on(
      t.organizationId,
      t.holidayDate
    ),
    index("hrm_org_holiday_org_active_idx").on(t.organizationId, t.isActive),
  ]
)

/** Org-scoped absence analytics risk thresholds (HRM-AAT-018). One row per organization. */
export const hrmAbsenceAnalyticsThreshold = pgTable(
  "hrm_absence_analytics_threshold",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** Validated against `aatThresholdConfigSchema` at write time. */
    config: jsonb("config").notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_absence_analytics_threshold_org_uidx").on(
      t.organizationId
    ),
  ]
)

/** Leave blackout window — blocks applications overlapping the range. */
export const hrmLeaveBlackout = pgTable(
  "hrm_leave_blackout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }).notNull(),
    leaveTypeId: text("leaveTypeId").references(() => hrmLeaveType.id, {
      onDelete: "set null",
    }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_leave_blackout_org_active_idx").on(t.organizationId, t.isActive),
    index("hrm_leave_blackout_org_range_idx").on(
      t.organizationId,
      t.startDate,
      t.endDate
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
    requisitionType: text("requisitionType").notNull().default("new_headcount"),
    legalEntityId: text("legalEntityId"),
    jobGradeId: text("jobGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    workLocationCode: text("workLocationCode"),
    employmentType: text("employmentType"),
    hiringManagerUserId: text("hiringManagerUserId"),
    budgetReference: text("budgetReference"),
    headcount: integer("headcount").notNull().default(1),
    status: text("status").notNull().default("draft"),
    approvalState: text("approvalState").notNull().default("not_required"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
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
    index("hrm_job_requisition_org_approval_idx").on(
      t.organizationId,
      t.approvalState
    ),
    index("hrm_job_requisition_org_manager_idx").on(
      t.organizationId,
      t.hiringManagerUserId
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
    parsedResume: jsonb("parsedResume"),
    parsedResumeAt: timestamp("parsedResumeAt", { mode: "date" }),
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
    screeningOutcome: text("screeningOutcome"),
    screeningSnapshot: jsonb("screeningSnapshot"),
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
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
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

export const hrmJobPosting = pgTable(
  "hrm_job_posting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requisitionId: text("requisitionId")
      .notNull()
      .references(() => hrmJobRequisition.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("draft"),
    externalReference: text("externalReference"),
    publishedAt: timestamp("publishedAt", { mode: "date" }),
    closedAt: timestamp("closedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_job_posting_org_requisition_idx").on(
      t.organizationId,
      t.requisitionId
    ),
    index("hrm_job_posting_org_channel_status_idx").on(
      t.organizationId,
      t.channel,
      t.status
    ),
  ]
)

export const hrmScreeningQuestion = pgTable(
  "hrm_screening_question",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requisitionId: text("requisitionId")
      .notNull()
      .references(() => hrmJobRequisition.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    questionType: text("questionType").notNull().default("text"),
    isKnockout: boolean("isKnockout").notNull().default(false),
    expectedAnswer: text("expectedAnswer"),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_screening_question_org_requisition_idx").on(
      t.organizationId,
      t.requisitionId
    ),
  ]
)

export const hrmScreeningResponse = pgTable(
  "hrm_screening_response",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    questionId: text("questionId")
      .notNull()
      .references(() => hrmScreeningQuestion.id, { onDelete: "cascade" }),
    answer: text("answer"),
    passed: boolean("passed"),
    evaluatedAt: timestamp("evaluatedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_screening_response_org_app_question_uidx").on(
      t.organizationId,
      t.applicationId,
      t.questionId
    ),
    index("hrm_screening_response_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
  ]
)

export const hrmRecruitmentAssessment = pgTable(
  "hrm_recruitment_assessment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    assessmentType: text("assessmentType").notNull(),
    status: text("status").notNull().default("assigned"),
    assignedAt: timestamp("assignedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completedAt", { mode: "date" }),
    score: decimal("score", { precision: 9, scale: 2 }),
    result: text("result"),
    providerReference: text("providerReference"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_recruitment_assessment_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
    index("hrm_recruitment_assessment_org_status_idx").on(
      t.organizationId,
      t.status
    ),
  ]
)

export const hrmInterviewScorecard = pgTable(
  "hrm_interview_scorecard",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    interviewId: text("interviewId")
      .notNull()
      .references(() => hrmInterview.id, { onDelete: "cascade" }),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    interviewerUserId: text("interviewerUserId").notNull(),
    competencyRatings: jsonb("competencyRatings").notNull().default({}),
    overallRating: integer("overallRating"),
    recommendation: text("recommendation").notNull(),
    comments: text("comments"),
    submittedAt: timestamp("submittedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_interview_scorecard_org_interview_user_uidx").on(
      t.organizationId,
      t.interviewId,
      t.interviewerUserId
    ),
    index("hrm_interview_scorecard_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
  ]
)

export const hrmRecruitmentCommunication = pgTable(
  "hrm_recruitment_communication",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId").references(() => hrmApplication.id, {
      onDelete: "cascade",
    }),
    candidateId: text("candidateId").references(() => hrmCandidate.id, {
      onDelete: "set null",
    }),
    communicationType: text("communicationType").notNull(),
    channel: text("channel").notNull().default("email"),
    recipient: text("recipient"),
    status: text("status").notNull().default("recorded"),
    providerReference: text("providerReference"),
    sentAt: timestamp("sentAt", { mode: "date" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
  },
  (t) => [
    index("hrm_recruitment_comm_org_application_idx").on(
      t.organizationId,
      t.applicationId
    ),
    index("hrm_recruitment_comm_org_type_idx").on(
      t.organizationId,
      t.communicationType
    ),
  ]
)

export const hrmPreEmploymentCheck = pgTable(
  "hrm_pre_employment_check",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    applicationId: text("applicationId")
      .notNull()
      .references(() => hrmApplication.id, { onDelete: "cascade" }),
    checkType: text("checkType").notNull(),
    status: text("status").notNull().default("pending"),
    providerReference: text("providerReference"),
    result: text("result"),
    completedAt: timestamp("completedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_pre_employment_check_org_app_type_uidx").on(
      t.organizationId,
      t.applicationId,
      t.checkType
    ),
    index("hrm_pre_employment_check_org_status_idx").on(
      t.organizationId,
      t.status
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
    exitType: text("exitType"),
    exitReason: text("exitReason"),
    effectiveSeparationDate: date("effectiveSeparationDate", { mode: "date" }),
    noticeStartDate: date("noticeStartDate", { mode: "date" }),
    noticeEndDate: date("noticeEndDate", { mode: "date" }),
    requiredNoticeDays: integer("requiredNoticeDays"),
    noticeWaived: boolean("noticeWaived").notNull().default(false),
    shortNotice: boolean("shortNotice").notNull().default(false),
    lastWorkingDate: date("lastWorkingDate", { mode: "date" }),
    boardingInstanceId: text("boardingInstanceId").references(
      () => hrmBoardingInstance.id,
      { onDelete: "set null" }
    ),
    settlementReadinessStatus: text("settlementReadinessStatus")
      .notNull()
      .default("pending_clearance"),
    settlementBlockers: jsonb("settlementBlockers")
      .$type<readonly { code: string; message: string }[]>()
      .notNull()
      .default([]),
    finalSettlementReference: text("finalSettlementReference"),
    rehireEligibility: text("rehireEligibility"),
    rehireEligibilityNote: text("rehireEligibilityNote"),
    exitInterviewScheduledAt: timestamp("exitInterviewScheduledAt", {
      mode: "date",
    }),
    exitInterviewCompletedAt: timestamp("exitInterviewCompletedAt", {
      mode: "date",
    }),
    exitInterviewNote: text("exitInterviewNote"),
    exitInterviewFeedbackSummary: text("exitInterviewFeedbackSummary"),
    exitInterviewWouldRehire: boolean("exitInterviewWouldRehire"),
    replacementRequestReference: text("replacementRequestReference"),
    closureNote: text("closureNote"),
    completedAt: timestamp("completedAt", { mode: "date" }),
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
    index("hrm_offboarding_instance_org_exit_type_idx").on(
      t.organizationId,
      t.exitType
    ),
    index("hrm_offboarding_instance_org_last_working_idx").on(
      t.organizationId,
      t.lastWorkingDate
    ),
    index("hrm_offboarding_instance_org_settlement_idx").on(
      t.organizationId,
      t.settlementReadinessStatus
    ),
    index("hrm_offboarding_instance_org_boarding_idx").on(
      t.organizationId,
      t.boardingInstanceId
    ),
  ]
)

export const hrmOffboardingApprovalStep = pgTable(
  "hrm_offboarding_approval_step",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    offboardingInstanceId: text("offboardingInstanceId")
      .notNull()
      .references(() => hrmOffboardingInstance.id, { onDelete: "cascade" }),
    stepKey: text("stepKey").notNull(),
    approverRole: text("approverRole").notNull(),
    approverUserId: text("approverUserId"),
    status: text("status").notNull().default("pending"),
    reviewNote: text("reviewNote"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    sortOrder: integer("sortOrder").notNull().default(0),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_offboarding_approval_org_instance_step_uidx").on(
      t.organizationId,
      t.offboardingInstanceId,
      t.stepKey
    ),
    index("hrm_offboarding_approval_org_status_idx").on(
      t.organizationId,
      t.status
    ),
  ]
)

export const hrmOffboardingClearanceItem = pgTable(
  "hrm_offboarding_clearance_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    offboardingInstanceId: text("offboardingInstanceId")
      .notNull()
      .references(() => hrmOffboardingInstance.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    category: text("category").notNull(),
    itemKey: text("itemKey").notNull(),
    title: text("title").notNull(),
    ownerRole: text("ownerRole").notNull(),
    ownerUserId: text("ownerUserId"),
    status: text("status").notNull().default("pending"),
    dueAt: date("dueAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    completedByUserId: text("completedByUserId"),
    evidenceDocumentId: text("evidenceDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    evidenceNote: text("evidenceNote"),
    blockedReason: text("blockedReason"),
    referenceType: text("referenceType"),
    referenceId: text("referenceId"),
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
    uniqueIndex("hrm_offboarding_clearance_org_instance_key_uidx").on(
      t.organizationId,
      t.offboardingInstanceId,
      t.itemKey
    ),
    index("hrm_offboarding_clearance_org_instance_status_idx").on(
      t.organizationId,
      t.offboardingInstanceId,
      t.status
    ),
    index("hrm_offboarding_clearance_org_owner_status_idx").on(
      t.organizationId,
      t.ownerRole,
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
 * Overtime request workflow (HRM-OTM-001–003, 015–018, 025).
 * states: draft → submitted → approved | rejected | returned | cancelled;
 * approved → payroll_ready | paid (Phase 4).
 */
export const hrmOvertimeRequest = pgTable(
  "hrm_overtime_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    workDate: date("workDate", { mode: "string" }).notNull(),
    startTime: text("startTime").notNull(),
    endTime: text("endTime").notNull(),
    durationMinutes: integer("durationMinutes").notNull(),
    timingKind: text("timingKind").notNull().default("actual"),
    overtimeTypeId: text("overtimeTypeId").references(
      () => hrmOvertimeType.id,
      {
        onDelete: "set null",
      }
    ),
    dayCategory: text("dayCategory").notNull().default("normal_day"),
    reason: text("reason"),
    initiatedBy: text("initiatedBy").notNull().default("employee"),
    state: text("state").notNull().default("submitted"),
    payableMinutes: integer("payableMinutes"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_overtime_request_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_overtime_request_org_state_work_date_idx").on(
      t.organizationId,
      t.state,
      t.workDate
    ),
    index("hrm_overtime_request_org_type_idx").on(
      t.organizationId,
      t.overtimeTypeId
    ),
  ]
)

/**
 * Overtime type catalog (HRM-OTM-006).
 */
export const hrmOvertimeType = pgTable(
  "hrm_overtime_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    dayCategory: text("dayCategory").notNull().default("normal_day"),
    description: text("description"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_overtime_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_overtime_type_org_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/** Overtime eligibility rules (HRM-OTM-004–005). */
export const hrmOvertimeEligibilityRule = pgTable(
  "hrm_overtime_eligibility_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    overtimeTypeId: text("overtimeTypeId")
      .notNull()
      .references(() => hrmOvertimeType.id, { onDelete: "cascade" }),
    departmentId: text("departmentId"),
    jobGradeId: text("jobGradeId"),
    employmentType: text("employmentType"),
    legalEntityCode: text("legalEntityCode"),
    countryCode: text("countryCode"),
    workLocationCode: text("workLocationCode"),
    positionId: text("positionId"),
    workerCategory: text("workerCategory"),
    policyGroupCode: text("policyGroupCode"),
    allowException: boolean("allowException").notNull().default(false),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_overtime_eligibility_org_type_idx").on(
      t.organizationId,
      t.overtimeTypeId
    ),
  ]
)

/** Org overtime policy bundle (HRM-OTM-011–014). One row per organization. */
export const hrmOvertimePolicy = pgTable(
  "hrm_overtime_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    minDurationMinutes: integer("minDurationMinutes").notNull().default(0),
    dailyCapMinutes: integer("dailyCapMinutes"),
    weeklyCapMinutes: integer("weeklyCapMinutes"),
    monthlyCapMinutes: integer("monthlyCapMinutes"),
    roundingIntervalMinutes: integer("roundingIntervalMinutes"),
    roundingMode: text("roundingMode").notNull().default("none"),
    compareAttendanceEnabled: boolean("compareAttendanceEnabled")
      .notNull()
      .default(false),
    compareShiftEnabled: boolean("compareShiftEnabled").notNull().default(true),
    claimDeadlineDays: integer("claimDeadlineDays"),
    enforceClaimDeadlineOnSubmit: boolean("enforceClaimDeadlineOnSubmit")
      .notNull()
      .default(false),
    requireHrSecondApproval: boolean("requireHrSecondApproval")
      .notNull()
      .default(false),
    managerChainMaxDepth: integer("managerChainMaxDepth").notNull().default(1),
    allowCompensatoryTime: boolean("allowCompensatoryTime")
      .notNull()
      .default(false),
    compensatoryLeaveTypeCode: text("compensatoryLeaveTypeCode"),
    defaultEarningCode: text("defaultEarningCode").notNull().default("OT"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [uniqueIndex("hrm_overtime_policy_org_uidx").on(t.organizationId)]
)

/** Overtime approval routing matrix (HRM-OTM-016). */
export const hrmOvertimeApprovalRoute = pgTable(
  "hrm_overtime_approval_route",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    label: text("label"),
    priority: integer("priority").notNull().default(100),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    costCenterCode: text("costCenterCode"),
    workLocationCode: text("workLocationCode"),
    jobGradeId: text("jobGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    minAmountCents: integer("minAmountCents"),
    maxAmountCents: integer("maxAmountCents"),
    requiresEligibilityException: boolean("requiresEligibilityException"),
    requiresPolicyException: boolean("requiresPolicyException"),
    approverKind: text("approverKind").notNull(),
    managerChainDepth: integer("managerChainDepth"),
    targetUserId: text("targetUserId"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_overtime_approval_route_org_priority_idx").on(
      t.organizationId,
      t.priority
    ),
    index("hrm_overtime_approval_route_org_active_idx").on(
      t.organizationId,
      t.isActive
    ),
  ]
)

/** Overtime pay multipliers by type (HRM-OTM-007). */
export const hrmOvertimeRateRule = pgTable(
  "hrm_overtime_rate_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    overtimeTypeId: text("overtimeTypeId")
      .notNull()
      .references(() => hrmOvertimeType.id, { onDelete: "cascade" }),
    multiplierHundredths: integer("multiplierHundredths")
      .notNull()
      .default(100),
    countryCode: text("countryCode"),
    workerCategory: text("workerCategory"),
    earningCode: text("earningCode"),
    effectiveFrom: date("effectiveFrom", { mode: "string" }),
    effectiveTo: date("effectiveTo", { mode: "string" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_overtime_rate_org_type_idx").on(
      t.organizationId,
      t.overtimeTypeId
    ),
  ]
)

/** Post-approval calculation truth (HRM-OTM-020–021). */
export const hrmOvertimeCalculationSnapshot = pgTable(
  "hrm_overtime_calculation_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requestId: text("requestId")
      .notNull()
      .references(() => hrmOvertimeRequest.id, { onDelete: "cascade" }),
    approvedMinutes: integer("approvedMinutes").notNull(),
    payableMinutes: integer("payableMinutes").notNull(),
    multiplierHundredths: integer("multiplierHundredths").notNull(),
    earningCode: text("earningCode").notNull(),
    capApplied: boolean("capApplied").notNull().default(false),
    attendanceMinutes: integer("attendanceMinutes"),
    attendanceVarianceMinutes: integer("attendanceVarianceMinutes"),
    scheduledShiftMinutes: integer("scheduledShiftMinutes"),
    shiftVarianceMinutes: integer("shiftVarianceMinutes"),
    amountCents: integer("amountCents"),
    amountCurrency: text("amountCurrency"),
    calculatedAt: timestamp("calculatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_overtime_calc_snapshot_request_uidx").on(t.requestId),
    index("hrm_overtime_calc_snapshot_org_idx").on(t.organizationId),
  ]
)

/**
 * Overtime policy exceptions (HRM-OTM-019) — late submission, cap breach, etc.
 */
export const hrmOvertimeException = pgTable(
  "hrm_overtime_exception",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requestId: text("requestId")
      .notNull()
      .references(() => hrmOvertimeRequest.id, { onDelete: "cascade" }),
    exceptionType: text("exceptionType").notNull(),
    state: text("state").notNull().default("pending"),
    justification: text("justification"),
    decidedByUserId: text("decidedByUserId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_overtime_exception_org_state_idx").on(t.organizationId, t.state),
    index("hrm_overtime_exception_request_idx").on(t.requestId),
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
    returnedReason: text("returnedReason"),
    medicalCertificateRef: text("medicalCertificateRef"),
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
 * Flexible work arrangement type catalog (HRM-FWA-001/002).
 * arrangementKind drives default schedule seeding on approval.
 */
export const hrmFlexibleWorkArrangementType = pgTable(
  "hrm_flexible_work_arrangement_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    arrangementKind: text("arrangementKind").notNull(),
    description: text("description"),
    requiresRemoteLocation: boolean("requiresRemoteLocation")
      .notNull()
      .default(false),
    requiresSupportingDocument: boolean("requiresSupportingDocument")
      .notNull()
      .default(false),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_fwa_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_fwa_type_org_archivedAt_idx").on(t.organizationId, t.archivedAt),
  ]
)

/**
 * Flexible work arrangement request / active record (HRM-FWA-004–012).
 * states: draft → submitted → approved | rejected | returned;
 * approved → active → suspended | terminated | expired.
 */
export const hrmFlexibleWorkRequest = pgTable(
  "hrm_flexible_work_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    arrangementTypeId: text("arrangementTypeId")
      .notNull()
      .references(() => hrmFlexibleWorkArrangementType.id, {
        onDelete: "restrict",
      }),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    reason: text("reason"),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }),
    reviewDate: date("reviewDate", { mode: "string" }),
    remoteLocation: text("remoteLocation"),
    evidenceDocumentId: text("evidenceDocumentId"),
    expectedWeeklyMinutes: integer("expectedWeeklyMinutes"),
    initiatedBy: text("initiatedBy").notNull().default("employee"),
    state: text("state").notNull().default("submitted"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    suspendedAt: timestamp("suspendedAt", { mode: "date" }),
    suspensionReason: text("suspensionReason"),
    terminatedAt: timestamp("terminatedAt", { mode: "date" }),
    terminationReason: text("terminationReason"),
    renewalOfRequestId: text("renewalOfRequestId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_fwa_request_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_fwa_request_org_state_start_idx").on(
      t.organizationId,
      t.state,
      t.startDate
    ),
    index("hrm_fwa_request_org_type_idx").on(
      t.organizationId,
      t.arrangementTypeId
    ),
  ]
)

/**
 * Weekly schedule pattern rows for an approved flexible work request (HRM-FWA-013/014).
 * dayOfWeek: 0=Sunday … 6=Saturday. workMode: office | remote | rest.
 */
export const hrmFlexibleWorkSchedulePattern = pgTable(
  "hrm_flexible_work_schedule_pattern",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requestId: text("requestId")
      .notNull()
      .references(() => hrmFlexibleWorkRequest.id, { onDelete: "cascade" }),
    dayOfWeek: integer("dayOfWeek").notNull(),
    workMode: text("workMode").notNull(),
    coreStart: text("coreStart"),
    coreEnd: text("coreEnd"),
    flexibleStart: text("flexibleStart"),
    flexibleEnd: text("flexibleEnd"),
    expectedMinutes: integer("expectedMinutes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_fwa_schedule_request_day_uidx").on(
      t.requestId,
      t.dayOfWeek
    ),
    index("hrm_fwa_schedule_org_request_idx").on(t.organizationId, t.requestId),
  ]
)

/** Eligibility rule rows (HRM-FWA-003/007). */
export const hrmFlexibleWorkEligibilityRule = pgTable(
  "hrm_flexible_work_eligibility_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    arrangementTypeId: text("arrangementTypeId")
      .notNull()
      .references(() => hrmFlexibleWorkArrangementType.id, {
        onDelete: "cascade",
      }),
    departmentId: text("departmentId"),
    jobGradeId: text("jobGradeId"),
    employmentType: text("employmentType"),
    legalEntityCode: text("legalEntityCode"),
    countryCode: text("countryCode"),
    workLocationCode: text("workLocationCode"),
    positionId: text("positionId"),
    workerCategory: text("workerCategory"),
    policyGroupCode: text("policyGroupCode"),
    allowException: boolean("allowException").notNull().default(false),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_fwa_eligibility_org_type_idx").on(
      t.organizationId,
      t.arrangementTypeId
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
    /** morning | afternoon | night | split | rest | off | general */
    shiftCategory: text("shiftCategory").notNull().default("general"),
    /** fixed | rotating | split | night | weekend | holiday | flexible */
    patternKind: text("patternKind").notNull().default("fixed"),
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

/** Org-wide shift scheduling policy (rest between shifts, weekly hour caps). */
export const hrmShiftSchedulingPolicy = pgTable(
  "hrm_shift_scheduling_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    minRestMinutesBetweenShifts: integer("minRestMinutesBetweenShifts")
      .notNull()
      .default(660),
    maxScheduledMinutesPerWeek: integer("maxScheduledMinutesPerWeek")
      .notNull()
      .default(2880),
    warnOnConflict: boolean("warnOnConflict").notNull().default(true),
    blockOnConflict: boolean("blockOnConflict").notNull().default(false),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_scheduling_policy_org_uidx").on(t.organizationId),
    check(
      "hrm_shift_scheduling_policy_nonneg_chk",
      sql`${t.minRestMinutesBetweenShifts} >= 0 AND ${t.maxScheduledMinutesPerWeek} > 0`
    ),
  ]
)

/** Recurring assignment generator (weekly interval). */
export const hrmShiftRecurrenceRule = pgTable(
  "hrm_shift_recurrence_rule",
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
    startDate: date("startDate").notNull(),
    endDate: date("endDate"),
    /** 0=Sun … 6=Sat */
    weekday: integer("weekday").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_recurrence_rule_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    check(
      "hrm_shift_recurrence_rule_weekday_chk",
      sql`${t.weekday} >= 0 AND ${t.weekday} <= 6`
    ),
  ]
)

export const hrmShiftRotationCycle = pgTable(
  "hrm_shift_rotation_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    cycleLengthDays: integer("cycleLengthDays").notNull().default(7),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_rotation_cycle_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    check("hrm_shift_rotation_cycle_length_chk", sql`${t.cycleLengthDays} > 0`),
  ]
)

export const hrmShiftRotationStep = pgTable(
  "hrm_shift_rotation_step",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    rotationCycleId: text("rotationCycleId")
      .notNull()
      .references(() => hrmShiftRotationCycle.id, { onDelete: "cascade" }),
    stepIndex: integer("stepIndex").notNull(),
    shiftTemplateId: text("shiftTemplateId")
      .notNull()
      .references(() => hrmShiftTemplate.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_rotation_step_cycle_index_uidx").on(
      t.rotationCycleId,
      t.stepIndex
    ),
    check("hrm_shift_rotation_step_index_chk", sql`${t.stepIndex} >= 0`),
  ]
)

/** Minimum staffing by date and shift template. */
export const hrmShiftCoverageRequirement = pgTable(
  "hrm_shift_coverage_requirement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    attendanceDate: date("attendanceDate").notNull(),
    shiftTemplateId: text("shiftTemplateId")
      .notNull()
      .references(() => hrmShiftTemplate.id, { onDelete: "restrict" }),
    minHeadcount: integer("minHeadcount").notNull().default(1),
    departmentId: text("departmentId"),
    locationCode: text("locationCode"),
    requiredSkillId: text("requiredSkillId").references(() => hrmSkill.id, {
      onDelete: "set null",
    }),
    requiredPositionId: text("requiredPositionId").references(
      () => hrmPosition.id,
      { onDelete: "set null" }
    ),
    requiredTrainingCourseId: text("requiredTrainingCourseId").references(
      () => hrmTrainingCourse.id,
      { onDelete: "set null" }
    ),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_coverage_req_org_date_idx").on(
      t.organizationId,
      t.attendanceDate
    ),
    check("hrm_shift_coverage_req_headcount_chk", sql`${t.minHeadcount} > 0`),
  ]
)

/** Employee availability blocks or preferences for shift assignment. */
export const hrmShiftAvailability = pgTable(
  "hrm_shift_availability",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    attendanceDate: date("attendanceDate").notNull(),
    kind: text("kind").notNull().default("unavailable"),
    reason: text("reason"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_availability_org_employee_date_idx").on(
      t.organizationId,
      t.employeeId,
      t.attendanceDate
    ),
    uniqueIndex("hrm_shift_availability_org_emp_date_kind_uq").on(
      t.organizationId,
      t.employeeId,
      t.attendanceDate,
      t.kind
    ),
    check(
      "hrm_shift_availability_kind_chk",
      sql`${t.kind} IN ('unavailable', 'preferred')`
    ),
  ]
)

/** Manager or employee schedule change request (distinct from swap). */
export const hrmShiftScheduleChangeRequest = pgTable(
  "hrm_shift_schedule_change_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requesterEmployeeId: text("requesterEmployeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    assignmentId: text("assignmentId")
      .notNull()
      .references(() => hrmShiftAssignment.id, { onDelete: "restrict" }),
    proposedTemplateId: text("proposedTemplateId")
      .notNull()
      .references(() => hrmShiftTemplate.id, { onDelete: "restrict" }),
    proposedDate: date("proposedDate").notNull(),
    reason: text("reason").notNull(),
    state: text("state").notNull().default("submitted"),
    managerNote: text("managerNote"),
    rejectedReason: text("rejectedReason"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_schedule_change_org_state_idx").on(
      t.organizationId,
      t.state
    ),
    check(
      "hrm_shift_schedule_change_state_chk",
      sql`${t.state} IN ('submitted', 'approved', 'rejected', 'returned', 'cancelled')`
    ),
  ]
)

/** Employee-initiated shift swap between two assignments. */
export const hrmShiftSwapRequest = pgTable(
  "hrm_shift_swap_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    requesterEmployeeId: text("requesterEmployeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    requesterAssignmentId: text("requesterAssignmentId")
      .notNull()
      .references(() => hrmShiftAssignment.id, { onDelete: "restrict" }),
    counterpartyEmployeeId: text("counterpartyEmployeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    counterpartyAssignmentId: text("counterpartyAssignmentId")
      .notNull()
      .references(() => hrmShiftAssignment.id, { onDelete: "restrict" }),
    state: text("state").notNull().default("submitted"),
    reason: text("reason").notNull(),
    rejectedReason: text("rejectedReason"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_swap_request_org_state_idx").on(t.organizationId, t.state),
    check(
      "hrm_shift_swap_request_state_chk",
      sql`${t.state} IN ('submitted', 'approved', 'rejected', 'returned', 'cancelled')`
    ),
  ]
)

/** Published roster window for employee notifications. */
export const hrmShiftRosterPublication = pgTable(
  "hrm_shift_roster_publication",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodStart: date("periodStart").notNull(),
    periodEnd: date("periodEnd").notNull(),
    publishedAt: timestamp("publishedAt", { mode: "date" }).notNull(),
    publishedByUserId: text("publishedByUserId").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_shift_roster_publication_org_period_idx").on(
      t.organizationId,
      t.periodStart,
      t.periodEnd
    ),
    check(
      "hrm_shift_roster_publication_period_chk",
      sql`${t.periodEnd} >= ${t.periodStart}`
    ),
  ]
)

/** Org-scoped saved roster CSV filter preset (shift scheduling reports). */
export const hrmShiftRosterReportDefinition = pgTable(
  "hrm_shift_roster_report_definition",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    filters: jsonb("filters")
      .$type<{
        departmentId?: string | null
        jobGradeId?: string | null
        locationCode?: string | null
        legalEntityOrgUnitId?: string | null
        teamOrgUnitId?: string | null
        positionId?: string | null
      }>()
      .notNull(),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_shift_roster_report_def_org_name_uidx").on(
      t.organizationId,
      t.name
    ),
    index("hrm_shift_roster_report_def_org_idx").on(t.organizationId),
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
    /**
     * Geolocation & Remote Check-In extensions — populated by the remote
     * check-in aggregator when an event originates from the
     * `geolocation-remote-checkin` capture pipeline or an approved exception.
     * `null` for shift/manual/CSV rows.
     */
    geofenceId: text("geofenceId"),
    gpsAccuracyMeters: integer("gpsAccuracyMeters"),
    selfieBlobUrl: text("selfieBlobUrl"),
    /** verified | outside_geofence | weak_accuracy | missing_gps | ineligible_employee | ineligible_device | spoof_suspected | outside_shift_window | missing_selfie */
    locationVerificationOutcome: text("locationVerificationOutcome"),
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
    index("hrm_attendance_event_org_geofence_idx").on(
      t.organizationId,
      t.geofenceId
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

export const hrmPayrollExchangeRate = pgTable(
  "hrm_payroll_exchange_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    fromCurrency: text("fromCurrency").notNull(),
    toCurrency: text("toCurrency").notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    effectiveDate: date("effectiveDate", { mode: "date" }).notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_payroll_exchange_rate_org_pair_date_uidx").on(
      t.organizationId,
      t.fromCurrency,
      t.toCurrency,
      t.effectiveDate
    ),
    index("hrm_payroll_exchange_rate_pair_effective_idx").on(
      t.fromCurrency,
      t.toCurrency,
      t.effectiveDate
    ),
  ]
)

export const hrmPayrollLegalEntityConfig = pgTable(
  "hrm_payroll_legal_entity_config",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    legalEntityCode: text("legalEntityCode").notNull(),
    countryCode: text("countryCode").notNull(),
    registrationNumber: text("registrationNumber"),
    defaultPayrollCurrency: text("defaultPayrollCurrency").notNull(),
    payrollCountryCode: text("payrollCountryCode").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_payroll_legal_entity_config_org_code_uidx").on(
      t.organizationId,
      t.legalEntityCode
    ),
    index("hrm_payroll_legal_entity_config_org_country_active_idx").on(
      t.organizationId,
      t.countryCode,
      t.isActive
    ),
    check(
      "hrm_payroll_legal_entity_config_country_chk",
      sql`${t.countryCode} ~ '^[A-Z]{2}$' AND ${t.payrollCountryCode} ~ '^[A-Z]{2}$'`
    ),
    check(
      "hrm_payroll_legal_entity_config_currency_chk",
      sql`${t.defaultPayrollCurrency} ~ '^[A-Z]{3}$'`
    ),
  ]
)

export const hrmPayComponentCountryTreatment = pgTable(
  "hrm_pay_component_country_treatment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    countryCode: text("countryCode").notNull(),
    componentCode: text("componentCode").notNull(),
    taxable: boolean("taxable").notNull(),
    contributable: boolean("contributable").notNull(),
    pensionable: boolean("pensionable").notNull(),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_pay_component_country_treatment_org_effective_uidx").on(
      t.organizationId,
      t.countryCode,
      t.componentCode,
      t.effectiveFrom
    ),
    index("hrm_pay_component_country_treatment_org_country_idx").on(
      t.organizationId,
      t.countryCode,
      t.componentCode
    ),
    check(
      "hrm_pay_component_country_treatment_country_chk",
      sql`${t.countryCode} ~ '^[A-Z]{2}$'`
    ),
  ]
)

export const hrmPayrollGroup = pgTable(
  "hrm_payroll_group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    countryCode: text("countryCode").notNull().default("MY"),
    paySchedule: text("paySchedule").notNull().default("monthly"),
    payCurrency: text("payCurrency").notNull().default("MYR"),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_group_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_payroll_group_org_active_idx").on(
      t.organizationId,
      t.isActive,
      t.code
    ),
  ]
)

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
    /** Optional processing cutoff used to freeze inputs ahead of payment date. */
    cutoffDate: date("cutoffDate"),
    /** ISO date string "YYYY-MM-DD" — intended payment date. */
    paymentDate: date("paymentDate").notNull(),
    payrollGroupCode: text("payrollGroupCode"),
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

export const hrmPayrollAdjustment = pgTable(
  "hrm_payroll_adjustment",
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
    kind: text("kind").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    reason: text("reason").notNull(),
    approvalId: text("approvalId").references(() => hrmApproval.id, {
      onDelete: "set null",
    }),
    retroReferencePeriodId: text("retroReferencePeriodId").references(
      () => hrmPayrollPeriod.id,
      { onDelete: "set null" }
    ),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_payroll_adjustment_org_period_idx").on(
      t.organizationId,
      t.periodId
    ),
    index("hrm_payroll_adjustment_org_employee_idx").on(
      t.organizationId,
      t.employeeId
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
    /** Optional provenance when this earning line settles an approved bonus/incentive payout. */
    bonusPayoutId: text("bonusPayoutId"),
    /** OTM request settled by this earning line (HRM-OTM-023). */
    overtimeRequestId: text("overtimeRequestId").references(
      () => hrmOvertimeRequest.id,
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
    index("hrm_payroll_line_bonus_payout_id_idx").on(t.bonusPayoutId),
    index("hrm_payroll_line_overtime_request_id_idx").on(t.overtimeRequestId),
  ]
)

export const hrmPayrollPaymentBatch = pgTable(
  "hrm_payroll_payment_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodId: text("periodId")
      .notNull()
      .references(() => hrmPayrollPeriod.id, { onDelete: "restrict" }),
    reference: text("reference").notNull(),
    state: text("state").notNull().default("generated"),
    documentId: text("documentId").references(() => hrmDocument.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_payment_batch_org_reference_uidx").on(
      t.organizationId,
      t.reference
    ),
    index("hrm_payroll_payment_batch_org_period_idx").on(
      t.organizationId,
      t.periodId
    ),
  ]
)

export const hrmPayrollPayment = pgTable(
  "hrm_payroll_payment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    batchId: text("batchId")
      .notNull()
      .references(() => hrmPayrollPaymentBatch.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    netAmount: decimal("netAmount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    status: text("status").notNull().default("pending"),
    paidAt: timestamp("paidAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_payment_org_batch_employee_uidx").on(
      t.organizationId,
      t.batchId,
      t.employeeId
    ),
    index("hrm_payroll_payment_org_batch_idx").on(t.organizationId, t.batchId),
    index("hrm_payroll_payment_org_status_idx").on(t.organizationId, t.status),
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
    validationFlags: jsonb("validationFlags").$type<unknown[]>(),
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
// employee to a benefit. Payroll-line wiring consumes active enrollments via
// the payroll projection bridge.
//
// Audit grammar: erp.hrm.benefit.{create|update|archive|enroll} +
// erp.hrm.benefit.enrollment.{activate|waive|terminate} +
// erp.hrm.benefit.life_event.{record|verify}
// ---------------------------------------------------------------------------

export const hrmBenefitProvider = pgTable(
  "hrm_benefit_provider",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    countryCodes: jsonb("countryCodes").$type<string[]>().notNull().default([]),
    externalReference: text("externalReference"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_provider_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_benefit_provider_org_active_idx").on(
      t.organizationId,
      t.isActive
    ),
  ]
)

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
    /** pending | active | waived | suspended | terminated | expired */
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

export const hrmBenefitEnrollmentDependent = pgTable(
  "hrm_benefit_enrollment_dependent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    enrollmentId: text("enrollmentId")
      .notNull()
      .references(() => hrmBenefitEnrollment.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    dependentId: text("dependentId")
      .notNull()
      .references(() => hrmDependent.id, { onDelete: "restrict" }),
    effectiveFrom: timestamp("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: timestamp("effectiveTo", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_enrollment_dependent_org_enrollment_dep_uidx").on(
      t.organizationId,
      t.enrollmentId,
      t.dependentId
    ),
    index("hrm_benefit_enrollment_dependent_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_benefit_enrollment_dependent_org_dependent_idx").on(
      t.organizationId,
      t.dependentId
    ),
  ]
)

export const hrmBenefitOpenEnrollment = pgTable(
  "hrm_benefit_open_enrollment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    startsOn: timestamp("startsOn", { mode: "date" }).notNull(),
    endsOn: timestamp("endsOn", { mode: "date" }).notNull(),
    planIds: jsonb("planIds").$type<string[]>().notNull().default([]),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_benefit_open_enrollment_org_active_idx").on(
      t.organizationId,
      t.isActive
    ),
    index("hrm_benefit_open_enrollment_org_period_idx").on(
      t.organizationId,
      t.startsOn,
      t.endsOn
    ),
  ]
)

export const hrmBenefitClaimReference = pgTable(
  "hrm_benefit_claim_reference",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    enrollmentId: text("enrollmentId")
      .notNull()
      .references(() => hrmBenefitEnrollment.id, { onDelete: "restrict" }),
    providerId: text("providerId").references(() => hrmBenefitProvider.id, {
      onDelete: "set null",
    }),
    externalClaimId: text("externalClaimId").notNull(),
    claimStatus: text("claimStatus").notNull().default("submitted"),
    claimedAmount: decimal("claimedAmount", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("MYR"),
    paymentReference: text("paymentReference"),
    documentIds: jsonb("documentIds").$type<string[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_claim_reference_org_external_uidx").on(
      t.organizationId,
      t.externalClaimId
    ),
    index("hrm_benefit_claim_reference_org_enrollment_idx").on(
      t.organizationId,
      t.enrollmentId
    ),
    index("hrm_benefit_claim_reference_org_status_idx").on(
      t.organizationId,
      t.claimStatus
    ),
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

// ---------------------------------------------------------------------------
// Bonus & incentive management
//
// Plans define eligibility and formula policy. Cycles bind a plan to a payout
// window. Payouts are the locked, approval-controlled rows exported into
// payroll; payroll_line.bonusPayoutId preserves settlement provenance.
//
// Audit grammar: erp.hrm.bonus_incentive.{plan|cycle|assignment|target|payout|adjustment|clawback}.*
// Approval subject kind: bonus_payout
// ---------------------------------------------------------------------------

export const hrmBonusPlan = pgTable(
  "hrm_bonus_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    planType: text("planType").notNull(),
    payoutFormulaType: text("payoutFormulaType").notNull(),
    payoutFormulaConfig: jsonb("payoutFormulaConfig")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    eligibilityRules: jsonb("eligibilityRules")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    targetType: text("targetType").notNull().default("individual"),
    capAmount: decimal("capAmount", { precision: 15, scale: 2 }),
    floorAmount: decimal("floorAmount", { precision: 15, scale: 2 }),
    guaranteedAmount: decimal("guaranteedAmount", { precision: 15, scale: 2 }),
    defaultCurrency: text("defaultCurrency").notNull().default("MYR"),
    defaultPayrollLineCode: text("defaultPayrollLineCode")
      .notNull()
      .default("BONUS_INCENTIVE"),
    accountingAllocation: jsonb("accountingAllocation").$type<
      Record<string, unknown>
    >(),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_bonus_plan_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_bonus_plan_org_active_idx").on(t.organizationId, t.isActive),
    index("hrm_bonus_plan_org_type_idx").on(t.organizationId, t.planType),
  ]
)

export const hrmBonusCycle = pgTable(
  "hrm_bonus_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    planId: text("planId")
      .notNull()
      .references(() => hrmBonusPlan.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    periodStart: date("periodStart").notNull(),
    periodEnd: date("periodEnd").notNull(),
    cutoffDate: date("cutoffDate"),
    approvalDate: date("approvalDate"),
    payoutDate: date("payoutDate").notNull(),
    payrollPeriodId: text("payrollPeriodId").references(
      () => hrmPayrollPeriod.id,
      { onDelete: "set null" }
    ),
    state: text("state").notNull().default("draft"),
    calculationSnapshot: jsonb("calculationSnapshot").$type<
      Record<string, unknown>
    >(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_bonus_cycle_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_bonus_cycle_org_plan_idx").on(t.organizationId, t.planId),
    index("hrm_bonus_cycle_org_state_idx").on(t.organizationId, t.state),
    index("hrm_bonus_cycle_org_period_idx").on(
      t.organizationId,
      t.periodStart,
      t.periodEnd
    ),
  ]
)

export const hrmBonusAssignment = pgTable(
  "hrm_bonus_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    planId: text("planId")
      .notNull()
      .references(() => hrmBonusPlan.id, { onDelete: "restrict" }),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmBonusCycle.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    eligibilityState: text("eligibilityState").notNull().default("eligible"),
    eligibilitySnapshot: jsonb("eligibilitySnapshot").$type<
      Record<string, unknown>
    >(),
    assignedByUserId: text("assignedByUserId"),
    assignedAt: timestamp("assignedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_bonus_assignment_org_cycle_employee_uidx").on(
      t.organizationId,
      t.cycleId,
      t.employeeId
    ),
    index("hrm_bonus_assignment_org_plan_idx").on(t.organizationId, t.planId),
    index("hrm_bonus_assignment_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

export const hrmBonusTarget = pgTable(
  "hrm_bonus_target",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmBonusCycle.id, { onDelete: "cascade" }),
    assignmentId: text("assignmentId").references(() => hrmBonusAssignment.id, {
      onDelete: "cascade",
    }),
    employeeId: text("employeeId").references(() => hrmEmployee.id, {
      onDelete: "restrict",
    }),
    targetScope: text("targetScope").notNull(),
    targetMetric: text("targetMetric").notNull(),
    targetValue: decimal("targetValue", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    actualValue: decimal("actualValue", { precision: 18, scale: 4 }),
    achievementPercent: decimal("achievementPercent", {
      precision: 9,
      scale: 4,
    }),
    weight: decimal("weight", { precision: 9, scale: 4 }).default("1"),
    sourceReference: text("sourceReference"),
    enteredByUserId: text("enteredByUserId"),
    enteredAt: timestamp("enteredAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_bonus_target_org_cycle_idx").on(t.organizationId, t.cycleId),
    index("hrm_bonus_target_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_bonus_target_org_assignment_idx").on(
      t.organizationId,
      t.assignmentId
    ),
  ]
)

export const hrmBonusPayout = pgTable(
  "hrm_bonus_payout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    planId: text("planId")
      .notNull()
      .references(() => hrmBonusPlan.id, { onDelete: "restrict" }),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmBonusCycle.id, { onDelete: "restrict" }),
    assignmentId: text("assignmentId").references(() => hrmBonusAssignment.id, {
      onDelete: "set null",
    }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    payoutNumber: text("payoutNumber"),
    state: text("state").notNull().default("draft"),
    targetAmount: decimal("targetAmount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    achievementPercent: decimal("achievementPercent", {
      precision: 9,
      scale: 4,
    })
      .notNull()
      .default("0"),
    calculatedAmount: decimal("calculatedAmount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    adjustedAmount: decimal("adjustedAmount", { precision: 15, scale: 2 }),
    approvedAmount: decimal("approvedAmount", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("MYR"),
    calculationSnapshot: jsonb("calculationSnapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    validationFlags: jsonb("validationFlags")
      .$type<Array<{ code: string; message: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    prorationFactor: decimal("prorationFactor", { precision: 9, scale: 6 })
      .notNull()
      .default("1"),
    multiplierSnapshot:
      jsonb("multiplierSnapshot").$type<Record<string, unknown>>(),
    accountingAllocation: jsonb("accountingAllocation").$type<
      Record<string, unknown>
    >(),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    payrollPeriodId: text("payrollPeriodId").references(
      () => hrmPayrollPeriod.id,
      { onDelete: "set null" }
    ),
    paidByPayrollLineId: text("paidByPayrollLineId"),
    paidAt: timestamp("paidAt", { mode: "date" }),
    lockedAt: timestamp("lockedAt", { mode: "date" }),
    lockedByUserId: text("lockedByUserId"),
    rejectionReason: text("rejectionReason"),
    returnedReason: text("returnedReason"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_bonus_payout_org_number_uidx").on(
      t.organizationId,
      t.payoutNumber
    ),
    uniqueIndex("hrm_bonus_payout_org_cycle_employee_uidx").on(
      t.organizationId,
      t.cycleId,
      t.employeeId
    ),
    index("hrm_bonus_payout_org_cycle_state_idx").on(
      t.organizationId,
      t.cycleId,
      t.state
    ),
    index("hrm_bonus_payout_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_bonus_payout_org_payroll_period_idx").on(
      t.organizationId,
      t.payrollPeriodId
    ),
  ]
)

export const hrmBonusAdjustment = pgTable(
  "hrm_bonus_adjustment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    payoutId: text("payoutId")
      .notNull()
      .references(() => hrmBonusPayout.id, { onDelete: "cascade" }),
    adjustmentType: text("adjustmentType").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    reason: text("reason").notNull(),
    approvalReference: text("approvalReference"),
    adjustedByUserId: text("adjustedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_bonus_adjustment_org_payout_idx").on(
      t.organizationId,
      t.payoutId
    ),
  ]
)

export const hrmBonusClawback = pgTable(
  "hrm_bonus_clawback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    payoutId: text("payoutId")
      .notNull()
      .references(() => hrmBonusPayout.id, { onDelete: "restrict" }),
    clawbackType: text("clawbackType").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    reason: text("reason").notNull(),
    recoveryState: text("recoveryState").notNull().default("recorded"),
    recoveryReference: text("recoveryReference"),
    recordedByUserId: text("recordedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_bonus_clawback_org_payout_idx").on(t.organizationId, t.payoutId),
    index("hrm_bonus_clawback_org_state_idx").on(
      t.organizationId,
      t.recoveryState
    ),
  ]
)

// ---------------------------------------------------------------------------
// Salary benchmarking & surveys
//
// External survey references, benchmark rows, internal job mappings,
// versioned analysis snapshots, and org-scoped audit history rows.
//
// Audit grammar: erp.hrm.salary_benchmarking.*
// ---------------------------------------------------------------------------

export const hrmSalaryBenchmarkSurvey = pgTable(
  "hrm_salary_benchmark_survey",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    provider: text("provider").notNull(),
    surveyYear: integer("surveyYear").notNull(),
    surveyName: text("surveyName"),
    industry: text("industry"),
    companySizeSegment: text("companySizeSegment"),
    revenueSegment: text("revenueSegment"),
    countryCode: text("countryCode").notNull(),
    location: text("location"),
    currency: text("currency").notNull().default("MYR"),
    effectiveDate: date("effectiveDate").notNull(),
    sourceVersion: text("sourceVersion").notNull(),
    confidenceLevel: decimal("confidenceLevel", { precision: 5, scale: 4 }),
    uploadedByUserId: text("uploadedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_benchmark_survey_org_year_idx").on(
      t.organizationId,
      t.surveyYear
    ),
    index("hrm_salary_benchmark_survey_org_provider_idx").on(
      t.organizationId,
      t.provider
    ),
    uniqueIndex("hrm_salary_benchmark_survey_org_version_uidx").on(
      t.organizationId,
      t.sourceVersion
    ),
  ]
)

export const hrmSalaryBenchmarkRow = pgTable(
  "hrm_salary_benchmark_row",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    surveyId: text("surveyId")
      .notNull()
      .references(() => hrmSalaryBenchmarkSurvey.id, { onDelete: "cascade" }),
    benchmarkVersion: text("benchmarkVersion").notNull(),
    jobFamily: text("jobFamily").notNull(),
    benchmarkJobCode: text("benchmarkJobCode").notNull(),
    benchmarkJobTitle: text("benchmarkJobTitle").notNull(),
    benchmarkLevel: text("benchmarkLevel").notNull(),
    industry: text("industry"),
    countryCode: text("countryCode").notNull(),
    location: text("location"),
    currency: text("currency").notNull().default("MYR"),
    minimum: decimal("minimum", { precision: 15, scale: 2 }),
    midpoint: decimal("midpoint", { precision: 15, scale: 2 }),
    median: decimal("median", { precision: 15, scale: 2 }),
    average: decimal("average", { precision: 15, scale: 2 }),
    maximum: decimal("maximum", { precision: 15, scale: 2 }),
    p25: decimal("p25", { precision: 15, scale: 2 }),
    p50: decimal("p50", { precision: 15, scale: 2 }),
    p75: decimal("p75", { precision: 15, scale: 2 }),
    p90: decimal("p90", { precision: 15, scale: 2 }),
    sampleSize: integer("sampleSize"),
    effectiveDate: date("effectiveDate").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_benchmark_row_org_survey_idx").on(
      t.organizationId,
      t.surveyId
    ),
    index("hrm_salary_benchmark_row_org_version_idx").on(
      t.organizationId,
      t.benchmarkVersion
    ),
    uniqueIndex("hrm_salary_benchmark_row_org_survey_job_uidx").on(
      t.organizationId,
      t.surveyId,
      t.benchmarkJobCode,
      t.benchmarkLevel
    ),
  ]
)

export const hrmSalaryBenchmarkMapping = pgTable(
  "hrm_salary_benchmark_mapping",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    benchmarkId: text("benchmarkId")
      .notNull()
      .references(() => hrmSalaryBenchmarkRow.id, { onDelete: "cascade" }),
    internalJobId: text("internalJobId").notNull(),
    internalJobTitle: text("internalJobTitle").notNull(),
    internalJobFamily: text("internalJobFamily").notNull(),
    internalGrade: text("internalGrade").notNull(),
    legalEntityCode: text("legalEntityCode"),
    countryCode: text("countryCode").notNull(),
    location: text("location"),
    employmentCategory: text("employmentCategory"),
    state: text("state").notNull().default("draft"),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    sourceVersion: text("sourceVersion").notNull(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_benchmark_mapping_org_benchmark_idx").on(
      t.organizationId,
      t.benchmarkId
    ),
    index("hrm_salary_benchmark_mapping_org_state_idx").on(
      t.organizationId,
      t.state
    ),
    uniqueIndex("hrm_salary_benchmark_mapping_org_job_uidx").on(
      t.organizationId,
      t.benchmarkId,
      t.internalJobId
    ),
  ]
)

export const hrmSalaryBenchmarkAnalysisSnapshot = pgTable(
  "hrm_salary_benchmark_analysis_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    benchmarkId: text("benchmarkId")
      .notNull()
      .references(() => hrmSalaryBenchmarkRow.id, { onDelete: "restrict" }),
    mappingId: text("mappingId").references(
      () => hrmSalaryBenchmarkMapping.id,
      {
        onDelete: "set null",
      }
    ),
    analysisVersion: text("analysisVersion").notNull(),
    compensationScope: text("compensationScope")
      .notNull()
      .default("base_salary"),
    thresholds: jsonb("thresholds")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    currencyConversionReference: text("currencyConversionReference"),
    recommendationHandoffState: text("recommendationHandoffState")
      .notNull()
      .default("none"),
    recommendationHandoffAt: timestamp("recommendationHandoffAt", {
      mode: "date",
    }),
    generatedByUserId: text("generatedByUserId"),
    generatedAt: timestamp("generatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_benchmark_analysis_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_salary_benchmark_analysis_org_version_idx").on(
      t.organizationId,
      t.analysisVersion
    ),
    uniqueIndex("hrm_salary_benchmark_analysis_org_employee_version_uidx").on(
      t.organizationId,
      t.employeeId,
      t.analysisVersion,
      t.compensationScope
    ),
  ]
)

export const hrmSalaryBenchmarkAuditHistory = pgTable(
  "hrm_salary_benchmark_audit_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    action: text("action").notNull(),
    resourceType: text("resourceType").notNull(),
    resourceId: text("resourceId").notNull(),
    actorUserId: text("actorUserId"),
    snapshotVersion: text("snapshotVersion"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_benchmark_audit_org_created_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("hrm_salary_benchmark_audit_org_resource_idx").on(
      t.organizationId,
      t.resourceType,
      t.resourceId
    ),
  ]
)

// ---------------------------------------------------------------------------
// Compensation Planning & Modeling (HRM-CPM-001–030)
// Cycles, budget pools, cycle participants, recommendations.
// Audit grammar: erp.hrm.compensation.*
// ---------------------------------------------------------------------------

export const hrmCompensationCycle = pgTable(
  "hrm_compensation_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    cycleType: text("cycleType").notNull(),
    effectiveDate: date("effectiveDate", { mode: "string" }).notNull(),
    state: text("state").notNull().default("draft"),
    eligibilityRules: jsonb("eligibilityRules")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_compensation_cycle_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_compensation_cycle_org_state_idx").on(t.organizationId, t.state),
    index("hrm_compensation_cycle_org_effective_idx").on(
      t.organizationId,
      t.effectiveDate
    ),
  ]
)

export const hrmCompensationBudgetPool = pgTable(
  "hrm_compensation_budget_pool",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmCompensationCycle.id, { onDelete: "cascade" }),
    scopeType: text("scopeType").notNull(),
    scopeId: text("scopeId").notNull(),
    allocatedAmount: decimal("allocatedAmount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    usedAmount: decimal("usedAmount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("MYR"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_compensation_budget_pool_cycle_scope_uidx").on(
      t.cycleId,
      t.scopeType,
      t.scopeId
    ),
    index("hrm_compensation_budget_pool_org_cycle_idx").on(
      t.organizationId,
      t.cycleId
    ),
  ]
)

export const hrmCompensationCycleParticipant = pgTable(
  "hrm_compensation_cycle_participant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmCompensationCycle.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    eligible: boolean("eligible").notNull().default(true),
    eligibilityReasons: jsonb("eligibilityReasons")
      .$type<readonly { code: string; message: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    currentSalaryAmount: decimal("currentSalaryAmount", {
      precision: 15,
      scale: 2,
    }),
    salaryCurrency: text("salaryCurrency").notNull().default("MYR"),
    salaryEffectiveDate: date("salaryEffectiveDate", { mode: "string" }),
    gradeId: text("gradeId"),
    jobLevelId: text("jobLevelId"),
    departmentId: text("departmentId"),
    managerEmployeeId: text("managerEmployeeId"),
    bandMinimum: decimal("bandMinimum", { precision: 15, scale: 2 }),
    bandMidpoint: decimal("bandMidpoint", { precision: 15, scale: 2 }),
    bandMaximum: decimal("bandMaximum", { precision: 15, scale: 2 }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_compensation_cycle_participant_cycle_employee_uidx").on(
      t.cycleId,
      t.employeeId
    ),
    index("hrm_compensation_cycle_participant_org_cycle_idx").on(
      t.organizationId,
      t.cycleId
    ),
    index("hrm_compensation_cycle_participant_org_eligible_idx").on(
      t.organizationId,
      t.cycleId,
      t.eligible
    ),
  ]
)

export const hrmCompensationRecommendation = pgTable(
  "hrm_compensation_recommendation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmCompensationCycle.id, { onDelete: "cascade" }),
    participantId: text("participantId")
      .notNull()
      .references(() => hrmCompensationCycleParticipant.id, {
        onDelete: "cascade",
      }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    adjustmentType: text("adjustmentType").notNull(),
    state: text("state").notNull().default("draft"),
    currentSalaryAmount: decimal("currentSalaryAmount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    increaseAmount: decimal("increaseAmount", { precision: 15, scale: 2 }),
    increasePercentage: decimal("increasePercentage", {
      precision: 8,
      scale: 4,
    }),
    proposedSalaryAmount: decimal("proposedSalaryAmount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    exceptionJustification: text("exceptionJustification"),
    submittedByUserId: text("submittedByUserId"),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_compensation_recommendation_org_cycle_state_idx").on(
      t.organizationId,
      t.cycleId,
      t.state
    ),
    index("hrm_compensation_recommendation_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    uniqueIndex("hrm_compensation_recommendation_participant_uidx").on(
      t.participantId
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

export const hrmComplianceObligation = pgTable(
  "hrm_compliance_obligation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    complianceArea: text("complianceArea").notNull(),
    requirementKind: text("requirementKind").notNull(),
    status: text("status").notNull().default("active"),
    countryCode: text("countryCode"),
    legalEntityCode: text("legalEntityCode"),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    workLocationCode: text("workLocationCode"),
    employmentType: text("employmentType"),
    workerCategory: text("workerCategory"),
    policyId: text("policyId"),
    policyVersion: text("policyVersion"),
    acknowledgementDeadline: date("acknowledgementDeadline", { mode: "date" }),
    dueDate: date("dueDate", { mode: "date" }),
    alertLeadDays: integer("alertLeadDays").notNull().default(7),
    sourceReferenceId: text("sourceReferenceId"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    effectiveFrom: date("effectiveFrom", { mode: "date" }),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_compliance_obligation_org_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_compliance_obligation_org_kind_status_idx").on(
      t.organizationId,
      t.requirementKind,
      t.status
    ),
    index("hrm_compliance_obligation_org_area_status_idx").on(
      t.organizationId,
      t.complianceArea,
      t.status
    ),
    index("hrm_compliance_obligation_org_scope_idx").on(
      t.organizationId,
      t.countryCode,
      t.legalEntityCode,
      t.departmentId,
      t.workLocationCode
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
    legalEntityCode: text("legalEntityCode"),
    legalEntityName: text("legalEntityName"),
    workLocationCode: text("workLocationCode"),
    employmentType: text("employmentType"),
    workerCategory: text("workerCategory"),
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
    waivedAt: timestamp("waivedAt", { mode: "date" }),
    waivedByUserId: text("waivedByUserId"),
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
    correctiveActionProgressNote: text("correctiveActionProgressNote"),
    correctiveActionEvidenceDocumentId: text(
      "correctiveActionEvidenceDocumentId"
    ).references(() => hrmDocument.id, { onDelete: "set null" }),
    correctiveActionUpdatedAt: timestamp("correctiveActionUpdatedAt", {
      mode: "date",
    }),
    isAutoGenerated: boolean("isAutoGenerated").notNull().default(false),
    resolutionNote: text("resolutionNote"),
    resolvedEvidenceDocumentId: text("resolvedEvidenceDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
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
    index("hrm_compliance_exception_org_owner_due_idx").on(
      t.organizationId,
      t.correctiveActionOwnerUserId,
      t.correctiveActionDueDate
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
    policyTitle: text("policyTitle"),
    acknowledgementMethod: text("acknowledgementMethod")
      .notNull()
      .default("employee_portal"),
    acknowledgementSource: text("acknowledgementSource")
      .notNull()
      .default("employee_self_service"),
    acknowledgedByUserId: text("acknowledgedByUserId"),
    actorSessionId: text("actorSessionId"),
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
    index("hrm_policy_ack_org_policy_version_idx").on(
      t.organizationId,
      t.policyId,
      t.policyVersion
    ),
  ]
)

export const hrmEssProfileUpdateRequest = pgTable(
  "hrm_ess_profile_update_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    requestedChanges: jsonb("requestedChanges")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: text("status").notNull().default("pending"),
    submittedByUserId: text("submittedByUserId").notNull(),
    submittedAt: timestamp("submittedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_ess_profile_update_request_org_employee_status_idx").on(
      t.organizationId,
      t.employeeId,
      t.status
    ),
    index("hrm_ess_profile_update_request_org_status_created_idx").on(
      t.organizationId,
      t.status,
      t.createdAt
    ),
  ]
)

export const hrmEssDocumentRequest = pgTable(
  "hrm_ess_document_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    submittedByUserId: text("submittedByUserId").notNull(),
    submittedAt: timestamp("submittedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    reviewNote: text("reviewNote"),
    fulfilledDocumentId: text("fulfilledDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_ess_document_request_org_employee_status_idx").on(
      t.organizationId,
      t.employeeId,
      t.status
    ),
    index("hrm_ess_document_request_org_status_created_idx").on(
      t.organizationId,
      t.status,
      t.createdAt
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
    eligibilityRules:
      jsonb("eligibilityRules").$type<Record<string, unknown>>(),
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
 * `/o/acme/apps/hrm/employees?status=active&grade=L3`).
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

// ---------------------------------------------------------------------------
// Geolocation & Remote Check-In (lib/features/hrm/time-attendance/geolocation-remote-checkin/)
//
// `hrm_attendance_event` carries the verified row; the four tables below own
// configuration (geofences + policies + devices) and the exception inbox.
// ---------------------------------------------------------------------------

/**
 * Approved worksite circular geofence (HRM-GEO-004 / HRM-GEO-005).
 * Referenced by `hrm_remote_checkin_policy` and (after approval) by
 * `hrm_attendance_event.geofenceId` for traceability.
 */
export const hrmGeofence = pgTable(
  "hrm_geofence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    /** office | branch | project_site | client_site | field_site | home_office */
    scopeKind: text("scopeKind").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
    radiusMeters: integer("radiusMeters").notNull(),
    bufferMeters: integer("bufferMeters").notNull().default(0),
    countryCode: text("countryCode"),
    legalEntityCode: text("legalEntityCode"),
    notes: text("notes"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_geofence_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_geofence_org_scope_active_idx").on(
      t.organizationId,
      t.scopeKind,
      t.archivedAt
    ),
    check(
      "hrm_geofence_scope_kind_chk",
      sql`${t.scopeKind} IN ('office', 'branch', 'project_site', 'client_site', 'field_site', 'home_office')`
    ),
    check(
      "hrm_geofence_radius_chk",
      sql`${t.radiusMeters} > 0 AND ${t.radiusMeters} <= 50000`
    ),
    check(
      "hrm_geofence_buffer_chk",
      sql`${t.bufferMeters} >= 0 AND ${t.bufferMeters} <= 5000`
    ),
  ]
)

/**
 * Per-scope thresholds for remote check-in (HRM-GEO-007 / HRM-GEO-009 / HRM-GEO-011 / HRM-GEO-015).
 * Org-wide row uses `scopeKind = 'org'` and `scopeRef = null`; more specific
 * scopes override.
 */
export const hrmRemoteCheckinPolicy = pgTable(
  "hrm_remote_checkin_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** org | department | position | employment_type | policy_group | employee */
    scopeKind: text("scopeKind").notNull(),
    /** UUID or code for the scope (department ID, position ID, employment-type slug, policy-group code, employee ID). */
    scopeRef: text("scopeRef"),
    minGpsAccuracyMeters: integer("minGpsAccuracyMeters")
      .notNull()
      .default(100),
    allowedRadiusBufferMeters: integer("allowedRadiusBufferMeters")
      .notNull()
      .default(50),
    shiftWindowMinutes: integer("shiftWindowMinutes").notNull().default(60),
    breakWindowMinutes: integer("breakWindowMinutes").notNull().default(30),
    requireRegisteredDevice: boolean("requireRegisteredDevice")
      .notNull()
      .default(true),
    requireSelfie: boolean("requireSelfie").notNull().default(false),
    detectSpoofing: boolean("detectSpoofing").notNull().default(true),
    allowEligibilityException: boolean("allowEligibilityException")
      .notNull()
      .default(true),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_remote_checkin_policy_org_scope_uidx").on(
      t.organizationId,
      t.scopeKind,
      t.scopeRef
    ),
    index("hrm_remote_checkin_policy_org_active_idx").on(
      t.organizationId,
      t.isActive
    ),
    check(
      "hrm_remote_checkin_policy_scope_kind_chk",
      sql`${t.scopeKind} IN ('org', 'department', 'position', 'employment_type', 'policy_group', 'employee')`
    ),
    check(
      "hrm_remote_checkin_policy_thresholds_chk",
      sql`${t.minGpsAccuracyMeters} > 0 AND ${t.allowedRadiusBufferMeters} >= 0 AND ${t.shiftWindowMinutes} >= 0 AND ${t.breakWindowMinutes} >= 0`
    ),
  ]
)

/**
 * Registered devices allowed for remote check-in (HRM-GEO-010 / HRM-GEO-011).
 * `deviceFingerprint` is a hashed identifier from the browser / mobile app
 * — the same physical device can re-register if revoked.
 */
export const hrmRemoteCheckinDevice = pgTable(
  "hrm_remote_checkin_device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    deviceLabel: text("deviceLabel").notNull(),
    deviceFingerprint: text("deviceFingerprint").notNull(),
    /** pending | active | revoked */
    state: text("state").notNull().default("pending"),
    lastSeenAt: timestamp("lastSeenAt", { mode: "date" }),
    lastIpAddress: text("lastIpAddress"),
    registeredByUserId: text("registeredByUserId"),
    revokedByUserId: text("revokedByUserId"),
    revokedAt: timestamp("revokedAt", { mode: "date" }),
    revokedReason: text("revokedReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_remote_checkin_device_org_fingerprint_uidx").on(
      t.organizationId,
      t.deviceFingerprint
    ),
    index("hrm_remote_checkin_device_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    check(
      "hrm_remote_checkin_device_state_chk",
      sql`${t.state} IN ('pending', 'active', 'revoked')`
    ),
  ]
)

/**
 * Failed-validation captures awaiting approval (HRM-GEO-016 / HRM-GEO-017 /
 * HRM-GEO-018). Approved exceptions write into `hrm_attendance_event` and
 * back-fill `resolvedEventId` for traceability.
 */
export const hrmRemoteCheckinException = pgTable(
  "hrm_remote_checkin_exception",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** submitted | approved | rejected | returned | corrected | cancelled */
    state: text("state").notNull().default("submitted"),
    /** clock_in | clock_out | break_start | break_end */
    eventType: text("eventType").notNull(),
    occurredAt: timestamp("occurredAt", { mode: "date" }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    gpsAccuracyMeters: integer("gpsAccuracyMeters"),
    deviceId: text("deviceId"),
    remoteLocationLabel: text("remoteLocationLabel"),
    geofenceId: text("geofenceId"),
    selfieBlobUrl: text("selfieBlobUrl"),
    /** Outcome reported by the validation engine on capture. */
    detectionOutcome: text("detectionOutcome").notNull(),
    reason: text("reason").notNull(),
    decisionReason: text("decisionReason"),
    /** Set when the approver corrects the capture (HRM-GEO-019). */
    correctedLatitude: decimal("correctedLatitude", {
      precision: 10,
      scale: 6,
    }),
    correctedLongitude: decimal("correctedLongitude", {
      precision: 10,
      scale: 6,
    }),
    correctedEventType: text("correctedEventType"),
    correctedOccurredAt: timestamp("correctedOccurredAt", { mode: "date" }),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    decidedByUserId: text("decidedByUserId"),
    resolvedEventId: text("resolvedEventId"),
    spoofingSignals: jsonb("spoofingSignals"),
    capturedClientIp: text("capturedClientIp"),
    submittedByUserId: text("submittedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_remote_checkin_exception_org_state_created_idx").on(
      t.organizationId,
      t.state,
      t.createdAt
    ),
    index("hrm_remote_checkin_exception_org_employee_created_idx").on(
      t.organizationId,
      t.employeeId,
      t.createdAt
    ),
    index("hrm_remote_checkin_exception_org_outcome_idx").on(
      t.organizationId,
      t.detectionOutcome
    ),
    check(
      "hrm_remote_checkin_exception_state_chk",
      sql`${t.state} IN ('submitted', 'approved', 'rejected', 'returned', 'corrected', 'cancelled')`
    ),
    check(
      "hrm_remote_checkin_exception_event_type_chk",
      sql`${t.eventType} IN ('clock_in', 'clock_out', 'break_start', 'break_end')`
    ),
    check(
      "hrm_remote_checkin_exception_corrected_event_type_chk",
      sql`${t.correctedEventType} IS NULL OR ${t.correctedEventType} IN ('clock_in', 'clock_out', 'break_start', 'break_end')`
    ),
  ]
)

// ---------------------------------------------------------------------------
// Time Clock Integration (lib/features/hrm/time-attendance/time-clock-integration/)
//
// Physical/digital terminal registry + employee mapping. Validated punches land in
// `hrm_attendance_event` with `source = 'device'` (sole writer: TCI punch commands).
// ---------------------------------------------------------------------------

/** Org-owned time clock terminal (HRM-TCI-003 / HRM-TCI-004). */
export const hrmTimeClockDevice = pgTable(
  "hrm_time_clock_device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    externalDeviceId: text("externalDeviceId").notNull(),
    name: text("name").notNull(),
    deviceType: text("deviceType").notNull(),
    locationRef: text("locationRef"),
    state: text("state").notNull().default("active"),
    syncStatus: text("syncStatus").notNull().default("idle"),
    lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
    integrationCredentialRef: text("integrationCredentialRef"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_time_clock_device_org_external_uidx").on(
      t.organizationId,
      t.externalDeviceId
    ),
    index("hrm_time_clock_device_org_state_idx").on(
      t.organizationId,
      t.state
    ),
    check(
      "hrm_time_clock_device_type_chk",
      sql`${t.deviceType} IN ('biometric', 'card', 'rfid', 'kiosk', 'web', 'api')`
    ),
    check(
      "hrm_time_clock_device_state_chk",
      sql`${t.state} IN ('active', 'inactive', 'revoked')`
    ),
    check(
      "hrm_time_clock_device_sync_status_chk",
      sql`${t.syncStatus} IN ('idle', 'syncing', 'failed', 'ok')`
    ),
  ]
)

/** Employee ↔ terminal identity mapping (HRM-TCI-005 / HRM-TCI-015). */
export const hrmTimeClockEmployeeMapping = pgTable(
  "hrm_time_clock_employee_mapping",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    deviceId: text("deviceId")
      .notNull()
      .references(() => hrmTimeClockDevice.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    clockUserId: text("clockUserId"),
    badgeId: text("badgeId"),
    biometricRef: text("biometricRef"),
    state: text("state").notNull().default("active"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_time_clock_mapping_org_device_clock_user_uidx").on(
      t.organizationId,
      t.deviceId,
      t.clockUserId
    ),
    index("hrm_time_clock_mapping_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    check(
      "hrm_time_clock_mapping_state_chk",
      sql`${t.state} IN ('active', 'inactive')`
    ),
  ]
)

/** Import / API / scheduled sync run (HRM-TCI-008–011 / HRM-TCI-030). */
export const hrmTimeClockSyncBatch = pgTable(
  "hrm_time_clock_sync_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    deviceId: text("deviceId").references(() => hrmTimeClockDevice.id, {
      onDelete: "set null",
    }),
    sourceKind: text("sourceKind").notNull(),
    state: text("state").notNull().default("running"),
    receivedCount: integer("receivedCount").notNull().default(0),
    acceptedCount: integer("acceptedCount").notNull().default(0),
    duplicateCount: integer("duplicateCount").notNull().default(0),
    rejectedCount: integer("rejectedCount").notNull().default(0),
    errorSummary: text("errorSummary"),
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    finishedAt: timestamp("finishedAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
  },
  (t) => [
    index("hrm_time_clock_sync_batch_org_started_idx").on(
      t.organizationId,
      t.startedAt
    ),
    check(
      "hrm_time_clock_sync_batch_source_chk",
      sql`${t.sourceKind} IN ('api', 'manual_import', 'scheduled', 'offline_replay')`
    ),
    check(
      "hrm_time_clock_sync_batch_state_chk",
      sql`${t.state} IN ('running', 'completed', 'failed')`
    ),
  ]
)

/**
 * Failed or unmatched punch awaiting HR review (HRM-TCI-017–019 / HRM-TCI-024).
 * Approved rows write `hrm_attendance_event`.
 */
export const hrmTimeClockPunchException = pgTable(
  "hrm_time_clock_punch_exception",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    deviceId: text("deviceId").references(() => hrmTimeClockDevice.id, {
      onDelete: "set null",
    }),
    syncBatchId: text("syncBatchId").references(() => hrmTimeClockSyncBatch.id, {
      onDelete: "set null",
    }),
    state: text("state").notNull().default("submitted"),
    eventType: text("eventType").notNull(),
    occurredAt: timestamp("occurredAt", { mode: "date" }).notNull(),
    detectionOutcome: text("detectionOutcome").notNull(),
    reason: text("reason").notNull(),
    rawPayloadHash: text("rawPayloadHash"),
    sourceRef: text("sourceRef"),
    resolvedEventId: text("resolvedEventId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    decidedByUserId: text("decidedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_time_clock_punch_exception_org_state_idx").on(
      t.organizationId,
      t.state,
      t.createdAt
    ),
    check(
      "hrm_time_clock_punch_exception_state_chk",
      sql`${t.state} IN ('submitted', 'approved', 'rejected', 'cancelled')`
    ),
    check(
      "hrm_time_clock_punch_exception_event_type_chk",
      sql`${t.eventType} IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'correction')`
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
