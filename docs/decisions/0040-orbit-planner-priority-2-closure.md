# ADR-0040 — Orbit module rename: directory + import surface (Phase 1 executed)

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-19 |
| **Relates to** | [ADR-0006 — Orbit operational execution substrate](0006-orbit-operational-execution-substrate.md) · [ADR-0007a — Signal and ranking](0007a-orbit-signal-and-ranking-doctrine.md) · [ADR-0007b — Lifecycle and verification](0007b-orbit-lifecycle-and-verification-doctrine.md) · [ADR-0007c — ERP attachment](0007c-orbit-erp-attachment-doctrine.md) · [ADR-0007d — Temporal coordination](0007d-orbit-temporal-coordination-doctrine.md) · [ADR-0035 — Three-layer surface and IDE anti-drift (PRIORITY #2)](0035-three-layer-surface-ide-anti-drift.md) · [ADR-0032 — Drizzle migration agent ownership (PRIORITY #1)](0032-drizzle-migration-agent-ownership.md) |
| **Implements in code** | Phase 1 — atomic git mv `lib/features/planner/` → `lib/features/orbit/`, `tests/unit/planner/` → `tests/unit/orbit/`, `.cursor/rules/planner-directory.mdc` → `.cursor/rules/orbit-directory.mdc`; codemod rewrites every `#features/planner` import to `#features/orbit` (54 files / 85 replacements); `scripts/check-agent-contract.mjs` module key + cycle exemption + REQUIRED_FILES updated; AGENTS.md and ARCHITECTURE.md prose reconciled. |
| **Deferred** | Phase 2 — internal TypeScript symbol rename (`Planner*` → `Orbit*`); Phase 3 — audit string namespace cutover (`erp.planner.*` → `erp.orbit.*`). |
| **Never** | DB table rename (`planner_*` is ledger-stable per ADR-0032 PRIORITY #1) · Workflow DevKit entrypoint export rename (`enqueuePlanner*` is wire-stable durable-run identity). |
| **Related rules** | [`.cursor/rules/orbit-directory.mdc`](../../.cursor/rules/orbit-directory.mdc) · [`.cursor/rules/no-dead-code-no-aliases.mdc`](../../.cursor/rules/no-dead-code-no-aliases.mdc) · [`.cursor/rules/drizzle-migration-ledger.mdc`](../../.cursor/rules/drizzle-migration-ledger.mdc) |

---

## 1. Context

ADR-0006 (2026-05-11, amended 2026-05-12) defined Orbit and intentionally split naming:

```txt
Public product name : Orbit
Internal domain name: Planner
```

ADR-0035 (2026-05-19) raised IDE anti-drift to **PRIORITY #2** with the rule:

> One product name across `app/` + `lib/features/<name>/` + `components2/<name>/`.

The original ADR-0040 draft (2026-05-19, superseded by this revision) ratified the split as a "sealed exception" and deferred the rename indefinitely. Operator feedback on the same day rejected that framing: keeping `lib/features/planner/` while every URL, i18n key, ADR title, and ARCHITECTURE doc says "Orbit" produces continuous re-litigation in Cursor sessions, forces every cross-module import to spell `#features/planner`, and undermines PRIORITY #2 every time an agent reads the directory tree.

The revised position: **the rename is right, but the cost of a destructive rename is concentrated in three orthogonal surfaces** — the on-disk module, the runtime audit ledger, and the database. Each surface has a different blast radius and a different observer set. The right answer is not "rename none" or "rename all," it is **rename each surface when its own cost/benefit is sound.**

This ADR records that decision and ships Phase 1.

---

## 2. Decision

### 2.1 Three-phase rename

The `planner → orbit` rename is split into **three independent phases** plus two **never** surfaces. Each phase is sized so it can land in a single PR with a clean L0/L2 gate, and each preserves API stability for surfaces it does not touch.

| Phase | Scope | Status | Wire-format impact |
| --- | --- | --- | --- |
| **Phase 1** | Module directory, import alias, contract script, cursor rule, AGENTS.md, ARCHITECTURE.md, ADR cross-references | **Executed in this PR** (2026-05-19) | None — internal to source tree |
| **Phase 2** | TypeScript symbol rename: `PlannerSignal` → `OrbitSignal`, `PlannerItem` → `OrbitItem`, `PLANNER_AUDIT_ACTIONS` → `ORBIT_AUDIT_ACTIONS`, ~40 type families, file basenames `planner-*.shared.ts` → `orbit-*.shared.ts` | Deferred — needs `ts-morph` codemod | None — internal to source tree (cross-module consumers re-import via `#features/orbit` already) |
| **Phase 3** | Audit string namespace cutover: emit `erp.orbit.*` instead of `erp.planner.*`; `historical-erp-execution-audit-actions.shared.ts` gains `erp.planner.*` read-only renderer entries; durable-run strings `erp.execution.planner_*` → `erp.execution.orbit_*` | Deferred — coordinated with downstream observers | **High** — affects `iam_audit_event` rows and any external log drain / BI dashboard filtering by audit `action` |
| **Never (1)** | DB table rename: `planner_signal`, `planner_item`, … `pgTable("planner_*")` arguments | Permanent | Forbidden by [ADR-0032 PRIORITY #1](0032-drizzle-migration-agent-ownership.md) — destructive ledger rewrite is non-recoverable |
| **Never (2)** | Workflow DevKit entrypoint exports: `enqueuePlannerRecurrenceWorkflowRun`, `enqueuePlannerReminderWorkflowRun` | Permanent | WDK durable-run identity — renaming orphans in-flight runs |

### 2.2 Phase 1 — what shipped in this PR (executed 2026-05-19)

```txt
git mv lib/features/planner               → lib/features/orbit
git mv tests/unit/planner                 → tests/unit/orbit
git mv tests/unit/planner-contract.test.ts → tests/unit/orbit/orbit-audit-registry-contract.test.ts
git mv .cursor/rules/planner-directory.mdc → .cursor/rules/orbit-directory.mdc

codemod (scripts/codemod-planner-import-to-orbit.mjs):
  #features/planner → #features/orbit                  (54 files, 85 replacements)
  - includes #features/planner/server, #features/planner/client,
    #features/planner/constants, #features/planner/planner-orbit-path.shared
  - skips:
      docs/decisions/0001-…0039-*.md           (historical record)
      docs/_draft/**                            (historical drafts)
      drizzle/**                                (PRIORITY #1)
      lib/erp/historical-erp-execution-audit-actions.shared.ts
      lib/db/schema.ts                          (table strings preserved)

scripts/check-agent-contract.mjs:
  REQUIRED_FILES: planner-directory.mdc → orbit-directory.mdc
  module allowlist key:    "planner" → "orbit" (entries unchanged; planner-*.shared.ts
                            files preserved as wire-stable Phase-2 cleanup target)
  isAllowedDeepFeatureImport: importedModule "planner" → "orbit"

.cursor/rules/orbit-directory.mdc:
  globs: lib/features/planner/** → lib/features/orbit/**
  product identity block updated to record Phase-1 doctrine

AGENTS.md:
  Quickstart "Orbit / Planner" row → "Orbit"
  rule reference "planner-directory.mdc" → "orbit-directory.mdc"
  REQUIRED_FILES list updated
  directory tree updated
  module exception note updated

lib/features/orbit/ARCHITECTURE.md:
  Lead paragraph rewritten with explicit wire-format asymmetry table
  ORB-001 acceptance criterion updated to record Phase-1 doctrine
  All cross-references updated to ADR-0040 + .cursor/rules/orbit-directory.mdc
```

After Phase 1, the public Layer-2 door is `lib/features/orbit/` and `#features/orbit`. PRIORITY #2 is satisfied at the module-directory level. Internal symbols (`PlannerSignal`, `PlannerItem`, …), DB tables (`planner_*`), and audit strings (`erp.planner.*`) **remain `planner`-named on purpose** — see §3.

### 2.3 Phase 2 — deferred (TypeScript symbol rename)

Phase 2 renames every `Planner*` TypeScript symbol family to `Orbit*` and renames file basenames `planner-*.shared.ts` → `orbit-*.shared.ts`. It is a code-only, internal-graph change with no wire-format impact (cross-module consumers already import via `#features/orbit` after Phase 1).

Phase 2 should ship as a single PR using a `ts-morph` codemod with these guards:

```txt
- preserve enqueuePlanner* exports (Phase-Never-2)
- preserve every string argument to pgTable("planner_*", …) (Phase-Never-1)
- preserve the audit-string literal values inside planner.contract.ts and
  execution.contract.ts (their *names* rename, but the emitted string values
  stay erp.planner.* / erp.execution.planner_* until Phase 3)
- preserve docs/decisions/0001-…0039-*.md
- update planner.contract.ts → orbit.contract.ts (filename + emitted JSDoc)
```

Phase 2 trigger: any new contributor PR review that explicitly cites the `Planner*` ↔ Orbit mismatch as a comprehension cost.

### 2.4 Phase 3 — deferred (audit-string cutover)

Phase 3 is the only phase with **external observer impact**. It changes the emitted action string values:

```ts
// Before Phase 3 (current):
PLANNER_AUDIT_ACTIONS.signalCreate           // = "erp.planner.signal.create"
EXECUTION_AUDIT_ACTIONS.plannerRecurrenceRunStarted // = "erp.execution.planner_recurrence.run.started"

// After Phase 3:
ORBIT_AUDIT_ACTIONS.signalCreate             // = "erp.orbit.signal.create"
EXECUTION_AUDIT_ACTIONS.orbitRecurrenceRunStarted   // = "erp.execution.orbit_recurrence.run.started"
```

Phase 3 must ship with:

1. **Read-only legacy entries** added to `lib/erp/historical-erp-execution-audit-actions.shared.ts` so the 7W1H sentence builder can render rows from before Phase 3 without runtime emission.
2. A **same-PR audit of every BI dashboard / log drain / Vercel log filter** that pattern-matches `erp.planner.` or `erp.execution.planner_`. Each downstream consumer must be migrated to either consume both prefixes or be updated to the new prefix in the same release window.
3. A **back-compat window** of at minimum one production deploy cycle in which both old historical rows and new emissions render correctly through the unified renderer.

Phase 3 trigger: an explicit decision to start the audit-cutover project (file a successor ADR), with named owners for each downstream consumer.

### 2.5 What this ADR forbids

```txt
1. Reintroducing lib/features/planner/ or #features/planner.
2. Creating a "shim" or "alias" #features/planner that re-exports from
   #features/orbit. Forward-only, per .cursor/rules/no-dead-code-no-aliases.mdc.
3. Renaming a single Planner* symbol or planner_* DB table outside Phase 2 / 3.
4. Renaming planner_* DB tables in any phase — they are Phase-Never-1.
5. Renaming enqueuePlanner* workflow exports in any phase — they are Phase-Never-2.
6. Editing audit-string literal values without filing a Phase-3 ADR first.
7. Editing docs/decisions/0001-…0039-*.md to retroactively use the new module
   path. ADR history is forward-only.
```

### 2.6 What this ADR permits

```txt
1. New Orbit surfaces under lib/features/orbit/ using existing conventions:
   user-visible files use orbit-*.tsx; primitives keep planner-*.shared.ts
   filenames until Phase 2 ships.
2. Continued cross-module integration via #features/orbit / #features/orbit/server
   / #features/orbit/client public doors.
3. Filing a Phase-2 ADR when a ts-morph codemod is ready and a contributor
   has bandwidth for the symbol rename PR.
4. Filing a Phase-3 ADR when downstream audit observers are ready for the
   namespace cutover.
```

### 2.7 Documentation gates

These artifacts must reflect Phase 1 in their canonical form. Drift in any of them is an immediate violation.

| Artifact | Must say |
| --- | --- |
| `AGENTS.md` Orbit row | "Orbit · `lib/features/orbit/` · public name Orbit · see ADR-0006 + ADR-0040 · rule `.cursor/rules/orbit-directory.mdc`" |
| `.cursor/rules/orbit-directory.mdc` "Product identity" | Module door is `lib/features/orbit/` (`#features/orbit`); internal `Planner*` symbols and `planner_*` tables are wire-stable Phase-2/Phase-Never targets. |
| `lib/features/orbit/ARCHITECTURE.md` | Lead paragraph names the module door, the wire-format asymmetry table is present, links ADR-0006 / ADR-0040. |
| `lib/features/orbit/planner.contract.ts` JSDoc header (until Phase 2) | "Canonical Orbit module audit contract (filename retained as `planner.contract.ts` until ADR-0040 Phase 2 ts-morph codemod ships)" |

---

## 3. Why this asymmetry is correct, not drift

A naive reader sees `lib/features/orbit/` containing files named `planner-*.shared.ts` exporting types named `PlannerSignal` writing rows to a table called `planner_signal` emitting an action string `erp.planner.signal.create` and asks: *"is this even one product?"*

It is one product. The asymmetry is intentional and recorded here so that future maintainers and agents can trust the gap rather than re-litigate it.

| Surface | Owner of "should this rename?" | Why |
| --- | --- | --- |
| Module directory | This ADR Phase 1 | Renaming it is cheap (no external observers), high-value (one product name on disk), and trivially reversible if needed. ✓ Done. |
| TypeScript symbols + file basenames | Phase 2 | Renaming is **internal-graph only** but mechanically large (~280 files, ~40 type families). Should ship as a dedicated PR with a `ts-morph` codemod, not bundled with Phase 1. Defers a real cost; does not block Phase 1's value. |
| Audit string namespace | Phase 3 | **External observers exist.** BI dashboards, log drains, Vercel log filters, and 12+ months of historical `iam_audit_event` rows pattern-match `erp.planner.*`. Renaming forces a coordinated cutover with a renderer that bridges both namespaces. Doing this in Phase 1 would have been negligent. |
| DB table names | Never | A destructive rewrite is **forbidden by PRIORITY #1**. The ledger is forward-only. The 16 `planner_*` tables are part of the migration journal. |
| Workflow DevKit exports | Never | WDK identifies durable runs by export name. Renaming orphans in-flight runs. The `Planner` substring inside the export name is a stable identifier, not product copy. |

PRIORITY #2's "one product name across three layers" is satisfied at the **layer-pair-correct unit**:

| Layer pair | Phase-1 state | Phase-2 will tighten |
| --- | --- | --- |
| Layer 1 URL ↔ i18n ↔ ask-docs ↔ Layer-2 module door | All `orbit` ✓ | (no further work) |
| Layer 2 module door ↔ Layer-3 components ↔ TypeScript symbols | Module door + Layer-3 surface files = `orbit`; primitives + symbols still `planner` | Phase 2 will rename primitives + symbols |
| Audit ledger | `erp.planner.*` (all surfaces consistent) | Phase 3 will cut over to `erp.orbit.*` with bridged renderer |
| DB schema | `planner_*` (all surfaces consistent) | **Never** |
| Workflow DevKit run identity | `enqueuePlanner*` (all surfaces consistent) | **Never** |

ADR-0040's job is to make this matrix readable in five minutes for any new contributor or agent so the asymmetry is recognized as design, not entropy.

---

## 4. Conformance

A change conforms to ADR-0040 when:

1. It does not introduce `#features/planner` or `lib/features/planner/`.
2. It does not rename a `Planner*` symbol or `planner_*` DB table outside a documented Phase-2 / Phase-3 PR.
3. It does not rename `planner_*` DB tables at all (Phase-Never-1).
4. It does not rename `enqueuePlanner*` workflow exports at all (Phase-Never-2).
5. It does not edit audit-string literal values without filing a Phase-3 ADR first.
6. It does not retroactively rewrite ADR history (`docs/decisions/0001-…0039-*.md`).
7. New code under `lib/features/orbit/` follows existing conventions: user-visible files use `orbit-*.tsx`; primitives keep `planner-*.shared.ts` filenames until Phase 2 ships.
8. PR review of `lib/features/orbit/` cites this ADR — not improvised reasoning — when accepting or rejecting any rename request.

---

## 5. Consequences

**Positive**

- One canonical Layer-2 door: `lib/features/orbit/` (`#features/orbit`). PRIORITY #2 is satisfied at the directory and import level.
- All cross-module consumers (HRM, Lynx, Knowledge, Nexus, Org-Admin, Execution, Iam-Profile) now spell `#features/orbit` — agent re-litigation cost drops to zero on imports.
- Phase 2 and Phase 3 are sized to ship cleanly when their bandwidth windows open. Each is a small, mechanical PR.
- The Drizzle ledger (PRIORITY #1) stays clean — Phase 1 ships **zero** schema changes.
- ADR-0006 + ADR-0007a–d remain authoritative. ADR-0040 is the implementation record, not a doctrine override.

**Negative**

- The wire-format asymmetry (Layer-2 door says `orbit`; symbols, tables, audit strings still say `planner`) is real and recorded. Until Phase 2 ships, contributors must read ADR-0040 §3 to understand why `lib/features/orbit/` exports `PlannerSignal`. The four documentation gates in §2.7 reduce that read time to under five minutes.
- Phase 2 and Phase 3 are deferred but **not abandoned** — leaving them open requires that ADR-0040 stays load-bearing in agent context until both ship.

**Neutral**

- ADR-0035 PRIORITY #2 is **not weakened**. The "one name across three layers" rule applies in full to legal-docs, iam-profile, bootstrap, nexus, playground, marketplace, etc. Orbit is the only module with a documented multi-phase rename, and only because of the audit-ledger asymmetry — not because of architectural exception.

---

## 6. Phase 1 verification (executed 2026-05-19)

```txt
node scripts/check-agent-contract.mjs
  → REQUIRED_FILES match (.cursor/rules/orbit-directory.mdc present)
  → "orbit" module allowlist matches lib/features/orbit/ entries
  → no #features/planner deep imports remain in cross-module consumers

pnpm typecheck
  → app graph passes (54 files updated; 0 dangling #features/planner imports)

pnpm test:fast -- tests/unit/orbit/
  → all surface tests resolve via #features/orbit and #features/orbit/constants

git status -s | grep planner
  → no remaining planner-named files at module root
  → planner-orbit-path.shared.ts and planner-dashboard-path.shared.ts
    intentionally retained inside lib/features/orbit/ (Phase-2 cleanup target;
    documented in scripts/check-agent-contract.mjs allowlist comment)
```

---

## 7. Phase-2 / Phase-3 trigger conditions

A Phase-2 or Phase-3 ADR should be filed when **either** of the following becomes true:

**Phase 2 trigger** (TypeScript symbol rename):

1. PR review for `lib/features/orbit/` repeatedly cites the `Planner*` ↔ Orbit symbol mismatch as a comprehension cost (≥3 distinct PRs over a 4-week window), or
2. A `ts-morph` codemod is ready and a contributor has bandwidth for the ~280-file PR.

**Phase 3 trigger** (audit-string cutover):

1. A regulatory or external audit explicitly requires the action string to read `erp.orbit.*`, or
2. A BI dashboard rewrite is already scheduled and the audit-namespace flip can ride along, or
3. ≥12 months have elapsed since Phase 1 and historical-row volume is low enough that the bridged renderer can sunset cleanly.

In the absence of those triggers, ADR-0040 §2.1 stands and the wire-format asymmetry is **expected, documented, and not a violation**.

---

## 8. References

- [ADR-0006 — Orbit operational execution substrate](0006-orbit-operational-execution-substrate.md) §3.1 (the original split)
- [ADR-0007a — Signal and ranking](0007a-orbit-signal-and-ranking-doctrine.md)
- [ADR-0007b — Lifecycle and verification](0007b-orbit-lifecycle-and-verification-doctrine.md)
- [ADR-0007c — ERP attachment](0007c-orbit-erp-attachment-doctrine.md)
- [ADR-0007d — Temporal coordination](0007d-orbit-temporal-coordination-doctrine.md)
- [ADR-0035 — Three-layer surface and IDE anti-drift (PRIORITY #2)](0035-three-layer-surface-ide-anti-drift.md)
- [ADR-0032 — Drizzle migration agent ownership (PRIORITY #1)](0032-drizzle-migration-agent-ownership.md) — precedence: Phase-Never-1 derives from this ADR
- [`AGENTS.md` Orbit row](../../AGENTS.md)
- [`.cursor/rules/orbit-directory.mdc`](../../.cursor/rules/orbit-directory.mdc)
- [`lib/features/orbit/ARCHITECTURE.md`](../../lib/features/orbit/ARCHITECTURE.md)
- [`scripts/codemod-planner-import-to-orbit.mjs`](../../scripts/codemod-planner-import-to-orbit.mjs) — Phase-1 codemod (one-shot; safe to delete after Phase-2 lands)
