# ADR-0009 — Turborepo generators as the canonical birth mechanism for new architectural surfaces

| Field                  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**             | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Date**               | 2026-05-12                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Supersedes**         | Hand-authored module scaffolds, copy-paste-from-`contacts` workflows, and ad-hoc ADR numbering by hand.                                                                                                                                                                                                                                                                                                                                                            |
| **Does not supersede** | **AGENTS.md §6** ERP clean directory contract (the rules generators emit *into*). **ADR-0007** Turborepo task graph (`pnpm verify` cache). **ADR-0008** Vitest configuration (`tests/unit/*-org-scope.test.ts` produced by the `capability` generator runs through that pipeline). The IAM audit policy in **AGENTS.md §5** still governs what a generated Server Action may write — generators emit stubs, not finished code.                                      |
| **Implements in code** | [`turbo/generators/config.ts`](../../turbo/generators/config.ts) · [`turbo/generators/lib/*`](../../turbo/generators/lib/) · [`turbo/generators/templates/*`](../../turbo/generators/templates/) · [`scripts/turbo-gen.mjs`](../../scripts/turbo-gen.mjs) (`pnpm gen` entry → `pnpm exec turbo gen`) · `pnpm gen` script in [`package.json`](../../package.json) · `turbo/generators/**` listed under `lint:agent-contract.inputs` in [`turbo.json`](../../turbo.json) · `turbo/generators/config.ts` registered in [`scripts/check-agent-contract.mjs`](../../scripts/check-agent-contract.mjs) `REQUIRED_FILES` / `ROOT_TOOLING_FILES`. |
| **Related docs**       | [Turborepo · Generating code](https://turborepo.dev/docs/guides/generating-code) · [`@turbo/gen`](https://www.npmjs.com/package/@turbo/gen) · [Plop](https://plopjs.com/documentation/) · [`lib/erp/crud-sap.shared.ts`](../../lib/erp/crud-sap.shared.ts) — CRUD-SAP verb enum + audit-action builders                                                                                                                                                              |

---

## 1. Context

Afenda is a single-package Next.js 16 App Router repository with **strict** boundaries enforced by `scripts/check-agent-contract.mjs`, ESLint, and contract tests. The reference shape — `lib/features/<module>/` with `actions/`, `data/`, `components/`, `schemas/`, `constants.ts`, `types.ts`, `index.ts` — is documented in **AGENTS.md §6**. New modules must:

- live under `lib/features/<module>/` with the approved vocabulary,
- expose a single public door (`index.ts`) — no cross-module deep imports,
- scope every read/write with `organizationId` from a trusted server-side source (`requireOrgSession` / `requireOrgSession`'s downstream guards) — never `FormData`,
- write IAM audit events only after a successful commit, using stable `erp.<module>.<object>.<verb>` strings,
- ship with a tenant-isolation Vitest spec under `tests/unit/`,
- mount a locale-prefixed route under `app/[locale]/o/[orgSlug]/dashboard/<module>/page.tsx`.

The cost of getting these wrong is high:

- Deep-import violations break the build via ESLint.
- Forgetting `organizationId` filtering creates IDOR exposure that Postgres RLS does not currently catch.
- Stub Server Actions that revalidate without writing audits silently violate **AGENTS.md §5** ("no DB write → no `iam_audit_event` row").
- Copy-paste from `contacts` carries forward decisions specific to contacts (its `customers` table, its hardcoded UI copy) that don't fit the new module.

This ADR codifies a single mechanism — **Turborepo generators via `@turbo/gen`** — for producing new ERP modules, Server Actions, ADRs, module-level audit contracts, and Workflow DevKit durable jobs. Turborepo generators are the framework-native choice for a single-package mode repo; `@turbo/gen` ships first-class TypeScript typings via `PlopTypes` and runs templates through Plop ([Generating code](https://turborepo.dev/docs/guides/generating-code), [@turbo/gen](https://www.npmjs.com/package/@turbo/gen)).

---

## 2. Decision

### 2.1 Five Phase-1 generators

Each invoked via `pnpm gen <name>` (`package.json` → [`scripts/turbo-gen.mjs`](../../scripts/turbo-gen.mjs) → `pnpm exec turbo gen`). For **`action`**, `pnpm gen action --module <slug>` supplies Turborepo’s **positional** `--args` answers (`slug`, `object`, `verb`, `tierKey`); optional `--object`, `--verb`, `--tier` override defaults (`record`, `create`, `B`). Raw `turbo gen … --module` is invalid — Turbo does not accept that flag.

| Generator        | What it emits                                                                                                                                                                                                                                                                       | Cancels which manual ritual                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `capability`     | Full ERP module slice under `lib/features/<slug>/` (`actions/`, `data/`, `components/`, `schemas/`, `constants.ts`, `types.ts`, `index.ts`, `<slug>.contract.ts`) + locale-prefixed route `app/[locale]/o/[orgSlug]/dashboard/<slug>/page.tsx` + tenant-isolation Vitest spec.       | Copy-pasting from `contacts`; manually constructing the locale-prefixed route.    |
| `action`         | Tier-correct Server Action in an existing module (`lib/features/<slug>/actions/<verb>-<slug>.ts`). Tier B uses `requireOrgSession`; Tier A adds `canActInOrganization(..., "admin")`; Tier S adds `canActInOrganization(..., "owner")`.                                              | Re-deriving the tier matrix per action; forgetting to call `requireOrgSession`.   |
| `adr`            | Auto-numbered `docs/decisions/NNNN-<kebab-title>.md` from a small template with the section structure used since ADR-0001.                                                                                                                                                          | Hand-incrementing ADR numbers; forgetting required sections.                      |
| `audit-contract` | Module-level audit contract `lib/features/<slug>/<slug>.contract.ts` whose action strings are built via `buildCrudSapAuditAction` so the canonical `erp.<module>.<object>.<verb>` shape is mechanically enforced.                                                                   | Hand-authoring audit strings; forgetting to follow the CRUD-SAP grammar.          |
| `workflow-job`   | Workflow DevKit durable run pair under `lib/features/<slug>/data/`: `<jobName>.workflow.ts` (`"use workflow"` orchestrator + `"use step"` lifecycle) and `<jobName>.workflow.contract.ts` (started / completed / failed audits built via `buildErpAuditAction`).                     | Re-deriving the `import-job-run.workflow.ts` pattern; mis-naming lifecycle audits. |

### 2.2 Generators do not duplicate canonical sources

- **CRUD-SAP verbs** come from [`lib/erp/crud-sap.shared.ts`](../../lib/erp/crud-sap.shared.ts) — the generator imports `CRUD_SAP_VERBS` and `buildCrudSapAuditAction` directly, so the prompt list and the emitted audit strings cannot drift from the source enum.
- **ADR numbering** is resolved by reading the existing `docs/decisions/` directory at run time (`turbo/generators/lib/adr-next-number.ts`) — no separate counter file to keep in sync.
- **Tenant-isolation test shape** matches `tests/unit/contacts-org-scope.test.ts` (the reference spec) and uses the same `vi.hoisted` / `drizzleEqMocks` pattern.

### 2.3 Post-generation lint is part of the generator

Every generator ends with a custom Plop action (`turbo/generators/lib/post-gen-lint.ts`) that runs:

1. `pnpm lint:agent-contract` — enforces directory shape and top-level allowlist.
2. `pnpm exec eslint --fix --max-warnings 0 --report-unused-disable-directives <touched>` — auto-fixes formatting and import sorting against the repo ESLint config, scoped to the generated files for speed.

A failed lint surfaces in Plop's "Action complete" summary as a red status line. The contract is therefore: **a successful `pnpm gen` invocation leaves the repo passing `pnpm lint`**.

The `adr` generator skips `lint:agent-contract` (no source files changed) but still runs ESLint over the generated Markdown's adjacent files when applicable.

### 2.4 Generators emit stubs, not finished code

Generated Server Actions deliberately **do not** include the DB write or the audit-write block — only the validation + revalidate + return shape. The JSDoc on the generated action shows the canonical wiring pattern (insert with `organizationId` from session → `after(() => writeIamAuditEventFromNextHeaders(...))` → return). This is intentional:

- **AGENTS.md §5** explicitly forbids audit writes on actions that don't mutate ("no DB write → no `iam_audit_event` row"). A generator that emitted both would either bloat the audit log with stub events or silently violate the rule.
- The developer **must** look at the JSDoc example, decide on a Drizzle table, and wire the mutation. Turning off the autopilot at this exact step is the difference between scaffolds that age well and scaffolds that get cargo-culted.

### 2.5 Turborepo cache hygiene

`turbo/generators/**` is listed under `lint:agent-contract.inputs` in `turbo.json`. Editing any generator file therefore invalidates that task's cache on the next `pnpm lint` / `pnpm verify`, ensuring the contract script runs against generator changes. The generators themselves are *not* a Turbo task — they are a developer-invoked CLI; only their outputs are subject to the regular pipeline.

`turbo/generators/config.ts` is required by `scripts/check-agent-contract.mjs` (`REQUIRED_FILES` + `ROOT_TOOLING_FILES`), and the new top-level directory `turbo/` is allowlisted in `TOP_LEVEL_DIR_ALLOWLIST`. Removing the generators is therefore an explicit, contract-failing event — not a silent regression.

---

## 3. Consequences

### Positive

- **Organizational memory codified.** Future contributors do not need to internalize the entire boundary contract before shipping their first module — the generator does that on their behalf.
- **No drift between generator output and reference code.** Generators import the CRUD-SAP verb enum from the same file Server Actions do, so adding a new verb in one place updates both.
- **Day-one passing lint.** The post-gen action runs `pnpm lint:agent-contract` and `pnpm exec eslint --fix` over the touched files, so the developer never has to manually clean up generator output.
- **ADR / audit-contract / workflow scaffolds match existing examples.** New ADRs use the same section shape as ADR-0001 through ADR-0008. New `<module>.contract.ts` files match `lynx.contract.ts` and `execution.contract.ts`. New workflow files match `import-job-run.workflow.ts`.

### Negative / constraints

- **Lock-in to Plop conventions.** Generator templates are Handlebars (`*.hbs`), and helpers / prompt shapes follow Plop's API. Moving away from Plop later would require translating templates.
- **TypeScript transpilation cost on first run.** `@turbo/gen` transpiles `turbo/generators/config.ts` once per run; the cost is small but non-zero. Mitigated by `pnpm gen` running interactively (not on the critical CI path).
- **Generators are not a test substitute.** A generated module still needs the developer to wire a real Drizzle table, write the audit block, and add E2E coverage if the surface is user-visible. The generator only guarantees the *shape* matches the contract — never that the *behavior* is correct.
- **Cross-module modification is intentionally avoided.** Generators do not mutate `lib/dashboard-module-paths.ts` or `messages/en.json` automatically. Each module owns its own `ORG_DASHBOARD_<SLUG>` constant locally; i18n keys are extracted by hand when a surface stabilizes. This keeps generator output deterministic and side-effect-free outside its declared paths.

---

## 4. Compliance

- **AGENTS.md §3 Toolchain** documents the generators as part of the toolchain, with the public command `pnpm gen <name>` and the **`scripts/turbo-gen.mjs`** wrapper for **`action --module`** → positional **`--args`**.
- **AGENTS.md §4.2 Required files** lists `turbo/generators/config.ts` — removing it fails `scripts/check-agent-contract.mjs`.
- **AGENTS.md §6** marks `pnpm gen capability` as the canonical birth mechanism for new ERP modules and `pnpm gen action` as the canonical mechanism for new Server Actions in existing modules. Opt-out (hand-authored) is permitted only when explicitly documented in the PR description.
- **`turbo.json`** lists `turbo/generators/**` under `lint:agent-contract.inputs` so cache invalidation is automatic when generators change.
- Editing or extending the generators must keep `turbo/generators/config.ts` and the template tree in sync with the canonical reference modules (`contacts`, `lynx`, `execution`, `org-admin`); if a reference module changes shape, update the corresponding template in the same PR.

---

## 5. Revision history

| Date       | Change                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-13 | Document `scripts/turbo-gen.mjs` — `pnpm gen action --module <slug>` maps to positional `--args`; align with **AGENTS.md §3**. |
| 2026-05-12 | Initial acceptance — codifies five Phase-1 generators (`capability`, `action`, `adr`, `audit-contract`, `workflow-job`), post-gen lint, and the contract-binding rules |
